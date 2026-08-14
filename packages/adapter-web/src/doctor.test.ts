import { describe, expect, it } from "vitest";
import { formatDoctorReport, runWebDoctor } from "./doctor.js";
import type { DoctorEnv } from "./types.js";

function env(overrides: Partial<DoctorEnv> = {}): DoctorEnv {
  return {
    nodePath: "/usr/bin/node",
    nodeVersion: "v24.0.0",
    wantedNodeRange: ">=24",
    locateBrowser: async () => "/tmp/fake-chrome",
    isPortInUse: async () => false,
    appPort: 5199,
    ...overrides,
  };
}

describe("runWebDoctor", () => {
  it("lists ok/missing/unsupported-ready checks with paths on a vite fixture", async () => {
    const report = await runWebDoctor("/tmp/fixture", ["web", "vite"], env());
    expect(report.ok).toBe(true);
    const ids = report.checks.map((check) => check.id);
    expect(ids).toEqual(["node", "browser", "start-command", "port"]);
    expect(report.checks.every((check) => check.path !== undefined)).toBe(true);
    expect(formatDoctorReport(report)).toMatch(/doctor: ok/);
  });

  it("marks missing browser as blocking", async () => {
    const report = await runWebDoctor(
      "/tmp/fixture",
      ["web", "vite"],
      env({
        locateBrowser: async () => null,
      }),
    );
    expect(report.ok).toBe(false);
    expect(report.checks.find((check) => check.id === "browser")?.status).toBe(
      "missing",
    );
  });

  it("treats unknown repos as generic static mode without a required browser", async () => {
    const report = await runWebDoctor(
      "/tmp/empty",
      ["unknown"],
      env({
        locateBrowser: async () => null,
      }),
    );
    expect(report.ok).toBe(true);
    expect(report.checks.find((check) => check.id === "browser")?.status).toBe(
      "unsupported",
    );
    const start = report.checks.find((check) => check.id === "start-command");
    expect(start?.status).toBe("unsupported");
    expect(start?.required).toBe(false);
    expect(start?.detail).toMatch(/does not execute|not executed|static/);
  });

  it("uses an overridden start argv without executing it", async () => {
    const report = await runWebDoctor("/tmp/empty", ["unknown"], env(), {
      start: ["npx", "vite"],
    });
    const start = report.checks.find((check) => check.id === "start-command");
    expect(start?.status).toBe("ok");
    expect(start?.detail).toMatch(/npx/);
    expect(start?.detail).toMatch(/does not execute|not executed/);
  });

  it("reports a busy port without flipping doctor to missing", async () => {
    const report = await runWebDoctor(
      "/tmp/fixture",
      ["vite"],
      env({
        isPortInUse: async () => true,
      }),
    );
    expect(report.ok).toBe(true);
    expect(report.checks.find((check) => check.id === "port")?.detail).toMatch(
      /in use/,
    );
  });
});
