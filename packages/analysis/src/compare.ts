import { parseSchemaMajor, type RunArtifact } from "@potato-boost/schemas";

export type Comparability = "comparable" | "non-comparable";

export type MetricVerdict =
  | "improved"
  | "regressed"
  | "neutral"
  | "incomparable";

export type CompareReason = {
  code: string;
  detail: string;
};

export type MetricDelta = {
  name: string;
  unit: string;
  baseline: number;
  candidate: number;
  delta: number;
  deltaPct: number;
  noiseBudgetPct: number;
  withinNoiseBudget: boolean;
  verdict: MetricVerdict;
};

export type CompareOverall =
  | "improved"
  | "regressed"
  | "neutral"
  | "non-comparable";

export type CompareResult = {
  comparability: Comparability;
  reasons: CompareReason[];
  gitDirtyVisible: boolean;
  metrics: MetricDelta[];
  overall: CompareOverall;
};

export type BaselineGate =
  | { ok: true }
  | { ok: false; code: string; message: string };

export type BaselineRef = {
  targetId: string;
  scenarioId: string;
  profileId: string;
  runId: string;
  setAt: string;
};

export type BaselinesFile = {
  current: BaselineRef[];
  history: BaselineRef[];
};

const DEFAULT_NOISE_BUDGET_PCT = 5;

function recordString(value: unknown, key: string): string {
  if (typeof value !== "object" || value === null) {
    return "";
  }
  const record = value as Record<string, unknown>;
  const field = record[key];
  return typeof field === "string" ? field : "";
}

function versionMajor(version: string): string {
  try {
    return String(parseSchemaMajor(version));
  } catch {
    return version;
  }
}

function lockKey(artifact: RunArtifact): Record<string, string> {
  return {
    scenario: `${artifact.lockedInputs.scenario.id}@${artifact.lockedInputs.scenario.version}`,
    profile: `${artifact.lockedInputs.profile.id}@${artifact.lockedInputs.profile.version}`,
    adapterMajor: `${artifact.lockedInputs.adapter.id}@${versionMajor(artifact.lockedInputs.adapter.version)}`,
    runtime: recordString(artifact.fingerprints.runtime, "node"),
    hardware: `${recordString(artifact.fingerprints.host, "arch")}|${recordString(artifact.fingerprints.os, "name")}`,
    buildMode: recordString(artifact.fingerprints.build, "mode"),
  };
}

function lowerIsBetter(name: string): boolean {
  return !/fps|throughput|score/i.test(name);
}

export function compareRuns(
  baseline: RunArtifact,
  candidate: RunArtifact,
  options: { noiseBudgetPct?: number } = {},
): CompareResult {
  const noiseBudgetPct = options.noiseBudgetPct ?? DEFAULT_NOISE_BUDGET_PCT;
  const left = lockKey(baseline);
  const right = lockKey(candidate);
  const reasons: CompareReason[] = [];
  for (const [code, value] of Object.entries(left)) {
    if (value !== right[code]) {
      reasons.push({
        code: `LOCK_${code.toUpperCase()}`,
        detail: `${code} ${value} vs ${right[code] ?? ""}`,
      });
    }
  }
  const gitDirtyVisible =
    baseline.fingerprints.git.dirty || candidate.fingerprints.git.dirty;
  if (gitDirtyVisible) {
    reasons.push({
      code: "GIT_DIRTY_VISIBLE",
      detail:
        "git dirty is recorded on a fingerprint and does not block compare",
    });
  }
  const comparable = reasons.every(
    (reason) => reason.code === "GIT_DIRTY_VISIBLE",
  );
  const comparability: Comparability = comparable
    ? "comparable"
    : "non-comparable";

  const candidateByName = new Map(
    candidate.metrics.map((metric) => [metric.name, metric]),
  );
  const metrics: MetricDelta[] = [];
  for (const metric of baseline.metrics) {
    const other = candidateByName.get(metric.name);
    if (other === undefined) {
      continue;
    }
    const delta = other.value - metric.value;
    const deltaPct = metric.value === 0 ? 0 : (delta / metric.value) * 100;
    const absPct = Math.abs(deltaPct);
    const withinNoiseBudget = absPct <= noiseBudgetPct;
    let verdict: MetricVerdict = "incomparable";
    if (comparability === "comparable") {
      if (withinNoiseBudget) {
        verdict = "neutral";
      } else if (lowerIsBetter(metric.name)) {
        verdict = delta < 0 ? "improved" : "regressed";
      } else {
        verdict = delta > 0 ? "improved" : "regressed";
      }
    }
    metrics.push({
      name: metric.name,
      unit: metric.unit,
      baseline: metric.value,
      candidate: other.value,
      delta,
      deltaPct,
      noiseBudgetPct,
      withinNoiseBudget,
      verdict,
    });
  }

  let overall: CompareOverall = "non-comparable";
  if (comparability === "comparable") {
    if (metrics.some((row) => row.verdict === "regressed")) {
      overall = "regressed";
    } else if (metrics.some((row) => row.verdict === "improved")) {
      overall = "improved";
    } else {
      overall = "neutral";
    }
  }

  return {
    comparability,
    reasons,
    gitDirtyVisible,
    metrics,
    overall,
  };
}

export function baselineGate(artifact: RunArtifact): BaselineGate {
  if (artifact.run.status !== "completed") {
    return {
      ok: false,
      code: "NOT_COMPLETED",
      message: `run status ${artifact.run.status} cannot become a baseline`,
    };
  }
  return { ok: true };
}

export function emptyBaselines(): BaselinesFile {
  return { current: [], history: [] };
}

export function applyBaseline(
  file: BaselinesFile,
  next: BaselineRef,
): BaselinesFile {
  const current = file.current.filter(
    (entry) =>
      !(
        entry.targetId === next.targetId &&
        entry.scenarioId === next.scenarioId &&
        entry.profileId === next.profileId
      ),
  );
  const replaced = file.current.filter(
    (entry) =>
      entry.targetId === next.targetId &&
      entry.scenarioId === next.scenarioId &&
      entry.profileId === next.profileId,
  );
  return {
    current: [...current, next],
    history: [...file.history, ...replaced],
  };
}

export function compareExitCode(result: CompareResult): number {
  if (result.comparability === "non-comparable") {
    return 4;
  }
  if (result.overall === "regressed") {
    return 1;
  }
  return 0;
}
