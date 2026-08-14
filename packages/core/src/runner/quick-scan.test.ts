import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createArtifactStore } from "@potato-boost/artifact-store";
import type { ScenarioDriver } from "@potato-boost/scenario-engine";
import { parseRunArtifact } from "@potato-boost/schemas";
import { describe, expect, it } from "vitest";
import type { ProcessLauncher } from "./launch.js";
import { runQuickScan } from "./quick-scan.js";

describe("runQuickScan", () => {
  it("walks setup, warmup, three measures, cleanup and writes a valid artifact", async () => {
    const root = await mkdtemp(join(tmpdir(), "potato-scan-"));
    const store = createArtifactStore(root);
    const result = await runQuickScan(root, {
      store,
      runId: "run-happy",
      launcher: {
        async start() {
          return { pid: 7, async kill() {} };
        },
      },
      startArgv: ["npx", "vite"],
    });
    expect(result.status).toBe("completed");
    expect(result.budgetFail).toBe(false);
    const measures = result.phases.filter((event) => event.phase === "measure");
    expect(measures).toHaveLength(3);
    expect(result.phases.map((event) => event.phase)).toEqual([
      "setup",
      "warmup",
      "measure",
      "measure",
      "measure",
      "cleanup",
    ]);
    expect(result.artifactPath).toBe("runs/run-happy.json");
    const stored = await store.readCompleted("run-happy");
    const artifact = parseRunArtifact(
      JSON.parse(new TextDecoder().decode(stored.bytes)),
    );
    expect(artifact.run.status).toBe("completed");
    expect(artifact.lockedInputs.scenario.id).toBe("quick-scan");
  });

  it("marks warmup crashes as failed, not a budget fail", async () => {
    const root = await mkdtemp(join(tmpdir(), "potato-scan-fail-"));
    const store = createArtifactStore(root);
    const driver: ScenarioDriver = {
      now: () => "2026-08-14T00:00:00.000Z",
      execute: async (step) => {
        if (step.action === "warmup") {
          throw new Error("warmup crashed");
        }
      },
    };
    const result = await runQuickScan(root, {
      store,
      driver,
      runId: "run-warmup",
    });
    expect(result.status).toBe("failed");
    expect(result.budgetFail).toBe(false);
    expect(result.error).toMatch(/warmup crashed/);
    expect(result.baselineEligible).toBe(false);
  });

  it("cancels and kills launched children on abort", async () => {
    const root = await mkdtemp(join(tmpdir(), "potato-scan-abort-"));
    const store = createArtifactStore(root);
    let killed = false;
    const launcher: ProcessLauncher = {
      async start() {
        return {
          pid: 9,
          async kill() {
            killed = true;
          },
        };
      },
    };
    const controller = new AbortController();
    controller.abort();
    const result = await runQuickScan(
      root,
      {
        store,
        launcher,
        startArgv: ["npx", "vite"],
        runId: "run-abort",
      },
      controller.signal,
    );
    expect(result.status).toBe("cancelled");
    expect(result.baselineEligible).toBe(false);
    expect(killed).toBe(true);
  });
});
