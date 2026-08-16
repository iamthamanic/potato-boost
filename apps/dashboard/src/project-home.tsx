import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getApiBase, getRunToken } from "./session.js";

type HomeState =
  | { kind: "loading"; operation: string }
  | { kind: "ready" }
  | { kind: "error"; message: string };

export function ProjectHome() {
  const [state, setState] = useState<HomeState>({
    kind: "loading",
    operation: "Checking local API",
  });

  const load = useCallback(async () => {
    setState({ kind: "loading", operation: "Checking local API" });
    const token = getRunToken();
    const base = getApiBase();
    try {
      const response = await fetch(`${base}/api/v1/runs/probe`, {
        headers:
          token === undefined ? {} : { authorization: `Bearer ${token}` },
      });
      if (!response.ok && response.status >= 500) {
        setState({
          kind: "error",
          message: `Local API returned ${response.status}. Retry when the loopback server is up.`,
        });
        return;
      }
      setState({ kind: "ready" });
    } catch {
      setState({
        kind: "error",
        message:
          "Local API is unreachable. Start the loopback server, then retry. This is not a performance result.",
      });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section className="workspace-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Project overview</p>
          <h2>Performance workbench</h2>
          <p className="muted">
            Measure a reproducible scenario, understand the evidence, change
            code, then verify with the same setup.
          </p>
        </div>
        <Link className="button-link primary-action" to="/runs/new">
          Run scan
        </Link>
      </header>

      {state.kind === "loading" ? (
        <div className="panel" aria-busy="true">
          <p className="status">
            <span aria-hidden="true">…</span>
            <span>Loading — {state.operation}</span>
          </p>
        </div>
      ) : null}

      {state.kind === "error" ? (
        <div className="panel callout">
          <p className="status">
            <span aria-hidden="true">!</span>
            <span>Workbench unavailable</span>
          </p>
          <p>{state.message}</p>
          <button type="button" onClick={() => void load()}>
            Retry connection
          </button>
        </div>
      ) : null}

      {state.kind === "ready" ? (
        <div className="overview-grid">
          <article className="panel hero-panel">
            <p className="status">
              <span aria-hidden="true">●</span>
              <span>Ready to scan</span>
            </p>
            <h3>Start with a Quick Scan</h3>
            <p>
              Potato Boost uses the recommended local target, the Quick Scan
              scenario, and bundled web performance rules. You can review the
              exact setup before starting.
            </p>
            <div className="actions">
              <Link className="button-link" to="/runs/new">
                Review and start scan
              </Link>
              <Link className="text-link" to="/setup/detect">
                Review project setup
              </Link>
            </div>
          </article>

          <article className="panel compact-panel">
            <p className="eyebrow">Workflow</p>
            <ol className="workflow-list">
              <li>
                <strong>Scan</strong>
                <span>Measure the same scenario repeatedly.</span>
              </li>
              <li>
                <strong>Understand</strong>
                <span>Check budgets, findings, timing, and evidence.</span>
              </li>
              <li>
                <strong>Verify</strong>
                <span>Run the same setup after your code change.</span>
              </li>
            </ol>
          </article>

          <article className="panel compact-panel overview-span">
            <h3>No completed run loaded yet</h3>
            <p className="muted">
              Run quality, category budgets, prioritized findings, and test
              context appear here after a scan. Potato Boost intentionally does
              not collapse these into one performance score.
            </p>
          </article>
        </div>
      ) : null}
    </section>
  );
}
