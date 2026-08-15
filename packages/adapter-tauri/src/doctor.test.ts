import { describe, expect, it } from "vitest";
import { formatTauriDoctorReport, runTauriDoctor } from "./doctor.js";

describe("runTauriDoctor", () => {
  it("labels frontend and native separately and does not invent native samples", async () => {
    const report = await runTauriDoctor("/tmp/tauri", true);
    expect(report.ok).toBe(true);
    const frontend = report.checks.find(
      (check) => check.id === "tauri-frontend",
    );
    const native = report.checks.find((check) => check.id === "tauri-native");
    expect(frontend?.status).toBe("ok");
    expect(frontend?.detail).toMatch(/not a native measurement/);
    expect(native?.status).toBe("unsupported");
    expect(native?.required).toBe(false);
    expect(native?.detail).toMatch(/not hardware-validated/);
    expect(native?.detail).toMatch(/unimplemented/);
    expect(formatTauriDoctorReport(report)).not.toMatch(
      /läuft auf Potato Laptop/i,
    );
  });

  it("does not treat webview-only as native", async () => {
    const report = await runTauriDoctor("/tmp/tauri", false);
    expect(
      report.checks.find((check) => check.id === "tauri-frontend")?.status,
    ).toBe("unsupported");
    expect(
      report.checks.find((check) => check.id === "tauri-native")?.status,
    ).toBe("unsupported");
  });
});
