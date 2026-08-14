import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createArtifactStore } from "@potato-boost/artifact-store";
import type { ScenarioDriver } from "@potato-boost/scenario-engine";
import { parseRunArtifact } from "@potato-boost/schemas";
import { describe, expect, it } from "vitest";
import {
  createArgvLauncher,
  type ProcessLauncher,
  processAlive,
} from "./launch.js";
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
    const stored = await store.readCompleted("run-warmup");
    const artifact = parseRunArtifact(
      JSON.parse(new TextDecoder().decode(stored.bytes)),
    );
    expect(artifact.run.status).toBe("failed");
    expect(artifact.baselineEligible).toBe(false);
    expect("error" in artifact.run ? artifact.run.error : undefined).toMatch(
      /warmup crashed/,
    );
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

  it("abort during measure kills the process group within 10s", async () => {
    const root = await mkdtemp(join(tmpdir(), "potato-scan-group-"));
    await writeFile(
      join(root, "hang.mjs"),
      `import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
const child = spawn(process.execPath, ["-e", "setInterval(() => {}, 1000)"], {
  stdio: "ignore",
});
writeFileSync("grandchild.pid", \`\${process.pid}\\n\${child.pid}\\n\`);
setInterval(() => {}, 1000);
`,
    );
    const inner = createArgvLauncher();
    let pid = 0;
    const launcher: ProcessLauncher = {
      async start(argv, cwd) {
        const launched = await inner.start(argv, cwd);
        pid = launched.pid;
        return launched;
      },
    };
    const driver: ScenarioDriver = {
      now: () => "2026-08-14T00:00:00.000Z",
      execute: async (step) => {
        if (step.action === "measure") {
          await new Promise((resolve) => setTimeout(resolve, 8_000));
        }
      },
    };
    const controller = new AbortController();
    const running = runQuickScan(
      root,
      {
        store: createArtifactStore(root),
        launcher,
        startArgv: [process.execPath, join(root, "hang.mjs")],
        driver,
        runId: "run-measure-abort",
      },
      controller.signal,
    );
    await new Promise((resolve) => setTimeout(resolve, 300));
    controller.abort();
    const result = await running;
    expect(result.status).toBe("cancelled");
    expect(result.baselineEligible).toBe(false);
    expect(processAlive(pid)).toBe(false);
    const pids = (await readFile(join(root, "grandchild.pid"), "utf8"))
      .trim()
      .split("\n")
      .map((line) => Number(line));
    for (const childPid of pids) {
      expect(processAlive(childPid)).toBe(false);
    }
  }, 15_000);

  it("kills children when artifact write crashes and is not a budget fail", async () => {
    const root = await mkdtemp(join(tmpdir(), "potato-scan-write-"));
    const inner = createArgvLauncher();
    let pid = 0;
    const launcher: ProcessLauncher = {
      async start(argv, cwd) {
        const launched = await inner.start(argv, cwd);
        pid = launched.pid;
        return launched;
      },
    };
    const store = createArtifactStore(root);
    const result = await runQuickScan(root, {
      store: {
        ...store,
        writeCompleted: async () => {
          throw new Error("write aborted before atomic rename");
        },
      },
      launcher,
      startArgv: [process.execPath, "-e", "setInterval(() => {}, 1000)"],
      runId: "run-write-crash",
    });
    expect(result.status).toBe("failed");
    expect(result.budgetFail).toBe(false);
    expect(result.baselineEligible).toBe(false);
    expect(result.artifactPath).toBeNull();
    expect(processAlive(pid)).toBe(false);
  }, 15_000);

  it("does not persist a canary Bearer token in the written artifact", async () => {
    const root = await mkdtemp(join(tmpdir(), "potato-scan-canary-"));
    const store = createArtifactStore(root);
    const canary = "CANARY_SECRET_t011_do_not_store";
    const result = await runQuickScan(root, {
      store,
      runId: "run-canary",
      collect: async () => ({
        samples: [
          {
            sampleId: "s1",
            source: "cdp",
            metric: "frame_time",
            timestampNs: 1,
            value: 16,
            unit: "ms",
          },
        ],
        capabilities: [
          {
            id: "os",
            status: "ok",
            required: true,
            detail: `Bearer ${canary}`,
          },
          {
            id: "cdp",
            status: "ok",
            required: true,
            detail: "ok",
          },
        ],
        processTree: [],
        budgetEligible: true,
        outcome: "ready",
      }),
    });
    expect(result.status).toBe("completed");
    const stored = await store.readCompleted("run-canary");
    const text = new TextDecoder().decode(stored.bytes);
    expect(text).not.toContain(canary);
    expect(text).toMatch(/Bearer redacted/);
  });
});
