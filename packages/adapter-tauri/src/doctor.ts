export type TauriDoctorCheck = {
  id: string;
  status: "ok" | "missing" | "unsupported";
  required: boolean;
  path: string;
  detail: string;
};

export type TauriDoctorReport = {
  root: string;
  checks: readonly TauriDoctorCheck[];
  ok: boolean;
};

export async function runTauriDoctor(
  root: string,
  hasFrontend: boolean,
): Promise<TauriDoctorReport> {
  const frontend: TauriDoctorCheck = hasFrontend
    ? {
        id: "tauri-frontend",
        status: "ok",
        required: false,
        path: "webview",
        detail: "frontend/webview mode — not a native measurement",
      }
    : {
        id: "tauri-frontend",
        status: "unsupported",
        required: false,
        path: "",
        detail: "no webview target selected; not a native measurement",
      };
  const native: TauriDoctorCheck = {
    id: "tauri-native",
    status: "unsupported",
    required: false,
    path: "",
    detail:
      "native collector unimplemented; not hardware-validated; S-011 WebDriver is not native",
  };
  const checks = [frontend, native];
  const ok = checks.every((check) => !check.required || check.status === "ok");
  return { root, checks, ok };
}

export function formatTauriDoctorReport(report: TauriDoctorReport): string {
  const lines = report.checks.map((check) => {
    const path = check.path === "" ? "-" : check.path;
    return `${check.id}\t${check.status}\t${path}\t${check.detail}`;
  });
  lines.push(report.ok ? "doctor: ok" : "doctor: blocked");
  return `${lines.join("\n")}\n`;
}
