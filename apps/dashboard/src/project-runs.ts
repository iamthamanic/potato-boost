import { apiRequest, readJson } from "./api.js";

export type ProjectRunSummary = {
  runId: string;
  projectId: string;
  status: "queued" | "running" | "completed" | "cancelled" | "failed";
  baselineEligible: boolean;
  createdAt: string;
  scenarioId: string;
  scenarioLabel: string;
  targetId: string;
  profileId: string;
  rulePackIds: string[];
  comparable: boolean;
};

function projectRunsPath(projectId: string): string {
  return `/api/v1/projects/${encodeURIComponent(projectId)}/runs`;
}

export function projectRunPath(projectId: string, runId: string): string {
  return `${projectRunsPath(projectId)}/${encodeURIComponent(runId)}`;
}

export async function loadProjectRuns(
  projectId: string,
): Promise<ProjectRunSummary[]> {
  const body = await readJson<{ runs: ProjectRunSummary[] }>(
    await apiRequest(projectRunsPath(projectId)),
  );
  return body.runs;
}

export async function startProjectRun(
  projectId: string,
): Promise<{ runId: string }> {
  return readJson<{ runId: string }>(
    await apiRequest(projectRunsPath(projectId), {
      method: "POST",
      headers: { "idempotency-key": `ui-${Date.now()}` },
      body: JSON.stringify({ scenarioId: "quick-scan" }),
    }),
  );
}

export function runSummaryLabel(run: ProjectRunSummary): string {
  const when = new Date(run.createdAt).toLocaleString();
  return `${run.scenarioLabel} · ${when} · ${run.status}`;
}
