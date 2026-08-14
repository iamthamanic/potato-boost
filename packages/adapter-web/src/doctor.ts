import {
  type CandidateKind,
  isGenericKinds,
  startArgv,
} from "@potato-boost/core";
import type { DoctorCheck, DoctorEnv, DoctorReport } from "./types.js";

function nodeCheck(env: DoctorEnv): DoctorCheck {
  return {
    id: "node",
    status: "ok",
    required: true,
    path: env.nodePath,
    detail: `running ${env.nodeVersion}; project target ${env.wantedNodeRange}`,
  };
}

async function browserCheck(
  env: DoctorEnv,
  generic: boolean,
): Promise<DoctorCheck> {
  if (generic) {
    return {
      id: "browser",
      status: "unsupported",
      required: false,
      path: "",
      detail: "generic mode does not use a browser",
    };
  }
  const path = await env.locateBrowser();
  if (path === null) {
    return {
      id: "browser",
      status: "missing",
      required: true,
      path: "",
      detail:
        "Playwright Chromium not installed; run pnpm exec playwright install chromium",
    };
  }
  return {
    id: "browser",
    status: "ok",
    required: true,
    path,
    detail: "Playwright Chromium executable exists",
  };
}

function startCommandCheck(
  argv: readonly string[],
  generic: boolean,
): DoctorCheck {
  if (argv.length === 0) {
    return {
      id: "start-command",
      status: generic ? "unsupported" : "missing",
      required: !generic,
      path: "potato.config.yaml",
      detail: generic
        ? "generic static mode; set an override start argv to launch a process (not executed here)"
        : "no start argv inferred; doctor does not execute scripts",
    };
  }
  return {
    id: "start-command",
    status: "ok",
    required: true,
    path: "potato.config.yaml",
    detail: `argv ${JSON.stringify(argv)} (not executed)`,
  };
}

async function portCheck(env: DoctorEnv): Promise<DoctorCheck> {
  const busy = await env.isPortInUse(env.appPort);
  return {
    id: "port",
    status: "ok",
    required: false,
    path: `127.0.0.1:${env.appPort}`,
    detail: busy
      ? "port in use; later dashboard will pick another loopback port"
      : "port is free",
  };
}

export async function runWebDoctor(
  root: string,
  kinds: readonly CandidateKind[],
  env: DoctorEnv,
  options: { start?: readonly string[] } = {},
): Promise<DoctorReport> {
  const generic = isGenericKinds(kinds);
  const argv =
    options.start !== undefined ? [...options.start] : startArgv(kinds);
  const checks: DoctorCheck[] = [
    nodeCheck(env),
    await browserCheck(env, generic),
    startCommandCheck(argv, generic),
    await portCheck(env),
  ];
  const ok = checks.every((check) => !check.required || check.status === "ok");
  return { root, checks, ok };
}

export function formatDoctorReport(report: DoctorReport): string {
  const lines = report.checks.map((check) => {
    const path = check.path === "" ? "-" : check.path;
    return `${check.id}\t${check.status}\t${path}\t${check.detail}`;
  });
  lines.push(report.ok ? "doctor: ok" : "doctor: blocked");
  return `${lines.join("\n")}\n`;
}
