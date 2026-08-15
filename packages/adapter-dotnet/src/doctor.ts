import { type DotnetEnv, locateDotnetSdk } from "./env.js";

export type DotnetDoctorCheck = {
  id: string;
  status: "ok" | "missing" | "unsupported";
  required: boolean;
  path: string;
  detail: string;
};

export type DotnetDoctorReport = {
  root: string;
  sdkPath: string | null;
  checks: readonly DotnetDoctorCheck[];
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

export async function runDotnetDoctor(
  root: string,
  env: DotnetEnv,
): Promise<DotnetDoctorReport> {
  const located = await locateDotnetSdk(env);
  const sdk: DotnetDoctorCheck =
    located.path === null
      ? {
          id: "dotnet-sdk",
          status: "missing",
          required: true,
          path: "",
          detail: `dotnet SDK not found. Checked: ${formatChecked(located.checked)}`,
        }
      : {
          id: "dotnet-sdk",
          status: "ok",
          required: true,
          path: located.path,
          detail: `dotnet SDK at ${located.path}`,
        };
  const wpf: DotnetDoctorCheck = {
    id: "dotnet-wpf",
    status: "unsupported",
    required: false,
    path: "",
    detail: "WPF/WinUI is Windows-only and not implemented in this spike",
  };
  const checks = [sdk, wpf];
  const ok = checks.every((check) => !check.required || check.status === "ok");
  return { root, sdkPath: located.path, checks, ok };
}

export function formatDotnetDoctorReport(report: DotnetDoctorReport): string {
  const lines = report.checks.map((check) => {
    const path = check.path === "" ? "-" : check.path;
    return `${check.id}\t${check.status}\t${path}\t${check.detail}`;
  });
  lines.push(report.ok ? "doctor: ok" : "doctor: blocked");
  return `${lines.join("\n")}\n`;
}
