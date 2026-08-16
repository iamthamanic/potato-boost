import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ApiRequestError, apiRequest, readJson } from "./api.js";
import {
  loadProjectRuns,
  type ProjectRunSummary,
  runSummaryLabel,
} from "./project-runs.js";
import { projectPath } from "./projects.js";

export type CompareRow = {
  name: string;
  unit: string;
  baseline: number;
  candidate: number;
  delta: number;
  deltaPct: number;
  noiseBudgetPct: number;
  withinNoiseBudget: boolean;
  verdict: string;
};

export type CompareView = {
  comparability: string;
  overall: string;
  gitDirtyVisible: boolean;
  reasons: { code: string; detail: string }[];
  metrics: CompareRow[];
};

type RunsState =
  | { kind: "loading" }
  | { kind: "ready"; runs: ProjectRunSummary[] }
  | { kind: "error"; message: string };

export function parseCompareView(raw: unknown): CompareView | undefined {
  if (typeof raw !== "object" || raw === null) return undefined;
  const record = raw as Record<string, unknown>;
  if (
    typeof record.comparability !== "string" ||
    typeof record.overall !== "string"
  )
    return undefined;
  const metrics: CompareRow[] = [];
  if (Array.isArray(record.metrics)) {
    for (const item of record.metrics) {
      if (typeof item !== "object" || item === null) continue;
      const row = item as Record<string, unknown>;
      if (
        typeof row.name !== "string" ||
        typeof row.unit !== "string" ||
        typeof row.baseline !== "number" ||
        typeof row.candidate !== "number" ||
        typeof row.delta !== "number" ||
        typeof row.deltaPct !== "number" ||
        typeof row.noiseBudgetPct !== "number" ||
        typeof row.withinNoiseBudget !== "boolean" ||
        typeof row.verdict !== "string"
      )
        continue;
      metrics.push({
        name: row.name,
        unit: row.unit,
        baseline: row.baseline,
        candidate: row.candidate,
        delta: row.delta,
        deltaPct: row.deltaPct,
        noiseBudgetPct: row.noiseBudgetPct,
        withinNoiseBudget: row.withinNoiseBudget,
        verdict: row.verdict,
      });
    }
  }
  const reasons: { code: string; detail: string }[] = [];
  if (Array.isArray(record.reasons)) {
    for (const item of record.reasons) {
      if (typeof item !== "object" || item === null) continue;
      const row = item as Record<string, unknown>;
      if (typeof row.code === "string" && typeof row.detail === "string")
        reasons.push({ code: row.code, detail: row.detail });
    }
  }
  return {
    comparability: record.comparability,
    overall: record.overall,
    gitDirtyVisible: record.gitDirtyVisible === true,
    reasons,
    metrics,
  };
}

export function CompareTable(props: { result: CompareView }) {
  const comparable = props.result.comparability === "comparable";
  return (
    <div className="compare-result">
      <div className="result-summary">
        <p className="status">
          <span aria-hidden="true">{comparable ? "●" : "!"}</span>
          <strong>
            {comparable
              ? "Runs are comparable"
              : "Runs cannot be compared reliably"}
          </strong>
        </p>
        <p>{props.result.overall}</p>
        {!comparable ? (
          <p className="muted">
            This is a compatibility result, not a performance failure.
          </p>
        ) : null}
      </div>
      {props.result.reasons.length > 0 ? (
        <ul className="reason-list">
          {props.result.reasons.map((reason) => (
            <li key={`${reason.code}:${reason.detail}`}>{reason.detail}</li>
          ))}
        </ul>
      ) : null}
      <div className="table-scroll">
        <table className="checks">
          <caption className="muted">
            Before/after measurements include the configured noise budget.
          </caption>
          <thead>
            <tr>
              <th>Metric</th>
              <th>Before</th>
              <th>After</th>
              <th>Change</th>
              <th>Noise</th>
              <th>Result</th>
            </tr>
          </thead>
          <tbody>
            {props.result.metrics.map((row) => (
              <tr key={row.name}>
                <td className="mono">{row.name}</td>
                <td>
                  {row.baseline} {row.unit}
                </td>
                <td>
                  {row.candidate} {row.unit}
                </td>
                <td>
                  {row.delta} ({row.deltaPct.toFixed(1)}%)
                </td>
                <td>{row.noiseBudgetPct}%</td>
                <td>{row.verdict}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {props.result.gitDirtyVisible ? (
        <p className="muted">
          The run fingerprint records that the working tree was dirty.
        </p>
      ) : null}
    </div>
  );
}

export function Compare() {
  const { projectId } = useParams();
  const [runsState, setRunsState] = useState<RunsState>({ kind: "loading" });
  const [baselineId, setBaselineId] = useState<string | undefined>(undefined);
  const [candidateId, setCandidateId] = useState<string | undefined>(undefined);
  const [result, setResult] = useState<CompareView | undefined>(undefined);
  const [message, setMessage] = useState<string | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (): Promise<void> => {
    if (projectId === undefined) {
      setRunsState({
        kind: "error",
        message: "Choose a project before comparing runs.",
      });
      return;
    }
    setRunsState({ kind: "loading" });
    try {
      const runs = await loadProjectRuns(projectId);
      const comparable = runs.filter((run) => run.comparable);
      setRunsState({ kind: "ready", runs });
      setCandidateId(comparable[0]?.runId);
      setBaselineId(comparable[1]?.runId);
      setResult(undefined);
      setMessage(undefined);
    } catch (caught) {
      setRunsState({
        kind: "error",
        message:
          caught instanceof ApiRequestError
            ? caught.message
            : "Local API is unreachable. Start Potato Boost and retry.",
      });
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  const runCompare = async (): Promise<void> => {
    if (
      projectId === undefined ||
      baselineId === undefined ||
      candidateId === undefined
    ) {
      return;
    }
    setBusy(true);
    setMessage(undefined);
    try {
      const parsed = parseCompareView(
        await readJson<unknown>(
          await apiRequest(
            `/api/v1/projects/${encodeURIComponent(projectId)}/compare`,
            {
              method: "POST",
              body: JSON.stringify({
                baselineRunId: baselineId,
                candidateRunId: candidateId,
              }),
            },
          ),
        ),
      );
      if (parsed === undefined) {
        setResult(undefined);
        setMessage("Compare payload is not readable.");
        return;
      }
      setResult(parsed);
    } catch (caught) {
      setResult(undefined);
      setMessage(
        caught instanceof ApiRequestError
          ? caught.status === 409
            ? "These run records do not have persisted measurement artifacts yet."
            : caught.message
          : "Local API is unreachable. Start Potato Boost and retry.",
      );
    } finally {
      setBusy(false);
    }
  };

  const confirmBaseline = async (): Promise<void> => {
    if (candidateId === undefined) {
      return;
    }
    setBusy(true);
    setMessage(undefined);
    try {
      const saved = await readJson<{ wrote: boolean }>(
        await apiRequest("/api/v1/baselines", {
          method: "POST",
          body: JSON.stringify({ runId: candidateId, confirm: true }),
        }),
      );
      setMessage(
        saved.wrote
          ? "The after run is now the baseline. The previous baseline remains in history."
          : "No files written.",
      );
    } catch (caught) {
      setMessage(
        caught instanceof ApiRequestError
          ? caught.message
          : "Baseline write failed. Retry when the loopback server is up.",
      );
    } finally {
      setBusy(false);
    }
  };

  const comparableRuns =
    runsState.kind === "ready"
      ? runsState.runs.filter((run) => run.comparable)
      : [];
  const canCompare =
    comparableRuns.length >= 2 &&
    baselineId !== undefined &&
    candidateId !== undefined &&
    baselineId !== candidateId;
  const canConfirm =
    canCompare &&
    result !== undefined &&
    result.comparability === "comparable";

  return (
    <section className="workspace-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Verify a change</p>
          <h2>Compare before and after</h2>
          <p className="muted">
            Choose two compatible measurement artifacts from this project. Runs
            from other projects never appear here.
          </p>
        </div>
      </header>

      {runsState.kind === "loading" ? (
        <div className="panel" aria-busy="true">
          <p className="status">Loading project runs…</p>
        </div>
      ) : null}

      {runsState.kind === "error" ? (
        <div className="panel callout" role="alert">
          <p>{runsState.message}</p>
          <button type="button" onClick={() => void load()}>
            Retry
          </button>
        </div>
      ) : null}

      {runsState.kind === "ready" && comparableRuns.length < 2 ? (
        <div className="panel compare-empty">
          <p className="status">
            <span aria-hidden="true">○</span>
            <strong>No comparable run pair yet</strong>
          </p>
          <p>
            This project has {runsState.runs.length}{" "}
            {runsState.runs.length === 1 ? "run record" : "run records"}, but
            fewer than two have persisted measurement artifacts available for a
            deterministic comparison.
          </p>
          <p className="muted">
            Potato Boost does not turn lifecycle-only run records into fake
            performance evidence. Artifact-backed runs will appear here
            automatically when they are available.
          </p>
          <div className="actions">
            {projectId !== undefined ? (
              <Link
                className="button-link primary-action"
                to={projectPath(projectId, "runs")}
              >
                Open Runs
              </Link>
            ) : null}
            {projectId !== undefined ? (
              <Link
                className="button-link"
                to={projectPath(projectId, "test-setup")}
              >
                Review Test Setup
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}

      {runsState.kind === "ready" && comparableRuns.length >= 2 ? (
        <div className="panel compare-panel">
          <div className="compare-pickers">
            <label className="field">
              <strong>Before run</strong>
              <span className="muted">Earlier project measurement</span>
              <select
                name="baseline-run"
                value={baselineId}
                onChange={(event) => setBaselineId(event.target.value)}
              >
                {comparableRuns.map((run) => (
                  <option key={run.runId} value={run.runId}>
                    {runSummaryLabel(run)}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <strong>After run</strong>
              <span className="muted">Measurement after your code change</span>
              <select
                name="candidate-run"
                value={candidateId}
                onChange={(event) => setCandidateId(event.target.value)}
              >
                {comparableRuns.map((run) => (
                  <option key={run.runId} value={run.runId}>
                    {runSummaryLabel(run)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="actions">
            <button
              type="button"
              onClick={() => void runCompare()}
              disabled={busy || !canCompare}
            >
              Compare runs
            </button>
            <button
              type="button"
              onClick={() => void confirmBaseline()}
              disabled={busy || !canConfirm}
            >
              Set after run as baseline
            </button>
          </div>
          {!canCompare ? (
            <p className="muted">
              Choose two different project runs before comparing.
            </p>
          ) : null}
          <details className="technical-details">
            <summary>Technical run IDs</summary>
            <dl className="technical-list">
              <div>
                <dt>Before</dt>
                <dd className="mono">{baselineId}</dd>
              </div>
              <div>
                <dt>After</dt>
                <dd className="mono">{candidateId}</dd>
              </div>
            </dl>
          </details>
          {message !== undefined ? <p role="status">{message}</p> : null}
          {result !== undefined ? <CompareTable result={result} /> : null}
        </div>
      ) : null}
    </section>
  );
}
