/**
 * Setup doctor — capability checks with concrete paths and details.
 * Route: /setup/doctor. Location: apps/dashboard/src/setup-doctor.tsx
 */
import { useCallback, useEffect, useState } from "react";
import { ApiRequestError, apiRequest, readJson } from "./api.js";

type DoctorCheck = {
  id: string;
  status: "ok" | "missing" | "unsupported";
  required: boolean;
  path: string;
  detail: string;
};

type DoctorReport = {
  root: string;
  ok: boolean;
  checks: DoctorCheck[];
};

type PageState =
  | { kind: "loading"; operation: string }
  | { kind: "error"; message: string }
  | { kind: "ready"; report: DoctorReport };

function statusLabel(status: DoctorCheck["status"]): string {
  if (status === "ok") {
    return "Ok";
  }
  if (status === "missing") {
    return "Missing";
  }
  return "Unsupported";
}

export function SetupDoctor() {
  const [page, setPage] = useState<PageState>({
    kind: "loading",
    operation: "Running doctor",
  });

  const load = useCallback(async () => {
    setPage({ kind: "loading", operation: "Running doctor" });
    try {
      const report = await readJson<DoctorReport>(
        await apiRequest("/api/v1/doctor", {
          method: "POST",
          body: "{}",
        }),
      );
      setPage({ kind: "ready", report });
    } catch (error) {
      setPage({
        kind: "error",
        message:
          error instanceof ApiRequestError
            ? error.message
            : "Local API is unreachable. Start the loopback server, then retry. This is not a budget result.",
      });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section>
      <h2>Setup doctor</h2>
      <div className="panel" aria-busy={page.kind === "loading"}>
        {page.kind === "loading" ? (
          <p className="status">
            <span aria-hidden="true">…</span>
            <span>Loading — {page.operation}…</span>
          </p>
        ) : null}
        {page.kind === "error" ? (
          <>
            <p className="status">
              <span aria-hidden="true">!</span>
              <span>Error</span>
            </p>
            <p>{page.message}</p>
            <button type="button" onClick={() => void load()}>
              Retry
            </button>
          </>
        ) : null}
        {page.kind === "ready" ? (
          <>
            <p className="status">
              <span aria-hidden="true">{page.report.ok ? "●" : "!"}</span>
              <span>{page.report.ok ? "Doctor ok" : "Doctor blocked"}</span>
            </p>
            <table className="checks">
              <caption className="muted">Capability checks</caption>
              <thead>
                <tr>
                  <th>Check</th>
                  <th>Status</th>
                  <th>Path</th>
                  <th>Detail</th>
                </tr>
              </thead>
              <tbody>
                {page.report.checks.map((check) => (
                  <tr key={check.id}>
                    <td>
                      <code>{check.id}</code>
                    </td>
                    <td>
                      <span className="status">
                        <span aria-hidden="true">
                          {check.status === "ok" ? "●" : "!"}
                        </span>
                        <span>{statusLabel(check.status)}</span>
                      </span>
                    </td>
                    <td className="mono">
                      {check.path === "" ? "—" : check.path}
                    </td>
                    <td>{check.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button type="button" onClick={() => void load()}>
              Run doctor again
            </button>
          </>
        ) : null}
      </div>
    </section>
  );
}
