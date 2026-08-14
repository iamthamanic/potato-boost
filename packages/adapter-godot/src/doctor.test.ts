import { describe, expect, it } from "vitest";
import { formatGodotDoctorReport, runGodotDoctor } from "./doctor.js";
import type { GodotDoctorEnv } from "./env.js";

function env(exists: ReadonlySet<string>): GodotDoctorEnv {
  return {
    env: {},
    pathDirs: ["/usr/bin"],
    wellKnownPaths: ["/Applications/Godot.app/Contents/MacOS/Godot"],
    exists: async (path) => exists.has(path),
  };
}

describe("runGodotDoctor", () => {
  it("blocks when the binary is missing and lists checked paths", async () => {
    const report = await runGodotDoctor("/tmp/godot", env(new Set()));
    expect(report.ok).toBe(false);
    const binary = report.checks.find((check) => check.id === "godot-binary");
    expect(binary?.status).toBe("missing");
    expect(binary?.required).toBe(true);
    expect(binary?.detail).toMatch(/Godot 4/);
    expect(binary?.detail).toMatch(/Checked:/);
    expect(binary?.detail).not.toMatch(/install godot somehow/i);
    expect(formatGodotDoctorReport(report)).toMatch(/doctor: blocked/);
  });

  it("is ok when an env path exists and does not copy an addon", async () => {
    const report = await runGodotDoctor("/tmp/godot", {
      env: { GODOT_BIN: "/opt/godot/godot4" },
      pathDirs: [],
      wellKnownPaths: [],
      exists: async (path) => path === "/opt/godot/godot4",
    });
    expect(report.ok).toBe(true);
    expect(
      report.checks.find((check) => check.id === "godot-binary")?.path,
    ).toBe("/opt/godot/godot4");
    expect(
      report.checks.find((check) => check.id === "godot-addon")?.status,
    ).toBe("unsupported");
    expect(
      report.checks.find((check) => check.id === "godot-addon")?.required,
    ).toBe(false);
  });
});
