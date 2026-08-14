import type { CollectionReport } from "@potato-boost/collector-hub";
import type { PhaseEvent } from "@potato-boost/scenario-engine";
import {
  parseRunArtifact,
  type RunArtifact,
  SCHEMA_VERSION,
} from "@potato-boost/schemas";

export type ArtifactStatus =
  | "completed"
  | "failed"
  | "cancelled"
  | "inconclusive";

export type BuildArtifactInput = {
  runId: string;
  startedAt: string;
  status: ArtifactStatus;
  scenario: {
    scenarioId: string;
    scenarioVersion: string;
    events: readonly PhaseEvent[];
    baselineEligible: boolean;
    error?: string | undefined;
  };
  collection: CollectionReport;
  metrics: readonly { name: string; value: number; unit: string }[];
};

export function buildRunArtifact(input: BuildArtifactInput): RunArtifact {
  const capabilities = input.collection.capabilities
    .filter((capability) => capability.status === "ok")
    .map((capability) => (capability.id === "cdp" ? "web.cdp" : capability.id));
  return parseRunArtifact({
    schemaVersion: SCHEMA_VERSION,
    producer: { name: "potato-boost", version: "0.0.0" },
    run: {
      runId: input.runId,
      status: input.status,
      startedAt: input.startedAt,
      git: { commit: null, dirty: true },
    },
    lockedInputs: {
      target: { id: "web-threejs", version: "1.0.0" },
      scenario: {
        id: input.scenario.scenarioId,
        version: input.scenario.scenarioVersion,
      },
      profile: { id: "budget-local", version: "1.0.0" },
      adapter: { id: "adapter-web", version: "1.0.0" },
      rulePacks: [{ id: "rules-web", version: "1.0.0" }],
    },
    fingerprints: {
      host: { arch: "local" },
      os: { name: process.platform },
      runtime: { node: process.version },
      adapter: { id: "adapter-web" },
      build: { mode: "smoke" },
      git: { commit: null, dirty: true },
    },
    rawManifest: { files: [] },
    metrics: [...input.metrics],
    evidence: [],
    findings: [],
    integrity: {
      algorithm: "sha256",
      rawManifestHash: "sha256:none",
      analysisVersion: "0.0.0",
    },
    capabilities,
    collectorChecks: input.collection.capabilities.map((capability) => ({
      id: capability.id,
      status: capability.status,
      detail: capability.detail,
    })),
    phaseEvents: input.scenario.events,
    baselineEligible:
      input.scenario.baselineEligible && input.status === "completed",
  });
}
