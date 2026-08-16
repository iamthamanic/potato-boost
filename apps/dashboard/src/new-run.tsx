/**
 * New run — review the recommended Quick Scan before starting it.
 */
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ApiRequestError, apiRequest, readJson } from "./api.js";

const QUICK_SCAN = {
  targetId: "web-threejs",
  scenarioId: "quick-scan",
  profileId: "budget-local",
} as const;

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
          body: JSON.stringify(QUICK_SCAN),
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
    <section className="narrow-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Recommended run</p>
          <h2>Quick Scan</h2>
          <p className="muted">A short local measurement designed to produce the first actionable finding without configuration work.</p>
        </div>
      </header>

      <div className="panel run-setup-card">
        <dl className="setup-summary">
          <div><dt>Scenario</dt><dd>Quick Scan</dd></div>
          <div><dt>Target</dt><dd>This machine · Web / Three.js</dd></div>
          <div><dt>Profile</dt><dd>Local performance budget</dd></div>
          <div><dt>Rules</dt><dd>Bundled web performance rules</dd></div>
        </dl>

        <details className="technical-details">
          <summary>Advanced run details</summary>
          <dl className="technical-list">
            <div><dt>Scenario ID</dt><dd className="mono">{QUICK_SCAN.scenarioId}</dd></div>
            <div><dt>Target ID</dt><dd className="mono">{QUICK_SCAN.targetId}</dd></div>
            <div><dt>Profile ID</dt><dd className="mono">{QUICK_SCAN.profileId}</dd></div>
          </dl>
        </details>

        <div className="next-action">
          <div>
            <strong>Ready to measure</strong>
            <p className="muted">The live view will show prepare, warm-up, measurement, analysis, and report phases.</p>
          </div>
          <button type="button" onClick={() => void start()} disabled={busy}>
            {busy ? "Starting scan…" : "Start Quick Scan"}
          </button>
        </div>

        {error !== undefined ? (
          <div className="callout" role="alert">
            <p className="status"><span aria-hidden="true">!</span><span>Scan did not start</span></p>
            <p>{error}</p>
            <Link className="text-link" to="/setup/doctor">Open system check</Link>
          </div>
        ) : null}
      </div>
    </section>
  );
}
