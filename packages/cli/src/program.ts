import { Command } from "commander";
import type { CliIo } from "./io.js";

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

  for (const command of STUB_COMMANDS) {
    program
      .command(command.name)
      .description(command.summary)
      .action(stubAction(command.name, io));
  }

  return program;
}
