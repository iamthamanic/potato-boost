import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import {
  applyBaseline,
  type BaselinesFile,
  baselineGate,
  type CompareResult,
  compareExitCode,
  compareRuns,
  emptyBaselines,
} from "@potato-boost/analysis";
import { type RunArtifact, runArtifactSchema } from "@potato-boost/schemas";
import { CliExitError, EXIT_USAGE } from "./exit-codes.js";
import type { CliIo } from "./io.js";

export function parseArtifactJson(raw: unknown, label: string): RunArtifact {
  const parsed = runArtifactSchema.safeParse(raw);
  if (!parsed.success) {
    throw new CliExitError(EXIT_USAGE, `invalid artifact ${label}`);
  }
  return parsed.data;
}

export async function loadArtifact(path: string): Promise<RunArtifact> {
  let raw: unknown;
  try {
    raw = JSON.parse(await readFile(path, "utf8"));
  } catch {
    throw new CliExitError(EXIT_USAGE, `cannot read artifact ${path}`);
  }
  return parseArtifactJson(raw, path);
}

function baselinesPath(root: string): string {
  return join(root, ".potato", "baselines.json");
}

async function loadBaselines(root: string): Promise<BaselinesFile> {
  try {
    const raw: unknown = JSON.parse(
      await readFile(baselinesPath(root), "utf8"),
    );
    if (typeof raw !== "object" || raw === null) {
      return emptyBaselines();
    }
    const record = raw as Record<string, unknown>;
    if (!Array.isArray(record.current) || !Array.isArray(record.history)) {
      return emptyBaselines();
    }
    return {
      current: record.current,
      history: record.history,
    } as BaselinesFile;
  } catch {
    return emptyBaselines();
  }
}

export async function runFileCompare(
  io: CliIo,
  baselinePath: string,
  candidatePath: string,
): Promise<CompareResult> {
  const result = compareRuns(
    await loadArtifact(baselinePath),
    await loadArtifact(candidatePath),
  );
  io.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  const code = compareExitCode(result);
  if (code !== 0) {
    throw new CliExitError(
      code,
      result.comparability === "non-comparable"
        ? "runs are non-comparable"
        : "compatible compare regressed",
    );
  }
  return result;
}

export async function runSetBaseline(
  io: CliIo,
  artifactPath: string,
  root: string,
  confirm: boolean,
): Promise<void> {
  const artifact = await loadArtifact(artifactPath);
  const gate = baselineGate(artifact);
  if (!gate.ok) {
    throw new CliExitError(EXIT_USAGE, gate.message);
  }
  const nextRef = {
    targetId: artifact.lockedInputs.target.id,
    scenarioId: artifact.lockedInputs.scenario.id,
    profileId: artifact.lockedInputs.profile.id,
    runId: artifact.run.runId,
    setAt: new Date().toISOString().replace(/\.\d+Z$/, "Z"),
  };
  if (!confirm) {
    io.stdout.write(
      `Would set baseline ${nextRef.runId}. No files written. Re-run with --confirm to apply.\n`,
    );
    return;
  }
  const next = applyBaseline(await loadBaselines(root), nextRef);
  const path = baselinesPath(root);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  io.stdout.write(`Wrote ${path}\n`);
}
