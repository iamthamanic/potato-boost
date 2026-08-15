import { join } from "node:path";
import {
  applyGodotAddon,
  createNodeAddonFs,
  createNodeGodotEnv,
  formatGodotAddonPreview,
  type GodotDoctorEnv,
  godotQuickScanDeps,
} from "@potato-boost/adapter-godot";
import { createNodeDoctorEnv, type DoctorEnv } from "@potato-boost/adapter-web";
import {
  applyInit,
  buildInitPreview,
  createArgvLauncher,
  createNodeConfigFs,
  type InitPreview,
  parseArgvLine,
  type QuickScanDeps,
  runQuickScan,
} from "@potato-boost/core";
import { Command } from "commander";
import { runCi } from "./ci-cmd.js";
import { runFileCompare, runSetBaseline } from "./compare-cmd.js";
import { detectCombined } from "./detect-combined.js";
import { runCombinedDoctor } from "./doctor-gate.js";
import {
  CliExitError,
  EXIT_BUDGET_FAIL,
  EXIT_INCONCLUSIVE,
  EXIT_INFRA,
  EXIT_USAGE,
} from "./exit-codes.js";
import type { CliIo } from "./io.js";

export type ProgramDeps = {
  doctorEnv?: DoctorEnv;
  godotEnv?: GodotDoctorEnv;
  quickScan?: QuickScanDeps;
};

function formatPreview(preview: InitPreview, wrote: boolean): string {
  const lines = [
    "Planned writes:",
    ...preview.plannedPaths.map((path) => `  ${path}`),
    "",
    "potato.config.yaml:",
    preview.configYaml,
  ];
  if (preview.configExists) {
    lines.push("Existing potato.config.yaml will be replaced if confirmed.");
  }
  if (wrote) {
    lines.push("Wrote files.");
  } else {
    lines.push("No files written. Re-run with --confirm to apply.");
  }
  return `${lines.join("\n")}\n`;
}

export function createProgram(io: CliIo, deps: ProgramDeps = {}): Command {
  const doctorEnv = deps.doctorEnv ?? createNodeDoctorEnv();
  const godotEnv = deps.godotEnv ?? createNodeGodotEnv();
  const program = new Command();
  program
    .name("potato-boost")
    .description("Local CLI for reproducible performance findings")
    .version("0.0.0")
    .showHelpAfterError(false)
    .configureOutput({
      writeOut: (str: string) => {
        io.stdout.write(str);
      },
      writeErr: (str: string) => {
        io.stderr.write(str);
      },
    })
    .exitOverride();

  program
    .command("detect")
    .argument("[path]", "project root", ".")
    .description("Scan markers and return candidates (read-only)")
    .action(async (path: string) => {
      const result = await detectCombined(path);
      io.stdout.write(
        `${JSON.stringify(
          {
            root: result.root,
            wrote: result.wrote,
            candidates: result.candidates,
            filesTouched: result.filesTouched,
          },
          null,
          2,
        )}\n`,
      );
    });

  program
    .command("init")
    .argument("[path]", "project root", ".")
    .option("--confirm", "write previewed files", false)
    .option("--godot", "preview the optional Godot addon", false)
    .option("--start <argv>", "whitespace-separated start argv override")
    .description("Preview, then write potato.config.yaml after confirmation")
    .action(
      async (
        path: string,
        options: { confirm: boolean; godot: boolean; start?: string },
      ) => {
        const detection = await detectCombined(path);
        const fs = createNodeConfigFs();
        const configPath = join(detection.root, "potato.config.yaml");
        const gitignorePath = join(detection.root, ".gitignore");
        const preview = buildInitPreview({
          canonicalRoot: detection.root,
          kinds: detection.web.candidates.map((candidate) => candidate.kind),
          configExists: await fs.exists(configPath),
          gitignoreExists: await fs.exists(gitignorePath),
          ...(detection.godot.candidate === null ? {} : { adapterId: "godot" }),
          ...(detection.tauri.candidate === null ? {} : { adapterId: "tauri" }),
          ...(options.start === undefined
            ? {}
            : { start: parseArgvLine(options.start) }),
        });
        const result = await applyInit(fs, preview, options.confirm);
        io.stdout.write(formatPreview(preview, result.wrote));
        if (options.godot) {
          const addon = await applyGodotAddon(
            detection.root,
            options.confirm,
            createNodeAddonFs(),
          );
          io.stdout.write(formatGodotAddonPreview(addon));
        }
      },
    );

  program
    .command("doctor")
    .argument("[path]", "project root", ".")
    .description("Check Node, browser, port, and start command")
    .action(async (path: string) => {
      const report = await runCombinedDoctor(path, doctorEnv, godotEnv);
      io.stdout.write(report.text);
      if (!report.ok) {
        throw new Error("doctor blocked: required capability missing");
      }
    });

  program
    .command("run")
    .argument("[path]", "project root", ".")
    .description("Run a performance scenario")
    .action(async (path: string) => {
      const report = await runCombinedDoctor(path, doctorEnv, godotEnv);
      if (!report.ok) {
        io.stderr.write(report.text);
        throw new Error("doctor blocked: required capability missing");
      }
      const controller = new AbortController();
      const onStop = (): void => {
        controller.abort();
      };
      process.once("SIGINT", onStop);
      process.once("SIGTERM", onStop);
      let result: Awaited<ReturnType<typeof runQuickScan>>;
      try {
        result = await runQuickScan(
          report.root,
          {
            launcher: createArgvLauncher(),
            startArgv: report.start,
            ...(report.hasGodot ? godotQuickScanDeps(report.root) : {}),
            ...deps.quickScan,
          },
          controller.signal,
        );
      } finally {
        process.off("SIGINT", onStop);
        process.off("SIGTERM", onStop);
      }
      for (const event of result.phases) {
        io.stdout.write(`${event.phase}\t${event.detail ?? ""}\n`);
      }
      io.stdout.write(`run: ${result.status}\t${result.artifactPath ?? "-"}\n`);
      if (result.status === "failed") {
        throw new CliExitError(EXIT_INFRA, result.error ?? "quick scan failed");
      }
      if (result.status === "inconclusive") {
        throw new CliExitError(EXIT_INCONCLUSIVE, "quick scan inconclusive");
      }
      if (result.budgetFail) {
        throw new CliExitError(EXIT_BUDGET_FAIL, "budget exceeded");
      }
    });

  program
    .command("compare")
    .description("Hard-compare two run artifacts when locks match")
    .option("--baseline <path>", "baseline artifact JSON")
    .option("--candidate <path>", "candidate artifact JSON")
    .option("--set-baseline <path>", "artifact JSON to store as baseline")
    .option("--confirm", "write the baseline file", false)
    .option("--root <path>", "project root for baselines.json", ".")
    .action(
      async (options: {
        baseline?: string;
        candidate?: string;
        setBaseline?: string;
        confirm: boolean;
        root: string;
      }) => {
        if (options.setBaseline !== undefined) {
          await runSetBaseline(
            io,
            options.setBaseline,
            options.root,
            options.confirm,
          );
          return;
        }
        if (options.baseline === undefined || options.candidate === undefined) {
          throw new CliExitError(
            EXIT_USAGE,
            "compare needs --baseline and --candidate, or --set-baseline",
          );
        }
        await runFileCompare(io, options.baseline, options.candidate);
      },
    );

  program
    .command("ci")
    .argument("[path]", "project root", ".")
    .option("--baseline <path>", "baseline artifact JSON")
    .option("--out <dir>", "report output directory")
    .description("CI gate against budgets")
    .action(
      async (path: string, options: { baseline?: string; out?: string }) => {
        await runCi(io, path, options, {
          doctorEnv,
          godotEnv,
          ...(deps.quickScan === undefined
            ? {}
            : { quickScan: deps.quickScan }),
        });
      },
    );

  return program;
}
