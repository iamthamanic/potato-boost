import { hasValidGodotSnapshot } from "./collector.js";
import type { GodotDoctorEnv } from "./env.js";
import { EXPECTED_GODOT, locateGodotBinary } from "./env.js";

export type GodotDoctorCheck = {
  id: string;
  status: "ok" | "missing" | "unsupported";
  required: boolean;
  path: string;
  detail: string;
};

export type GodotDoctorReport = {
  root: string;
  checks: readonly GodotDoctorCheck[];
  ok: boolean;
};

function formatChecked(checked: readonly string[]): string {
  const sample = checked.slice(0, 8);
  const more =
    checked.length > sample.length
      ? `; +${checked.length - sample.length} more`
      : "";
  return sample.join(", ") + more;
}

export async function runGodotDoctor(
  root: string,
  env: GodotDoctorEnv,
): Promise<GodotDoctorReport> {
  const located = await locateGodotBinary(env);
  const snapshot = await hasValidGodotSnapshot(root);
  const binary: GodotDoctorCheck =
    located.path === null
      ? snapshot
        ? {
            id: "godot-binary",
            status: "unsupported",
            required: false,
            path: "",
            detail: "fixture snapshot present; live binary not required",
          }
        : {
            id: "godot-binary",
            status: "missing",
            required: true,
            path: "",
            detail: `expected ${EXPECTED_GODOT}; not found. Checked: ${formatChecked(located.checked)}`,
          }
      : {
          id: "godot-binary",
          status: "ok",
          required: true,
          path: located.path,
          detail: `expected ${EXPECTED_GODOT}; executable exists`,
        };
  const addon: GodotDoctorCheck = {
    id: "godot-addon",
    status: "unsupported",
    required: false,
    path: "",
    detail: "addon is not copied without confirm",
  };
  const checks = [binary, addon];
  const ok = checks.every((check) => !check.required || check.status === "ok");
  return { root, checks, ok };
}

export function formatGodotDoctorReport(report: GodotDoctorReport): string {
  const lines = report.checks.map((check) => {
    const path = check.path === "" ? "-" : check.path;
    return `${check.id}\t${check.status}\t${path}\t${check.detail}`;
  });
  lines.push(report.ok ? "doctor: ok" : "doctor: blocked");
  return `${lines.join("\n")}\n`;
}
