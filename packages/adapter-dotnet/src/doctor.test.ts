import { describe, expect, it } from "vitest";
import { formatDotnetDoctorReport, runDotnetDoctor } from "./doctor.js";
import type { DotnetEnv } from "./env.js";

function env(exists: ReadonlySet<string>): DotnetEnv {
  return {
    env: {},
    platform: "darwin",
    exists: async (path) => exists.has(path),
  };
}

describe("runDotnetDoctor", () => {
  it("blocks when the SDK is missing and lists checked paths", async () => {
    const report = await runDotnetDoctor("/tmp/dotnet", env(new Set()));
    expect(report.ok).toBe(false);
    const sdk = report.checks.find((check) => check.id === "dotnet-sdk");
    expect(sdk?.status).toBe("missing");
    expect(sdk?.required).toBe(true);
    expect(sdk?.detail).toMatch(/Checked:/);
    expect(sdk?.detail).toMatch(/dotnet/);
    expect(formatDotnetDoctorReport(report)).toMatch(/doctor: blocked/);
  });

  it("is ok when DOTNET points at an existing binary", async () => {
    const report = await runDotnetDoctor("/tmp/dotnet", {
      env: { DOTNET: "/opt/dotnet/dotnet" },
      platform: "darwin",
      exists: async (path) => path === "/opt/dotnet/dotnet",
    });
    expect(report.ok).toBe(true);
    expect(report.checks.find((check) => check.id === "dotnet-sdk")?.path).toBe(
      "/opt/dotnet/dotnet",
    );
  });

  it("marks WPF/WinUI unsupported and not required", async () => {
    const report = await runDotnetDoctor("/tmp/dotnet", {
      env: { DOTNET: "/opt/dotnet/dotnet" },
      platform: "darwin",
      exists: async (path) => path === "/opt/dotnet/dotnet",
    });
    const wpf = report.checks.find((check) => check.id === "dotnet-wpf");
    expect(wpf?.status).toBe("unsupported");
    expect(wpf?.required).toBe(false);
    expect(wpf?.detail).toMatch(/Windows-only/);
  });
});
