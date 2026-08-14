import { join } from "node:path";
import {
  createNodeDoctorEnv,
  type DoctorEnv,
  formatDoctorReport,
  runWebDoctor,
} from "@potato-boost/adapter-web";
import {
  applyInit,
  buildInitPreview,
  createNodeConfigFs,
  detectProject,
  type InitPreview,
} from "@potato-boost/core";
import { Command } from "commander";
import type { CliIo } from "./io.js";
import { nodeDiscoveryFs } from "./node-fs.js";
import { webDetectors } from "./web-detectors.js";

const STUB_COMMANDS = [
  { name: "ci", summary: "CI gate against budgets (stub)" },
] as const;

export type ProgramDeps = {
  doctorEnv?: DoctorEnv;
};

function stubAction(name: string, io: CliIo): () => void {
  return () => {
    io.stdout.write(`${name} is not implemented yet\n`);
  };
}

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
      const result = await detectProject(nodeDiscoveryFs, path, webDetectors);
      io.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    });

  program
    .command("init")
    .argument("[path]", "project root", ".")
    .option("--confirm", "write previewed files", false)
    .description("Preview, then write potato.config.yaml after confirmation")
    .action(async (path: string, options: { confirm: boolean }) => {
      const detection = await detectProject(
        nodeDiscoveryFs,
        path,
        webDetectors,
      );
      const fs = createNodeConfigFs();
      const configPath = join(detection.root, "potato.config.yaml");
      const gitignorePath = join(detection.root, ".gitignore");
      const preview = buildInitPreview({
        canonicalRoot: detection.root,
        kinds: detection.candidates.map((candidate) => candidate.kind),
        configExists: await fs.exists(configPath),
        gitignoreExists: await fs.exists(gitignorePath),
      });
      const result = await applyInit(fs, preview, options.confirm);
      io.stdout.write(formatPreview(preview, result.wrote));
    });

  program
    .command("doctor")
    .argument("[path]", "project root", ".")
    .description("Check Node, browser, port, and start command")
    .action(async (path: string) => {
      const detection = await detectProject(
        nodeDiscoveryFs,
        path,
        webDetectors,
      );
      const report = await runWebDoctor(
        detection.root,
        detection.candidates.map((candidate) => candidate.kind),
        doctorEnv,
      );
      io.stdout.write(formatDoctorReport(report));
      if (!report.ok) {
        throw new Error("doctor blocked: required capability missing");
      }
    });

  program
    .command("run")
    .argument("[path]", "project root", ".")
    .description("Run a performance scenario")
    .action(async (path: string) => {
      const detection = await detectProject(
        nodeDiscoveryFs,
        path,
        webDetectors,
      );
      const report = await runWebDoctor(
        detection.root,
        detection.candidates.map((candidate) => candidate.kind),
        doctorEnv,
      );
      if (!report.ok) {
        io.stderr.write(formatDoctorReport(report));
        throw new Error("doctor blocked: required capability missing");
      }
      io.stdout.write("run is not implemented yet\n");
    });

  for (const command of STUB_COMMANDS) {
    program
      .command(command.name)
      .description(command.summary)
      .action(stubAction(command.name, io));
  }

  return program;
}
