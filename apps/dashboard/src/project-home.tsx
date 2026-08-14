import { useCallback, useEffect, useState } from "react";
import { getApiBase, getRunToken } from "./session.js";

type HomeState =
  | { kind: "loading"; operation: string }
  | { kind: "empty" }
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
      setState({ kind: "empty" });
    } catch {
      setState({
        kind: "error",
        message:
          "Local API is unreachable. Start the loopback server, then retry. This is not a budget result.",
      });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section>
      <h2>Project</h2>
      <div className="panel" aria-busy={state.kind === "loading"}>
        {state.kind === "loading" ? (
          <p className="status">
            <span aria-hidden="true">…</span>
            <span>Loading — {state.operation}</span>
          </p>
        ) : null}
        {state.kind === "error" ? (
          <>
            <p className="status">
              <span aria-hidden="true">!</span>
              <span>Error</span>
            </p>
            <p>{state.message}</p>
            <button type="button" onClick={() => void load()}>
              Retry
            </button>
          </>
        ) : null}
        {state.kind === "empty" ? (
          <>
            <p className="status">
              <span aria-hidden="true">○</span>
              <span>Empty</span>
            </p>
            <p>
              No validated scenario yet. Next action: run a Quick Scan from the
              CLI.
            </p>
            <p className="muted">
              Run quality, budgets, findings, and test context will appear here.
              There is no overall performance score.
            </p>
          </>
        ) : null}
      </div>
    </section>
  );
}
