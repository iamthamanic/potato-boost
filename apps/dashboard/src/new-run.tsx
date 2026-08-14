/**
 * New run — start a Quick Scan stub and open the live view.
 * Route: /runs/new. Location: apps/dashboard/src/new-run.tsx
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ApiRequestError, apiRequest, readJson } from "./api.js";

export function NewRun() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  const start = async (): Promise<void> => {
    setBusy(true);
    setError(undefined);
    try {
      const created = await readJson<{ runId: string }>(
        await apiRequest("/api/v1/runs", {
          method: "POST",
          headers: { "idempotency-key": `ui-${Date.now()}` },
          body: JSON.stringify({
            targetId: "web-threejs",
            scenarioId: "quick-scan",
            profileId: "budget-local",
          }),
        }),
      );
      navigate(`/runs/${created.runId}/live`);
    } catch (caught) {
      setError(
        caught instanceof ApiRequestError
          ? caught.message
          : "Local API is unreachable. Start the loopback server, then retry.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <section>
      <h2>New run</h2>
      <div className="panel">
        <p>
          Start a Quick Scan against the bound project. Watch phases on Live
          run.
        </p>
        <button type="button" onClick={() => void start()} disabled={busy}>
          Start Quick Scan
        </button>
        {error !== undefined ? (
          <p className="status">
            <span aria-hidden="true">!</span>
            <span>Error</span>
            {` ${error}`}
          </p>
        ) : null}
      </div>
    </section>
  );
}
