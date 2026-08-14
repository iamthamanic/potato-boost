import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { type RunArtifact, runArtifactSchema } from "@potato-boost/schemas";

export const GOLDEN_RUN_ID = "01J9GOLDENV100000000000000";
export const COMPARE_CANDIDATE_ID = "01J9COMPARECAND000000000000";
export const COMPARE_DEBUG_ID = "01J9COMPAREDBG000000000000";

const GOLDEN_PATH = fileURLToPath(
  new URL("../../schemas/fixtures/golden-v1.0.0.json", import.meta.url),
);

export type GoldenSample = {
  sampleId: string;
  source: string;
  metric: string;
  timestampNs: number;
  value: number;
  unit: string;
};

export function goldenSamples(): GoldenSample[] {
  const list: GoldenSample[] = [];
  for (let index = 0; index < 40; index += 1) {
    list.push({
      sampleId: `s${String(index)}`,
      source: "synthetic",
      metric: "frame_time",
      timestampNs: index,
      value: 40,
      unit: "ms",
    });
  }
  return list;
}

let cached: RunArtifact | undefined;
let cachedCandidate: RunArtifact | undefined;
let cachedDebug: RunArtifact | undefined;

export async function loadGoldenArtifact(): Promise<RunArtifact> {
  if (cached !== undefined) {
    return cached;
  }
  const raw = JSON.parse(await readFile(GOLDEN_PATH, "utf8")) as unknown;
  cached = runArtifactSchema.parse(raw);
  return cached;
}

export async function loadCompareCandidate(): Promise<RunArtifact> {
  if (cachedCandidate !== undefined) {
    return cachedCandidate;
  }
  const golden = await loadGoldenArtifact();
  const copy = structuredClone(golden);
  copy.run.runId = COMPARE_CANDIDATE_ID;
  const metric = copy.metrics.find((row) => row.name === "frame_time_p95");
  if (metric !== undefined) {
    metric.value = 50;
  }
  cachedCandidate = copy;
  return copy;
}

export async function loadCompareDebug(): Promise<RunArtifact> {
  if (cachedDebug !== undefined) {
    return cachedDebug;
  }
  const golden = await loadGoldenArtifact();
  const copy = structuredClone(golden);
  copy.run.runId = COMPARE_DEBUG_ID;
  copy.fingerprints.build = { ...copy.fingerprints.build, mode: "debug" };
  const metric = copy.metrics.find((row) => row.name === "frame_time_p95");
  if (metric !== undefined) {
    metric.value = 80;
  }
  cachedDebug = copy;
  return copy;
}

export async function loadArtifactByRunId(
  runId: string,
): Promise<RunArtifact | undefined> {
  if (runId === GOLDEN_RUN_ID) {
    return loadGoldenArtifact();
  }
  if (runId === COMPARE_CANDIDATE_ID) {
    return loadCompareCandidate();
  }
  if (runId === COMPARE_DEBUG_ID) {
    return loadCompareDebug();
  }
  return undefined;
}
