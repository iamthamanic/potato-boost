import { CommanderError } from "commander";
import { EXIT_INFRA, EXIT_OK, EXIT_USAGE } from "./exit-codes.js";
import type { CliIo } from "./io.js";
import { createProgram } from "./program.js";

function isCommanderError(error: unknown): error is CommanderError {
  return error instanceof CommanderError;
}

/** Parse user argv (no node/script prefix). Never interpolates a shell string. */
export async function runCli(
  argv: readonly string[],
  io: CliIo,
): Promise<number> {
  const program = createProgram(io);
  try {
    await program.parseAsync([...argv], { from: "user" });
    return EXIT_OK;
  } catch (error) {
    if (isCommanderError(error)) {
      if (error.exitCode === EXIT_OK) {
        return EXIT_OK;
      }
      return EXIT_USAGE;
    }
    const message = error instanceof Error ? error.message : "cli failed";
    io.stderr.write(`${message}\n`);
    return EXIT_INFRA;
  }
}
