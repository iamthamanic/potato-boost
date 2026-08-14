import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { type RunArtifact, runArtifactSchema } from "@potato-boost/schemas";

export const GOLDEN_RUN_ID = "01J9GOLDENV100000000000000";

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

export async function loadGoldenArtifact(): Promise<RunArtifact> {
  if (cached !== undefined) {
    return cached;
  }
  const raw = JSON.parse(await readFile(GOLDEN_PATH, "utf8")) as unknown;
  cached = runArtifactSchema.parse(raw);
  return cached;
}
