import { analyzeSamples } from "@potato-boost/analysis";
import {
  type ArtifactStore,
  createArtifactStore,
} from "@potato-boost/artifact-store";
import type { CollectionReport, Collector } from "@potato-boost/collector-hub";
import { collectRun } from "@potato-boost/collector-hub";
import { evaluate } from "@potato-boost/rule-engine";
import {
  createFakeDriver,
  type PhaseEvent,
  runScenario,
  type ScenarioDriver,
} from "@potato-boost/scenario-engine";
import type { Sample } from "@potato-boost/schemas";
import { type ArtifactStatus, buildRunArtifact } from "./artifact.js";
import {
  createNoopLauncher,
  type LaunchedProcess,
  type ProcessLauncher,
} from "./launch.js";
import { QUICK_SCAN } from "./scenario.js";

export type QuickScanDeps = {
  driver?: ScenarioDriver;
  collectors?: readonly Collector[];
  collect?: () => Promise<CollectionReport>;
  launcher?: ProcessLauncher;
  store?: ArtifactStore;
  now?: () => string;
  runId?: string;
  startArgv?: readonly string[];
};

export type QuickScanResult = {
  status: ArtifactStatus;
  runId: string;
  phases: readonly PhaseEvent[];
  artifactPath: string | null;
  budgetFail: boolean;
  baselineEligible: boolean;
  error?: string;
};

function rfcNow(): string {
  return new Date().toISOString();
}

function smokeCollection(samples: readonly Sample[]): CollectionReport {
  return {
    samples,
    capabilities: [
      {
        id: "os",
        status: "ok",
        required: true,
        detail: "smoke",
      },
      {
        id: "cdp",
        status: "ok",
        required: true,
        detail: "smoke driver",
      },
    ],
    processTree: [],
    budgetEligible: true,
    outcome: "ready",
  };
}

function createSmokeDriver(): ScenarioDriver {
  let stamp = 1_000_000;
  const inner = createFakeDriver();
  const samples: Sample[] = [];
  const driver: ScenarioDriver & { samples: Sample[] } = {
    samples,
    now: inner.now,
    execute: async (step) => {
      await inner.execute(step);
      if (step.action === "measure") {
        samples.push({
          sampleId: `ft-${stamp}`,
          source: "cdp",
          metric: "frame_time",
          timestampNs: stamp,
          value: 16,
          unit: "ms",
        });
        stamp += 1;
      }
    },
  };
  return driver;
}

export async function runQuickScan(
  projectRoot: string,
  deps: QuickScanDeps = {},
  signal?: AbortSignal,
): Promise<QuickScanResult> {
  const runId = deps.runId ?? `run-${Date.now()}`;
  const startedAt = (deps.now ?? rfcNow)();
  const store = deps.store ?? createArtifactStore(projectRoot);
  const launcher = deps.launcher ?? createNoopLauncher();
  const driver = deps.driver ?? createSmokeDriver();
  const startArgv = deps.startArgv ?? [];

  let launched: LaunchedProcess | undefined;
  if (startArgv.length > 0) {
    launched = await launcher.start(startArgv, projectRoot);
  }

  const finish = async (
    status: ArtifactStatus,
    scenario: {
      scenarioId: string;
      scenarioVersion: string;
      events: readonly PhaseEvent[];
      baselineEligible: boolean;
      error?: string | undefined;
    },
    collection: CollectionReport,
    budgetFail: boolean,
  ): Promise<QuickScanResult> => {
    if (launched !== undefined) {
      await launched.kill();
    }
    let metrics: { name: string; value: number; unit: string }[] = [];
    if (collection.samples.some((sample) => sample.metric === "frame_time")) {
      const analysis = analyzeSamples(collection.samples, {
        metric: "frame_time",
        hitchThreshold: 33.33,
        minSampleCount: 1,
      });
      metrics = [
        { name: "frame_time_p95", value: analysis.p95, unit: "ms" },
        { name: "frame_time_p99", value: analysis.p99, unit: "ms" },
      ];
    }
    const artifact = buildRunArtifact({
      runId,
      startedAt,
      status,
      scenario,
      collection,
      metrics,
    });
    const packed = new TextEncoder().encode(`${JSON.stringify(artifact)}\n`);
    const record = await store.writeCompleted(runId, packed);
    return {
      status,
      runId,
      phases: scenario.events,
      artifactPath: record.path,
      budgetFail,
      baselineEligible: status === "completed" && scenario.baselineEligible,
      ...(scenario.error !== undefined ? { error: scenario.error } : {}),
    };
  };

  if (signal?.aborted === true) {
    return finish(
      "cancelled",
      {
        scenarioId: QUICK_SCAN.id,
        scenarioVersion: QUICK_SCAN.version,
        events: [],
        baselineEligible: false,
        error: "aborted",
      },
      smokeCollection([]),
      false,
    );
  }

  const scenario = await runScenario(driver, QUICK_SCAN);
  const measureCount = scenario.events.filter(
    (event) => event.phase === "measure",
  ).length;

  let collection: CollectionReport;
  if (deps.collect !== undefined) {
    collection = await deps.collect();
  } else if (deps.collectors !== undefined) {
    collection = await collectRun(deps.collectors);
  } else {
    const smokeSamples =
      "samples" in driver
        ? (driver as ScenarioDriver & { samples: Sample[] }).samples
        : [];
    collection = smokeCollection(smokeSamples);
  }

  if (scenario.error !== undefined) {
    return finish(
      "failed",
      { ...scenario, baselineEligible: false },
      collection,
      false,
    );
  }

  if (measureCount < 3) {
    return finish(
      "failed",
      {
        ...scenario,
        baselineEligible: false,
        error: "quick scan did not complete three measure repetitions",
      },
      collection,
      false,
    );
  }

  if (!collection.budgetEligible) {
    return finish("inconclusive", scenario, collection, false);
  }

  const capabilities = collection.capabilities
    .filter((capability) => capability.status === "ok")
    .map((capability) => (capability.id === "cdp" ? "web.cdp" : capability.id));
  let metrics: { name: string; value: number; unit: string }[] = [];
  if (collection.samples.some((sample) => sample.metric === "frame_time")) {
    const analysis = analyzeSamples(collection.samples, {
      metric: "frame_time",
      hitchThreshold: 33.33,
      minSampleCount: 1,
    });
    metrics = [
      { name: "frame_time_p95", value: analysis.p95, unit: "ms" },
      { name: "frame_time_p99", value: analysis.p99, unit: "ms" },
    ];
  }
  const rules = evaluate(
    {
      id: "rules-web",
      version: "1.0.0",
      rules: [
        {
          id: "web.frame_time.p95",
          version: "1.0.0",
          severity: "warning",
          preconditions: {
            metric: "frame_time_p95",
            capability: "web.cdp",
            requireEvidence: true,
          },
          budget: { metric: "frame_time_p95", op: "gt", value: 33.33 },
        },
      ],
    },
    { metrics, evidenceIds: [], capabilities },
  );
  const budgetFail = rules.evaluations.some((item) => item.verdict === "fail");
  return finish("completed", scenario, collection, budgetFail);
}
