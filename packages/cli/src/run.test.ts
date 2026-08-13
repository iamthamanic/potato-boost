import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
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
  });
});
