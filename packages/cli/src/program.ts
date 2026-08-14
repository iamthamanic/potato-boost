import { join } from "node:path";
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
  { name: "doctor", summary: "Check the local toolchain (stub)" },
  { name: "run", summary: "Run a performance scenario (stub)" },
  { name: "ci", summary: "CI gate against budgets (stub)" },
] as const;

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

export function createProgram(io: CliIo): Command {
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

  for (const command of STUB_COMMANDS) {
    program
      .command(command.name)
      .description(command.summary)
      .action(stubAction(command.name, io));
  }

  return program;
}
