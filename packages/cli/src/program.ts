import { detectProject } from "@potato-boost/core";
import { Command } from "commander";
import type { CliIo } from "./io.js";
import { nodeDiscoveryFs } from "./node-fs.js";
import { webDetectors } from "./web-detectors.js";

const STUB_COMMANDS = [
  { name: "init", summary: "Write local config after confirmation (stub)" },
  { name: "doctor", summary: "Check the local toolchain (stub)" },
  { name: "run", summary: "Run a performance scenario (stub)" },
  { name: "ci", summary: "CI gate against budgets (stub)" },
] as const;

function stubAction(name: string, io: CliIo): () => void {
  return () => {
    io.stdout.write(`${name} is not implemented yet\n`);
  };
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

  for (const command of STUB_COMMANDS) {
    program
      .command(command.name)
      .description(command.summary)
      .action(stubAction(command.name, io));
  }

  return program;
}
