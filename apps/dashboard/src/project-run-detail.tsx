import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ApiRequestError, apiRequest, readJson } from "./api.js";
import { projectRunPath } from "./project-runs.js";
import { projectPath } from "./projects.js";
import { RunDetail } from "./run-detail.js";

type GuardState =
  | { kind: "loading" }
  | { kind: "ready" }
  | { kind: "error"; message: string };

export function ProjectRunDetail() {
  const { projectId, id: runId } = useParams();
  const [state, setState] = useState<GuardState>({ kind: "loading" });

  const verify = useCallback(async (): Promise<void> => {
    if (projectId === undefined || runId === undefined) {
      setState({ kind: "error", message: "Project or run id is missing." });
      return;
    }
    setState({ kind: "loading" });
    try {
      await readJson<unknown>(
        await apiRequest(projectRunPath(projectId, runId)),
      );
      setState({ kind: "ready" });
    } catch (caught) {
      setState({
        kind: "error",
        message:
          caught instanceof ApiRequestError && caught.status === 404
            ? "This run does not belong to the active project, or it no longer exists."
            : "The project run could not be verified. Retry when the Local API is available.",
      });
    }
  }, [projectId, runId]);

  useEffect(() => {
    void verify();
  }, [verify]);

  if (state.kind === "ready") {
    return <RunDetail />;
  }

  return (
    <section className="workspace-page">
      <div className="panel" aria-busy={state.kind === "loading"}>
        {state.kind === "loading" ? (
          <p className="status">Verifying project run…</p>
        ) : (
          <>
            <p className="status">
              <span aria-hidden="true">!</span>
              <strong>Run unavailable in this project</strong>
            </p>
            <p>{state.message}</p>
            {projectId !== undefined ? (
              <Link className="button-link" to={projectPath(projectId, "runs")}>
                Back to Runs
              </Link>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}
