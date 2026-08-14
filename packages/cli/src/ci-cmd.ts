import { join } from "node:path";
import {
  createNodeGodotEnv,
  type GodotDoctorEnv,
  godotQuickScanDeps,
} from "@potato-boost/adapter-godot";
import { createNodeDoctorEnv, type DoctorEnv } from "@potato-boost/adapter-web";
import {
  type CompareResult,
  compareExitCode,
  compareRuns,
} from "@potato-boost/analysis";
import {
  createArgvLauncher,
  type QuickScanDeps,
  runQuickScan,
} from "@potato-boost/core";
import { exportReport } from "@potato-boost/report";
import type { RunArtifact } from "@potato-boost/schemas";
import { loadArtifact, parseArtifactJson } from "./compare-cmd.js";
import { runCombinedDoctor } from "./doctor-gate.js";
import {
  CliExitError,
  EXIT_BUDGET_FAIL,
  EXIT_INCONCLUSIVE,
  EXIT_INFRA,
} from "./exit-codes.js";
import type { CliIo } from "./io.js";

export type CiSummary = {
  exitCode: number;
  jsonPath: string | null;
  htmlPath: string | null;
  runId: string | null;
};

export type CiOptions = {
  baseline?: string;
  out?: string;
};

function finishCi(io: CliIo, summary: CiSummary, message: string): void {
  io.stdout.write(`${JSON.stringify(summary)}\n`);
  io.stderr.write(`jsonPath\t${summary.jsonPath ?? "-"}\n`);
  io.stderr.write(`htmlPath\t${summary.htmlPath ?? "-"}\n`);
  if (summary.exitCode !== 0) {
    throw new CliExitError(summary.exitCode, message);
  }
}

async function loadCompletedArtifact(
  projectRoot: string,
  runId: string,
  relPath: string,
  store: QuickScanDeps["store"],
): Promise<RunArtifact> {
  if (store !== undefined) {
    const packed = await store.readCompleted(runId);
    const raw: unknown = JSON.parse(new TextDecoder().decode(packed.bytes));
    return parseArtifactJson(raw, runId);
  }
  return loadArtifact(join(projectRoot, ".potato", relPath));
}

export async function runCi(
  io: CliIo,
  projectPath: string,
  options: CiOptions,
  deps: {
    doctorEnv?: DoctorEnv;
    godotEnv?: GodotDoctorEnv;
    quickScan?: QuickScanDeps;
  } = {},
): Promise<void> {
  const doctorEnv = deps.doctorEnv ?? createNodeDoctorEnv();
  const godotEnv = deps.godotEnv ?? createNodeGodotEnv();
  const doctor = await runCombinedDoctor(projectPath, doctorEnv, godotEnv);
  if (!doctor.ok) {
    io.stderr.write(doctor.text);
    finishCi(
      io,
      {
        exitCode: EXIT_INFRA,
        jsonPath: null,
        htmlPath: null,
        runId: null,
      },
      "doctor blocked: required capability missing",
    );
    return;
  }

  const result = await runQuickScan(doctor.root, {
    launcher: createArgvLauncher(),
    startArgv: doctor.start,
    ...(doctor.hasGodot ? godotQuickScanDeps(doctor.root) : {}),
    ...deps.quickScan,
  });

  let jsonPath: string | null = null;
  let htmlPath: string | null = null;
  let artifact: RunArtifact | null = null;
  if (result.artifactPath !== null) {
    artifact = await loadCompletedArtifact(
      doctor.root,
      result.runId,
      result.artifactPath,
      deps.quickScan?.store,
    );
    const outDir =
      options.out ?? join(doctor.root, ".potato", "reports", result.runId);
    const exported = await exportReport(artifact, outDir);
    jsonPath = exported.jsonPath;
    htmlPath = exported.htmlPath;
  }

  const summary: CiSummary = {
    exitCode: 0,
    jsonPath,
    htmlPath,
    runId: result.runId,
  };

  if (result.status === "failed") {
    summary.exitCode = EXIT_INFRA;
    finishCi(io, summary, result.error ?? "quick scan failed");
    return;
  }
  if (result.status === "inconclusive") {
    summary.exitCode = EXIT_INCONCLUSIVE;
    finishCi(io, summary, "quick scan inconclusive");
    return;
  }
  if (result.budgetFail) {
    summary.exitCode = EXIT_BUDGET_FAIL;
    finishCi(io, summary, "budget exceeded");
    return;
  }

  if (options.baseline !== undefined) {
    if (artifact === null) {
      summary.exitCode = EXIT_INFRA;
      finishCi(io, summary, "no candidate artifact to compare");
      return;
    }
    let compared: CompareResult;
    try {
      compared = compareRuns(await loadArtifact(options.baseline), artifact);
    } catch (error) {
      if (error instanceof CliExitError) {
        summary.exitCode = error.exitCode;
        finishCi(io, summary, error.message);
        return;
      }
      throw error;
    }
    summary.exitCode = compareExitCode(compared);
    finishCi(
      io,
      summary,
      compared.comparability === "non-comparable"
        ? "runs are non-comparable"
        : compared.overall === "regressed"
          ? "compatible compare regressed"
          : "ci passed",
    );
    return;
  }

  finishCi(io, summary, "ci passed");
}
