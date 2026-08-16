/**
 * System check — actionable capability checks before a scan.
 */
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ApiRequestError, apiRequest, readJson } from "./api.js";

type DoctorCheck = {
  id: string;
  status: "ok" | "missing" | "unsupported";
  required: boolean;
  path: string;
  detail: string;
};

type DoctorReport = { root: string; ok: boolean; checks: DoctorCheck[] };
type PageState =
  | { kind: "loading"; operation: string }
  | { kind: "error"; message: string }
  | { kind: "ready"; report: DoctorReport };

function statusLabel(status: DoctorCheck["status"]): string {
  if (status === "ok") return "Ready";
  if (status === "missing") return "Needs attention";
  return "Unsupported";
}

function checkLabel(id: string): string {
  return id.replaceAll("-", " ").replaceAll("_", " ");
}

export function SetupDoctor() {
  const [page, setPage] = useState<PageState>({
    kind: "loading",
    operation: "Checking scan requirements",
  });

  const load = useCallback(async () => {
    setPage({ kind: "loading", operation: "Checking scan requirements" });
    try {
      const report = await readJson<DoctorReport>(
        await apiRequest("/api/v1/doctor", { method: "POST", body: "{}" }),
      );
      setPage({ kind: "ready", report });
    } catch (error) {
      setPage({
        kind: "error",
        message:
          error instanceof ApiRequestError
            ? error.message
            : "Local API is unreachable. Start the loopback server, then retry. This is not a performance result.",
      });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section className="narrow-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Project setup · step 2</p>
          <h2>System check</h2>
          <p className="muted">
            Potato Boost verifies that this machine can start and measure the
            configured project before a scan begins.
          </p>
        </div>
      </header>
      <div className="panel" aria-busy={page.kind === "loading"}>
        {page.kind === "loading" ? (
          <p className="status">
            <span aria-hidden="true">…</span>
            <span>Loading — {page.operation}</span>
          </p>
        ) : null}
        {page.kind === "error" ? (
          <div className="callout" role="alert">
            <p className="status">
              <span aria-hidden="true">!</span>
              <span>System check could not run</span>
            </p>
            <p>{page.message}</p>
            <button type="button" onClick={() => void load()}>
              Retry system check
            </button>
          </div>
        ) : null}
        {page.kind === "ready" ? (
          <>
            <div className="system-check-head">
              <p className="status">
                <span aria-hidden="true">{page.report.ok ? "●" : "!"}</span>
                <span>
                  {page.report.ok ? "Ready to scan" : "Setup needs attention"}
                </span>
              </p>
              <p className="muted mono">{page.report.root}</p>
            </div>
            <ul className="check-list">
              {page.report.checks.map((check) => (
                <li key={check.id} className="check-row">
                  <span className="status">
                    <span aria-hidden="true">
                      {check.status === "ok" ? "●" : "!"}
                    </span>
                    <strong>{checkLabel(check.id)}</strong>
                  </span>
                  <span>{statusLabel(check.status)}</span>
                  <p>{check.detail}</p>
                  {check.path !== "" ? <code>{check.path}</code> : null}
                </li>
              ))}
            </ul>
            <div className="next-action">
              <button type="button" onClick={() => void load()}>
                Check again
              </button>
              {page.report.ok ? (
                <Link className="button-link primary-action" to="/runs/new">
                  Continue to Quick Scan
                </Link>
              ) : (
                <span className="muted">
                  Resolve required checks before continuing.
                </span>
              )}
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}
