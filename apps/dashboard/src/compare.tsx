/**
 * Compare — hard compare when locks match; baseline only after Confirm.
 * Route: /compare. Location: apps/dashboard/src/compare.tsx
 */
import { useState } from "react";
import { ApiRequestError, apiRequest, readJson } from "./api.js";

export const GOLDEN_RUN_ID = "01J9GOLDENV100000000000000";
export const COMPARE_CANDIDATE_ID = "01J9COMPARECAND000000000000";
export const COMPARE_DEBUG_ID = "01J9COMPAREDBG000000000000";

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

export function parseCompareView(raw: unknown): CompareView | undefined {
  if (typeof raw !== "object" || raw === null) {
    return undefined;
  }
  const record = raw as Record<string, unknown>;
  if (
    typeof record.comparability !== "string" ||
    typeof record.overall !== "string"
  ) {
    return undefined;
  }
  const metrics: CompareRow[] = [];
  if (Array.isArray(record.metrics)) {
    for (const item of record.metrics) {
      if (typeof item !== "object" || item === null) {
        continue;
      }
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
      ) {
        continue;
      }
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
      if (typeof item !== "object" || item === null) {
        continue;
      }
      const row = item as Record<string, unknown>;
      if (typeof row.code === "string" && typeof row.detail === "string") {
        reasons.push({ code: row.code, detail: row.detail });
      }
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
  return (
    <div>
      <p className="status">
        <span aria-hidden="true">
          {props.result.comparability === "comparable" ? "●" : "!"}
        </span>
        <span>
          {props.result.comparability} — {props.result.overall}
        </span>
      </p>
      {props.result.gitDirtyVisible ? (
        <p className="muted">Git dirty is visible on a fingerprint.</p>
      ) : null}
      {props.result.comparability === "non-comparable" ? (
        <p>Hard compare is blocked. This is not a budget fail.</p>
      ) : null}
      <table className="checks">
        <caption className="muted">
          Absolute values, delta, and noise budget
        </caption>
        <thead>
          <tr>
            <th>Metric</th>
            <th>Baseline</th>
            <th>Candidate</th>
            <th>Delta</th>
            <th>Noise</th>
            <th>Verdict</th>
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
  );
}

export function Compare() {
  const [baselineId, setBaselineId] = useState(GOLDEN_RUN_ID);
  const [candidateId, setCandidateId] = useState(COMPARE_CANDIDATE_ID);
  const [result, setResult] = useState<CompareView | undefined>(undefined);
  const [message, setMessage] = useState<string | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  const runCompare = async (): Promise<void> => {
    setBusy(true);
    setMessage(undefined);
    try {
      const parsed = parseCompareView(
        await readJson<unknown>(
          await apiRequest("/api/v1/compare", {
            method: "POST",
            body: JSON.stringify({
              baselineRunId: baselineId,
              candidateRunId: candidateId,
            }),
          }),
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
          ? caught.message
          : "Local API is unreachable. Start the loopback server, then retry.",
      );
    } finally {
      setBusy(false);
    }
  };

  const confirmBaseline = async (): Promise<void> => {
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
          ? `Baseline set to ${candidateId}. Previous id stays in history.`
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

  const canConfirm =
    result !== undefined &&
    result.comparability === "comparable" &&
    candidateId !== baselineId;

  return (
    <section>
      <h2>Compare</h2>
      <div className="panel">
        <p>
          Hard compare needs matching scenario, profile, adapter major, runtime,
          hardware class, and build mode.
        </p>
        <label className="field">
          Baseline
          <input
            className="mono"
            value={baselineId}
            onChange={(event) => {
              setBaselineId(event.target.value);
            }}
            spellCheck={false}
            autoComplete="off"
            name="baseline-run"
          />
        </label>
        <label className="field">
          Candidate
          <input
            className="mono"
            value={candidateId}
            onChange={(event) => {
              setCandidateId(event.target.value);
            }}
            spellCheck={false}
            autoComplete="off"
            name="candidate-run"
          />
        </label>
        <div className="actions">
          <button
            type="button"
            onClick={() => void runCompare()}
            disabled={busy}
          >
            Compare
          </button>
          <button
            type="button"
            onClick={() => {
              setCandidateId(COMPARE_DEBUG_ID);
            }}
            disabled={busy}
          >
            Use debug candidate
          </button>
          <button
            type="button"
            onClick={() => void confirmBaseline()}
            disabled={busy || !canConfirm}
          >
            Confirm baseline
          </button>
        </div>
        {canConfirm ? null : (
          <p className="muted">
            Confirm baseline stays disabled until a comparable completed
            candidate is compared.
          </p>
        )}
        {message !== undefined ? <p>{message}</p> : null}
        {result !== undefined ? <CompareTable result={result} /> : null}
      </div>
    </section>
  );
}
