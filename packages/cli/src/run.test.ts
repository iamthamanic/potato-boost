import { mkdtemp, readdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createArtifactStore } from "@potato-boost/artifact-store";
import type { QuickScanDeps } from "@potato-boost/core";
import { describe, expect, it } from "vitest";
import {
  EXIT_BUDGET_FAIL,
  EXIT_INCONCLUSIVE,
  EXIT_INFRA,
  EXIT_OK,
  EXIT_USAGE,
} from "./exit-codes.js";
import type { CliIo } from "./io.js";
import type { ProgramDeps } from "./program.js";
import { runCli } from "./run.js";

function capture(): { io: CliIo; stdout: string[]; stderr: string[] } {
  const stdout: string[] = [];
  const stderr: string[] = [];
  return {
    stdout,
    stderr,
    io: {
      stdout: {
        write: (chunk: string) => {
          stdout.push(chunk);
        },
      },
      stderr: {
        write: (chunk: string) => {
          stderr.push(chunk);
        },
      },
    },
  };
}

describe("runCli", () => {
  it("prints help that lists planned commands", async () => {
    const { io, stdout, stderr } = capture();
    const code = await runCli(["--help"], io);
    expect(code).toBe(EXIT_OK);
    const help = stdout.join("");
    expect(help).toMatch(/Usage:/);
    expect(help).toMatch(/init/);
    expect(help).toMatch(/doctor/);
    expect(help).toMatch(/run/);
    expect(help).toMatch(/ci/);
    expect(help).toMatch(/compare/);
    expect(stderr.join("")).not.toMatch(/\/Users\//);
    expect(help).not.toMatch(/at runCli/);
  });

  it("exits 2 for an unknown command, not 1", async () => {
    const { io, stderr } = capture();
    const code = await runCli(["not-a-command"], io);
    expect(code).toBe(EXIT_USAGE);
    expect(code).not.toBe(1);
    expect(stderr.join("")).toMatch(/unknown command/i);
  });

  it("exits 2 for an unknown flag, not 1", async () => {
    const { io } = capture();
    const code = await runCli(["--not-a-real-flag"], io);
    expect(code).toBe(EXIT_USAGE);
    expect(code).not.toBe(1);
  });

  describe("ci", () => {
    const doctorEnv = {
      nodePath: "/usr/bin/node",
      nodeVersion: "v24.0.0",
      wantedNodeRange: ">=24",
      locateBrowser: async () => "/tmp/fake-chrome",
      isPortInUse: async () => false,
      appPort: 5199,
    };

    function scanDeps(
      tmp: string,
      collect?: QuickScanDeps["collect"],
    ): ProgramDeps {
      return {
        doctorEnv,
        quickScan: {
          store: createArtifactStore(tmp),
          startArgv: [],
          launcher: {
            async start() {
              return { pid: 0, async kill() {} };
            },
          },
          runId: "run-ci",
          ...(collect === undefined ? {} : { collect }),
        },
      };
    }

    function frameCollect(
      value: number,
      budgetEligible: boolean,
    ): NonNullable<QuickScanDeps["collect"]> {
      return async () => ({
        samples: [
          {
            sampleId: "s1",
            source: "cdp",
            metric: "frame_time",
            timestampNs: 1,
            value,
            unit: "ms",
          },
        ],
        capabilities: [
          { id: "os", status: "ok", required: true, detail: "ok" },
          { id: "cdp", status: "ok", required: true, detail: "ok" },
        ],
        processTree: [],
        budgetEligible,
        outcome: budgetEligible ? "ready" : "collector-incomplete",
      });
    }

    function summaryFrom(stdout: string[]): {
      exitCode: number;
      jsonPath: string | null;
      htmlPath: string | null;
      runId: string | null;
    } {
      const parsed: unknown = JSON.parse(stdout.join("").trim());
      if (
        typeof parsed !== "object" ||
        parsed === null ||
        !("exitCode" in parsed) ||
        !("jsonPath" in parsed) ||
        !("htmlPath" in parsed) ||
        !("runId" in parsed)
      ) {
        throw new Error("ci stdout was not a summary");
      }
      const exitCode = parsed.exitCode;
      const jsonPath = parsed.jsonPath;
      const htmlPath = parsed.htmlPath;
      const runId = parsed.runId;
      if (typeof exitCode !== "number") {
        throw new Error("exitCode");
      }
      if (jsonPath !== null && typeof jsonPath !== "string") {
        throw new Error("jsonPath");
      }
      if (htmlPath !== null && typeof htmlPath !== "string") {
        throw new Error("htmlPath");
      }
      if (runId !== null && typeof runId !== "string") {
        throw new Error("runId");
      }
      return { exitCode, jsonPath, htmlPath, runId };
    }

    it("exits 0 and prints report paths on a passing fixture run", async () => {
      const tmp = await mkdtemp(join(tmpdir(), "potato-ci-ok-"));
      const out = join(tmp, "out");
      const { io, stdout, stderr } = capture();
      const code = await runCli(
        ["ci", "fixtures/web-threejs", "--out", out],
        io,
        scanDeps(tmp),
      );
      expect(code).toBe(EXIT_OK);
      const summary = summaryFrom(stdout);
      expect(summary.exitCode).toBe(EXIT_OK);
      expect(summary.jsonPath).toMatch(/report\.json$/);
      expect(summary.htmlPath).toMatch(/report\.html$/);
      expect(stderr.join("")).toMatch(/jsonPath\t/);
      expect(stderr.join("")).toMatch(/htmlPath\t/);
      await readFile(join(out, "report.json"), "utf8");
      await readFile(join(out, "report.html"), "utf8");
    });

    it("exits 1 on a budget fail, not 3", async () => {
      const tmp = await mkdtemp(join(tmpdir(), "potato-ci-budget-"));
      const { io, stdout } = capture();
      const code = await runCli(
        ["ci", "fixtures/web-threejs", "--out", join(tmp, "out")],
        io,
        scanDeps(tmp, frameCollect(80, true)),
      );
      expect(code).toBe(EXIT_BUDGET_FAIL);
      expect(code).not.toBe(EXIT_INFRA);
      const summary = summaryFrom(stdout);
      expect(summary.exitCode).toBe(EXIT_BUDGET_FAIL);
      expect(summary.jsonPath).toMatch(/report\.json$/);
    });

    it("exits 2 for a missing baseline file after emitting report paths", async () => {
      const tmp = await mkdtemp(join(tmpdir(), "potato-ci-usage-"));
      const { io, stdout } = capture();
      const code = await runCli(
        [
          "ci",
          "fixtures/web-threejs",
          "--baseline",
          join(tmp, "missing.json"),
          "--out",
          join(tmp, "out"),
        ],
        io,
        scanDeps(tmp),
      );
      expect(code).toBe(EXIT_USAGE);
      expect(code).not.toBe(EXIT_BUDGET_FAIL);
      const summary = summaryFrom(stdout);
      expect(summary.exitCode).toBe(EXIT_USAGE);
      expect(summary.jsonPath).toMatch(/report\.json$/);
      expect(summary.htmlPath).toMatch(/report\.html$/);
    });

    it("exits 3 when the browser is missing, not 1", async () => {
      const { io, stdout, stderr } = capture();
      const code = await runCli(["ci", "fixtures/web-threejs"], io, {
        doctorEnv: {
          ...doctorEnv,
          locateBrowser: async () => null,
        },
      });
      expect(code).toBe(EXIT_INFRA);
      expect(code).not.toBe(EXIT_BUDGET_FAIL);
      expect(stderr.join("")).toMatch(/browser\tmissing/);
      const summary = summaryFrom(stdout);
      expect(summary.exitCode).toBe(EXIT_INFRA);
      expect(summary.jsonPath).toBe(null);
      expect(summary.htmlPath).toBe(null);
    });

    it("exits 4 when the collector is incomplete, not a fake pass", async () => {
      const tmp = await mkdtemp(join(tmpdir(), "potato-ci-noise-"));
      const { io, stdout } = capture();
      const code = await runCli(
        ["ci", "fixtures/web-threejs", "--out", join(tmp, "out")],
        io,
        scanDeps(tmp, frameCollect(16, false)),
      );
      expect(code).toBe(EXIT_INCONCLUSIVE);
      expect(code).not.toBe(EXIT_OK);
      expect(code).not.toBe(EXIT_BUDGET_FAIL);
      const summary = summaryFrom(stdout);
      expect(summary.exitCode).toBe(EXIT_INCONCLUSIVE);
      expect(summary.jsonPath).toMatch(/report\.json$/);
    });
  });

  describe("detect", () => {
    it("prints JSON with candidates for the web-threejs fixture", async () => {
      const { io, stdout } = capture();
      const code = await runCli(["detect", "fixtures/web-threejs"], io);
      expect(code).toBe(EXIT_OK);
      const parsed = JSON.parse(stdout.join(""));
      expect(parsed.wrote).toBe(false);
      const kinds = parsed.candidates.map((c: { kind: string }) => c.kind);
      expect(kinds).toContain("web");
      expect(kinds).toContain("vite");
      expect(kinds).toContain("threejs");
    });

    it("returns unknown for an empty directory", async () => {
      const { io, stdout } = capture();
      const tmp = await mkdtemp(join(tmpdir(), "potato-detect-"));
      const code = await runCli(["detect", tmp], io);
      expect(code).toBe(EXIT_OK);
      const parsed = JSON.parse(stdout.join(""));
      expect(parsed.candidates).toHaveLength(1);
      expect(parsed.candidates[0].kind).toBe("unknown");
    });

    it("does not classify a package.json-only repo as web", async () => {
      const { io, stdout } = capture();
      const tmp = await mkdtemp(join(tmpdir(), "potato-pkg-"));
      await writeFile(join(tmp, "package.json"), '{"name":"cli"}');
      const code = await runCli(["detect", tmp], io);
      expect(code).toBe(EXIT_OK);
      const parsed = JSON.parse(stdout.join("")) as {
        candidates: { kind: string }[];
      };
      expect(parsed.candidates.map((c) => c.kind)).toEqual(["unknown"]);
    });

    it("detects the godot-min fixture with evidence", async () => {
      const { io, stdout } = capture();
      const code = await runCli(["detect", "fixtures/godot-min"], io);
      expect(code).toBe(EXIT_OK);
      const parsed = JSON.parse(stdout.join("")) as {
        wrote: boolean;
        candidates: { kind: string; evidence: { path: string }[] }[];
      };
      expect(parsed.wrote).toBe(false);
      expect(parsed.candidates.map((c) => c.kind)).toEqual(["godot"]);
      const godot = parsed.candidates[0];
      expect(godot?.evidence.map((entry) => entry.path)).toEqual(
        expect.arrayContaining(["project.godot", "main.gd"]),
      );
    });
  });

  describe("init", () => {
    it("previews paths and writes nothing without --confirm", async () => {
      const tmp = await mkdtemp(join(tmpdir(), "potato-init-cli-"));
      const { io, stdout } = capture();
      const code = await runCli(["init", tmp], io);
      expect(code).toBe(EXIT_OK);
      const out = stdout.join("");
      expect(out).toMatch(/potato\.config\.yaml/);
      expect(out).toMatch(/No files written/);
      expect(await readdir(tmp)).toEqual([]);
    });

    it("writes schema fields after --confirm", async () => {
      const tmp = await mkdtemp(join(tmpdir(), "potato-init-ok-"));
      const { io, stdout } = capture();
      const code = await runCli(["init", tmp, "--confirm"], io);
      expect(code).toBe(EXIT_OK);
      expect(stdout.join("")).toMatch(/Wrote files/);
      const yaml = await readFile(join(tmp, "potato.config.yaml"), "utf8");
      expect(yaml).toMatch(/adapterId:/);
      expect(yaml).toMatch(/root: "\."/);
      expect(yaml).toMatch(/commands:/);
      expect(yaml).toMatch(/startSource: "inferred"/);
      const gitignore = await readFile(join(tmp, ".gitignore"), "utf8");
      expect(gitignore).toMatch(/\.potato\//);
    });

    it("stores --start as an override only after --confirm", async () => {
      const tmp = await mkdtemp(join(tmpdir(), "potato-init-start-"));
      const preview = capture();
      expect(
        await runCli(["init", tmp, "--start", "node app.js"], preview.io),
      ).toBe(EXIT_OK);
      expect(preview.stdout.join("")).toMatch(/startSource: "override"/);
      expect(await readdir(tmp)).toEqual([]);
      const wrote = capture();
      expect(
        await runCli(
          ["init", tmp, "--start", "node app.js", "--confirm"],
          wrote.io,
        ),
      ).toBe(EXIT_OK);
      const yaml = await readFile(join(tmp, "potato.config.yaml"), "utf8");
      expect(yaml).toMatch(/- "node"/);
      expect(yaml).toMatch(/- "app.js"/);
      expect(yaml).toMatch(/startSource: "override"/);
    });
  });

  describe("doctor and run", () => {
    const doctorEnv = {
      nodePath: "/usr/bin/node",
      nodeVersion: "v24.0.0",
      wantedNodeRange: ">=24",
      locateBrowser: async () => "/tmp/fake-chrome",
      isPortInUse: async () => false,
      appPort: 5199,
    };
    const healthy: ProgramDeps = { doctorEnv };

    it("exits 0 on the web fixture when required checks are ok", async () => {
      const { io, stdout } = capture();
      const code = await runCli(
        ["doctor", "fixtures/web-threejs"],
        io,
        healthy,
      );
      expect(code).toBe(EXIT_OK);
      expect(stdout.join("")).toMatch(/node\tok/);
      expect(stdout.join("")).toMatch(/browser\tok/);
      expect(stdout.join("")).toMatch(/doctor: ok/);
    });

    it("does not require a browser for generic unknown repos", async () => {
      const tmp = await mkdtemp(join(tmpdir(), "potato-generic-"));
      const { io, stdout } = capture();
      const code = await runCli(["doctor", tmp], io, {
        doctorEnv: {
          ...doctorEnv,
          locateBrowser: async () => null,
        },
      });
      expect(code).toBe(EXIT_OK);
      expect(stdout.join("")).toMatch(/browser\tunsupported/);
      expect(stdout.join("")).toMatch(/start-command\tunsupported/);
      expect(stdout.join("")).toMatch(/doctor: ok/);
    });

    it("blocks Godot doctor when the binary and snapshot are missing", async () => {
      const tmp = await mkdtemp(join(tmpdir(), "potato-godot-nobin-"));
      await writeFile(join(tmp, "project.godot"), "config_version=5\n");
      await writeFile(join(tmp, "main.gd"), "extends Node\n");
      const { io, stdout } = capture();
      const code = await runCli(["doctor", tmp], io, {
        ...healthy,
        godotEnv: {
          env: {},
          pathDirs: ["/usr/bin"],
          wellKnownPaths: ["/Applications/Godot.app/Contents/MacOS/Godot"],
          exists: async () => false,
        },
      });
      expect(code).toBe(EXIT_INFRA);
      expect(stdout.join("")).toMatch(/godot-binary\tmissing/);
      expect(stdout.join("")).toMatch(/Checked:/);
      expect(stdout.join("")).not.toMatch(/install godot somehow/i);
    });

    it("does not require a live Godot binary when the fixture snapshot is present", async () => {
      const { io, stdout } = capture();
      const code = await runCli(["doctor", "fixtures/godot-min"], io, {
        ...healthy,
        godotEnv: {
          env: {},
          pathDirs: [],
          wellKnownPaths: [],
          exists: async () => false,
        },
      });
      expect(code).toBe(EXIT_OK);
      expect(stdout.join("")).toMatch(/godot-binary\tunsupported/);
      expect(stdout.join("")).toMatch(/snapshot present/);
      expect(stdout.join("")).toMatch(/doctor: ok/);
    });

    it("blocks potato run with exit 3 when the browser is missing", async () => {
      const { io, stderr } = capture();
      const code = await runCli(["run", "fixtures/web-threejs"], io, {
        doctorEnv: {
          ...doctorEnv,
          locateBrowser: async () => null,
        },
      });
      expect(code).toBe(EXIT_INFRA);
      expect(code).not.toBe(1);
      expect(stderr.join("")).toMatch(/browser\tmissing/);
    });

    it("prints quick-scan phases and writes an artifact when healthy", async () => {
      const tmp = await mkdtemp(join(tmpdir(), "potato-run-cli-"));
      const { io, stdout } = capture();
      const code = await runCli(["run", "fixtures/web-threejs"], io, {
        ...healthy,
        quickScan: {
          store: createArtifactStore(tmp),
          startArgv: [],
          launcher: {
            async start() {
              return { pid: 0, async kill() {} };
            },
          },
          runId: "run-cli",
        },
      });
      expect(code).toBe(EXIT_OK);
      expect(stdout.join("")).toMatch(/measure/);
      expect(stdout.join("")).toMatch(/run: completed/);
    });

    it("does not spawn a process for generic static mode", async () => {
      const tmp = await mkdtemp(join(tmpdir(), "potato-static-"));
      let spawned = 0;
      const { io } = capture();
      const code = await runCli(["run", tmp], io, {
        doctorEnv: {
          ...doctorEnv,
          locateBrowser: async () => null,
        },
        quickScan: {
          store: createArtifactStore(tmp),
          launcher: {
            async start() {
              spawned += 1;
              return { pid: 0, async kill() {} };
            },
          },
          runId: "run-static",
        },
      });
      expect(code).toBe(EXIT_OK);
      expect(spawned).toBe(0);
    });

    it("blocks potato run on a Godot repo without a binary or snapshot", async () => {
      const tmp = await mkdtemp(join(tmpdir(), "potato-godot-run-nobin-"));
      await writeFile(join(tmp, "project.godot"), "config_version=5\n");
      await writeFile(join(tmp, "main.gd"), "extends Node\n");
      const { io, stderr } = capture();
      const code = await runCli(["run", tmp], io, {
        ...healthy,
        godotEnv: {
          env: {},
          pathDirs: [],
          wellKnownPaths: ["/usr/local/bin/godot"],
          exists: async () => false,
        },
      });
      expect(code).toBe(EXIT_INFRA);
      expect(stderr.join("")).toMatch(/godot-binary\tmissing/);
    });

    it("records Godot Performance frame_time from the 2D fixture snapshot", async () => {
      const tmp = await mkdtemp(join(tmpdir(), "potato-godot-run-"));
      let spawned = 0;
      const store = createArtifactStore(tmp);
      const { io, stdout } = capture();
      const code = await runCli(["run", "fixtures/godot-min"], io, {
        ...healthy,
        godotEnv: {
          env: {},
          pathDirs: [],
          wellKnownPaths: [],
          exists: async () => false,
        },
        quickScan: {
          store,
          startArgv: [],
          launcher: {
            async start() {
              spawned += 1;
              return { pid: 0, async kill() {} };
            },
          },
          runId: "run-godot",
        },
      });
      expect(code).toBe(EXIT_OK);
      expect(spawned).toBe(0);
      expect(stdout.join("")).toMatch(/run: completed/);
      const packed = await store.readCompleted("run-godot");
      const artifact = JSON.parse(new TextDecoder().decode(packed.bytes)) as {
        metrics: { name: string }[];
        collectorChecks: { id: string; status: string }[];
        capabilities: string[];
      };
      expect(artifact.metrics.map((metric) => metric.name)).toEqual(
        expect.arrayContaining(["frame_time_p95"]),
      );
      expect(artifact.collectorChecks).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: "godot.performance",
            status: "ok",
          }),
        ]),
      );
      expect(artifact.capabilities).toContain("godot.performance");
      expect(artifact.capabilities).not.toContain("web.cdp");
    });
  });

  describe("compare", () => {
    const golden = "packages/schemas/fixtures/golden-v1.0.0.json";

    it("exits 4 for debug vs release without treating it as budget-fail", async () => {
      const tmp = await mkdtemp(join(tmpdir(), "potato-compare-"));
      const baseline = JSON.parse(await readFile(golden, "utf8")) as {
        fingerprints: { build: { mode: string } };
        metrics: { name: string; value: number }[];
      };
      baseline.fingerprints.build.mode = "debug";
      const candidatePath = join(tmp, "debug.json");
      await writeFile(candidatePath, `${JSON.stringify(baseline)}\n`);
      const { io } = capture();
      const code = await runCli(
        ["compare", "--baseline", golden, "--candidate", candidatePath],
        io,
      );
      expect(code).toBe(EXIT_INCONCLUSIVE);
      expect(code).not.toBe(EXIT_BUDGET_FAIL);
    });

    it("writes a baseline only with --confirm", async () => {
      const tmp = await mkdtemp(join(tmpdir(), "potato-base-"));
      const { io, stdout } = capture();
      const preview = await runCli(
        ["compare", "--set-baseline", golden, "--root", tmp],
        io,
      );
      expect(preview).toBe(EXIT_OK);
      expect(stdout.join("")).toMatch(/No files written/);
      const names = await readdir(tmp);
      expect(names).not.toContain(".potato");
      const { io: io2, stdout: out2 } = capture();
      const wrote = await runCli(
        ["compare", "--set-baseline", golden, "--root", tmp, "--confirm"],
        io2,
      );
      expect(wrote).toBe(EXIT_OK);
      expect(out2.join("")).toMatch(/Wrote/);
      const saved = JSON.parse(
        await readFile(join(tmp, ".potato", "baselines.json"), "utf8"),
      ) as { current: { runId: string }[]; history: unknown[] };
      expect(saved.current[0]?.runId).toBe("01J9GOLDENV100000000000000");
      expect(saved.history).toEqual([]);
    });
  });
});
