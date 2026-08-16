import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ApiRequestError } from "./api.js";
import { useProjects } from "./project-context.js";
import {
  loadProjectRuns,
  type ProjectRunSummary,
  startProjectRun,
} from "./project-runs.js";
import {
  adapterLabel,
  projectPath,
  rulePackLabel,
  targetProfileLabel,
} from "./projects.js";

type RunsState =
  | { kind: "loading" }
  | { kind: "ready"; runs: ProjectRunSummary[] }
  | { kind: "error"; message: string };

export function NewRun() {
  const navigate = useNavigate();
  const { projectId } = useParams();
  const { projects } = useProjects();
  const project = projects.find((candidate) => candidate.id === projectId);
  const [state, setState] = useState<RunsState>({ kind: "loading" });
  const [error, setError] = useState<string | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (): Promise<void> => {
    if (projectId === undefined) {
      setState({
        kind: "error",
        message: "Choose a project before opening Runs.",
      });
      return;
    }
    setState({ kind: "loading" });
    try {
      setState({ kind: "ready", runs: await loadProjectRuns(projectId) });
    } catch (caught) {
      setState({
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

  const start = async (): Promise<void> => {
    if (project === undefined) {
      return;
    }
    setBusy(true);
    setError(undefined);
    try {
      const created = await startProjectRun(project.id);
      navigate(
        `${projectPath(project.id, "runs")}/${encodeURIComponent(created.runId)}/live`,
      );
    } catch (caught) {
      setError(
        caught instanceof ApiRequestError
          ? caught.message
          : "Local API is unreachable. Start Potato Boost and retry.",
      );
    } finally {
      setBusy(false);
    }
  };

  if (project === undefined) {
    return (
      <section className="workspace-page">
        <div className="panel callout">
          <h2>Runs need a project</h2>
          <p>Choose a registered project before starting a measurement.</p>
          <Link className="button-link" to="/projects">
            Open projects
          </Link>
        </div>
      </section>
    );
  }

  const setupPath = projectPath(project.id, "test-setup");

  return (
    <section className="workspace-page runs-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">{project.name}</p>
          <h2>Runs</h2>
          <p className="muted">
            Measure this project with the same saved setup, then return here to
            review its run history.
          </p>
        </div>
      </header>

      <div className="overview-grid run-workspace-grid">
        <article className="panel hero-panel run-setup-card">
          <p className="eyebrow">Recommended run</p>
          <h3>Quick Scan</h3>
          <p>
            Start a short local measurement using this project's saved target
            profile and rule selection.
          </p>
          <dl className="setup-summary">
            <div>
              <dt>Scenario</dt>
              <dd>Quick Scan</dd>
            </div>
            <div>
              <dt>Project type</dt>
              <dd>{adapterLabel(project.adapterId)}</dd>
            </div>
            <div>
              <dt>Target profile</dt>
              <dd>{targetProfileLabel(project.targetProfileId)}</dd>
            </div>
            <div>
              <dt>Rules</dt>
              <dd>{project.rulePackIds.map(rulePackLabel).join(", ")}</dd>
            </div>
          </dl>

          <details className="technical-details">
            <summary>Technical run context</summary>
            <dl className="technical-list">
              <div>
                <dt>Project ID</dt>
                <dd className="mono">{project.id}</dd>
              </div>
              <div>
                <dt>Adapter ID</dt>
                <dd className="mono">{project.adapterId}</dd>
              </div>
              <div>
                <dt>Profile ID</dt>
                <dd className="mono">{project.targetProfileId}</dd>
              </div>
              <div>
                <dt>Rule pack IDs</dt>
                <dd className="mono">{project.rulePackIds.join(", ")}</dd>
              </div>
            </dl>
          </details>

          <div className="next-action">
            <div>
              <strong>Ready to measure</strong>
              <p className="muted">
                The server resolves this project again before creating the run.
              </p>
            </div>
            <button type="button" onClick={() => void start()} disabled={busy}>
              {busy ? "Starting scan…" : "Start Quick Scan"}
            </button>
          </div>

          {error !== undefined ? (
            <div className="callout" role="alert">
              <p className="status">
                <span aria-hidden="true">!</span>
                <span>Scan did not start</span>
              </p>
              <p>{error}</p>
              <Link className="text-link" to={setupPath}>
                Review Test Setup
              </Link>
            </div>
          ) : null}
        </article>

        <article className="panel run-history-panel">
          <div className="run-history-heading">
            <div>
              <p className="eyebrow">Project history</p>
              <h3>Recent runs</h3>
            </div>
            <button
              type="button"
              onClick={() => void load()}
              disabled={state.kind === "loading"}
            >
              Refresh
            </button>
          </div>

          {state.kind === "loading" ? (
            <p className="status" aria-live="polite">
              Loading project runs…
            </p>
          ) : null}

          {state.kind === "error" ? (
            <div className="callout" role="alert">
              <p>{state.message}</p>
              <button type="button" onClick={() => void load()}>
                Retry
              </button>
            </div>
          ) : null}

          {state.kind === "ready" && state.runs.length === 0 ? (
            <div className="run-empty">
              <strong>No runs yet</strong>
              <p className="muted">
                Start Quick Scan to create the first measurement record for this
                project.
              </p>
            </div>
          ) : null}

          {state.kind === "ready" && state.runs.length > 0 ? (
            <ol className="run-history-list">
              {state.runs.map((run) => (
                <li key={run.runId} className="run-history-item">
                  <div className="run-history-copy">
                    <div className="run-history-title">
                      <strong>{run.scenarioLabel}</strong>
                      <span className="run-status">{run.status}</span>
                    </div>
                    <span className="muted">
                      {new Date(run.createdAt).toLocaleString()} ·{" "}
                      {targetProfileLabel(run.profileId)}
                    </span>
                    <span className="muted">
                      {run.rulePackIds.map(rulePackLabel).join(", ")}
                    </span>
                  </div>
                  <div className="run-history-actions">
                    {run.status === "running" ? (
                      <Link
                        className="button-link"
                        to={`${projectPath(project.id, "runs")}/${encodeURIComponent(run.runId)}/live`}
                      >
                        Open live run
                      </Link>
                    ) : null}
                    {run.comparable ? (
                      <Link
                        className="button-link"
                        to={`${projectPath(project.id, "runs")}/${encodeURIComponent(run.runId)}`}
                      >
                        Open result
                      </Link>
                    ) : null}
                    {!run.comparable && run.status !== "running" ? (
                      <span className="muted">No persisted result artifact</span>
                    ) : null}
                    <details className="technical-details inline-details">
                      <summary>Run ID</summary>
                      <code>{run.runId}</code>
                    </details>
                  </div>
                </li>
              ))}
            </ol>
          ) : null}
        </article>
      </div>
    </section>
  );
}
