import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { type RunArtifact, runArtifactSchema } from "@potato-boost/schemas";
import { describe, expect, it } from "vitest";
import {
  applyBaseline,
  baselineGate,
  compareExitCode,
  compareRuns,
  emptyBaselines,
} from "./compare.js";

const GOLDEN_PATH = fileURLToPath(
  new URL("../../schemas/fixtures/golden-v1.0.0.json", import.meta.url),
);

async function loadGolden(): Promise<RunArtifact> {
  return runArtifactSchema.parse(
    JSON.parse(await readFile(GOLDEN_PATH, "utf8")) as unknown,
  );
}

function cloneWith(
  artifact: RunArtifact,
  mutate: (copy: RunArtifact) => void,
): RunArtifact {
  const copy = structuredClone(artifact);
  mutate(copy);
  return copy;
}

describe("compareRuns (T-008)", () => {
  it("compares compatible fingerprints with absolute, delta, and noise budget", async () => {
    const baseline = await loadGolden();
    const candidate = cloneWith(baseline, (copy) => {
      copy.run.runId = "01J9COMPARECAND000000000000";
      const metric = copy.metrics.find((row) => row.name === "frame_time_p95");
      if (metric !== undefined) {
        metric.value = 50;
      }
    });
    const result = compareRuns(baseline, candidate);
    expect(result.comparability).toBe("comparable");
    expect(result.gitDirtyVisible).toBe(true);
    const p95 = result.metrics.find((row) => row.name === "frame_time_p95");
    expect(p95?.baseline).toBe(40);
    expect(p95?.candidate).toBe(50);
    expect(p95?.delta).toBe(10);
    expect(p95?.noiseBudgetPct).toBe(5);
    expect(p95?.withinNoiseBudget).toBe(false);
    expect(p95?.verdict).toBe("regressed");
    expect(result.overall).toBe("regressed");
    expect(compareExitCode(result)).toBe(1);
  });

  it("marks debug vs release as non-comparable, not a budget-fail", async () => {
    const baseline = await loadGolden();
    const candidate = cloneWith(baseline, (copy) => {
      copy.run.runId = "01J9COMPAREDBG000000000000";
      copy.fingerprints.build = { ...copy.fingerprints.build, mode: "debug" };
      const metric = copy.metrics.find((row) => row.name === "frame_time_p95");
      if (metric !== undefined) {
        metric.value = 80;
      }
    });
    const result = compareRuns(baseline, candidate);
    expect(result.comparability).toBe("non-comparable");
    expect(result.overall).toBe("non-comparable");
    expect(result.reasons.some((row) => row.code === "LOCK_BUILDMODE")).toBe(
      true,
    );
    expect(result.metrics[0]?.verdict).toBe("incomparable");
    expect(compareExitCode(result)).toBe(4);
    expect(compareExitCode(result)).not.toBe(1);
  });

  it("treats a delta inside the noise budget as neutral", async () => {
    const baseline = await loadGolden();
    const candidate = cloneWith(baseline, (copy) => {
      const metric = copy.metrics.find((row) => row.name === "frame_time_p95");
      if (metric !== undefined) {
        metric.value = 41;
      }
    });
    const result = compareRuns(baseline, candidate);
    expect(result.comparability).toBe("comparable");
    expect(result.metrics[0]?.verdict).toBe("neutral");
    expect(result.overall).toBe("neutral");
    expect(compareExitCode(result)).toBe(0);
  });

  it("blocks baseline without completed status and historises the previous id", async () => {
    const baseline = await loadGolden();
    const cancelled = cloneWith(baseline, (copy) => {
      copy.run.status = "cancelled";
    });
    expect(baselineGate(cancelled).ok).toBe(false);
    expect(baselineGate(baseline).ok).toBe(true);
    const first = applyBaseline(emptyBaselines(), {
      targetId: "web-threejs",
      scenarioId: "quick-scan",
      profileId: "budget-local",
      runId: "old-baseline",
      setAt: "2026-08-13T12:00:00Z",
    });
    const next = applyBaseline(first, {
      targetId: "web-threejs",
      scenarioId: "quick-scan",
      profileId: "budget-local",
      runId: baseline.run.runId,
      setAt: "2026-08-14T12:00:00Z",
    });
    expect(next.current[0]?.runId).toBe(baseline.run.runId);
    expect(next.history.map((row) => row.runId)).toContain("old-baseline");
  });
});
