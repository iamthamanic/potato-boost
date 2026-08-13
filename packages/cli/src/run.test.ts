import { describe, expect, it } from "vitest";
import { EXIT_OK, EXIT_USAGE } from "./exit-codes.js";
import type { CliIo } from "./io.js";
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

  it("runs a stub command without touching the network", async () => {
    const { io, stdout } = capture();
    const code = await runCli(["init"], io);
    expect(code).toBe(EXIT_OK);
    expect(stdout.join("")).toMatch(/not implemented yet/);
  });
});
