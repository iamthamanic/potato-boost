/**
 * Run result — summary, findings, timeline, and technical data for a completed run.
 */
import { useCallback, useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ApiRequestError, apiRequest, readJson } from "./api.js";
import { EvidencePanel } from "./evidence-panel.js";
import { FindingDetail } from "./finding-detail.js";
import {
  parseRunArtifactView,
  qualityFromStatus,
  type RunArtifactView,
} from "./run-artifact.js";
import { RunOverview } from "./run-overview.js";
import { RunTimeline } from "./run-timeline.js";
import { parseSamples, type SampleView } from "./timeline.js";

type TabId = "overview" | "timeline" | "findings" | "raw";

function parseTab(value: string | null): TabId {
  if (value === "findings" || value === "raw" || value === "timeline")
    return value;
  return "overview";
}

function findingTitle(ruleId: string): string {
  const raw = ruleId.split(".").at(-1) ?? ruleId;
  return raw.replaceAll("_", " ").replaceAll("-", " ");
}

type PageState =
  | { kind: "loading"; operation: string }
  | { kind: "error"; message: string; retryable: boolean }
  | { kind: "empty"; message: string }
  | { kind: "ready"; artifact: RunArtifactView; samples: SampleView[] };

export function RunDetail() {
  const params = useParams();
  const runId = params.id;
  const [search, setSearch] = useSearchParams();
  const tab = parseTab(search.get("tab"));
  const [page, setPage] = useState<PageState>({
    kind: "loading",
    operation: "Loading run artifact",
  });
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);

  const setTab = (id: TabId): void => {
    const next = new URLSearchParams(search);
    if (id === "overview") next.delete("tab");
    else next.set("tab", id);
    setSearch(next, { replace: true });
  };

  const load = useCallback(async (): Promise<void> => {
    if (runId === undefined) {
      setPage({ kind: "empty", message: "Run id is missing." });
      return;
    }
    setPage({ kind: "loading", operation: "Loading run artifact" });
    try {
      const artifact = parseRunArtifactView(
        await readJson<unknown>(
          await apiRequest(`/api/v1/runs/${runId}/artifact`),
        ),
      );
      if (artifact === undefined) {
        setPage({
          kind: "error",
          message:
            "The artifact payload is not readable. Retry after the loopback server serves a schema-valid run.",
          retryable: true,
        });
        return;
      }
      setSelectedId(artifact.findings[0]?.findingId);
      let samples: SampleView[] = [];
      try {
        samples = parseSamples(
          await readJson<unknown>(
            await apiRequest(`/api/v1/runs/${runId}/samples`),
          ),
        );
      } catch (sampleError) {
        if (
          !(
            sampleError instanceof ApiRequestError && sampleError.status === 404
          )
        )
          throw sampleError;
      }
      setPage({ kind: "ready", artifact, samples });
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 404) {
        setPage({
          kind: "empty",
          message: "No completed run was found. Start a scan to create one.",
        });
        return;
      }
      setPage({
        kind: "error",
        message:
          error instanceof ApiRequestError
            ? error.message
            : "Local API is unreachable. Start the loopback server, then retry.",
        retryable: true,
      });
    }
  }, [runId]);

  useEffect(() => {
    void load();
  }, [load]);

  const selected =
    page.kind === "ready"
      ? page.artifact.findings.find(
          (finding) => finding.findingId === selectedId,
        )
      : undefined;

  return (
    <section className="workspace-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Run result</p>
          <h2>Quick Scan</h2>
          {page.kind === "ready" ? (
            <p className="muted">
              {new Date(page.artifact.startedAt).toLocaleString()} ·{" "}
              {page.artifact.scenarioId} · {page.artifact.profileId}
            </p>
          ) : null}
        </div>
        <Link className="button-link primary-action" to="/runs/new">
          Run same scan again
        </Link>
      </header>
      <div
        className="panel run-detail-panel"
        aria-busy={page.kind === "loading"}
      >
        {page.kind === "loading" ? (
          <p className="status">
            <span aria-hidden="true">…</span>
            <span>Loading — {page.operation}</span>
          </p>
        ) : null}
        {page.kind === "empty" ? (
          <div className="callout">
            <p className="status">
              <span aria-hidden="true">○</span>
              <span>No result</span>
            </p>
            <p>{page.message}</p>
            <Link className="text-link" to="/runs/new">
              Start Quick Scan
            </Link>
          </div>
        ) : null}
        {page.kind === "error" ? (
          <div className="callout" role="alert">
            <p className="status">
              <span aria-hidden="true">!</span>
              <span>Run result unavailable</span>
            </p>
            <p>{page.message}</p>
            {page.retryable ? (
              <button type="button" onClick={() => void load()}>
                Retry
              </button>
            ) : null}
          </div>
        ) : null}
        {page.kind === "ready" ? (
          <>
            <div className="result-bar">
              <p className="status">
                <span aria-hidden="true">
                  {qualityFromStatus(page.artifact.status) === "valid"
                    ? "●"
                    : "!"}
                </span>
                <strong>
                  Run quality: {qualityFromStatus(page.artifact.status)}
                </strong>
              </p>
              <span>
                {page.artifact.findings.length}{" "}
                {page.artifact.findings.length === 1 ? "finding" : "findings"}
              </span>
              <details className="technical-details inline-details">
                <summary>Technical context</summary>
                <p className="mono">Run {page.artifact.runId}</p>
                <p className="mono">
                  Rules {page.artifact.rulePackIds.join(", ") || "none"}
                </p>
              </details>
            </div>
            <div className="tabs" role="tablist" aria-label="Run result">
              <TabButton
                id="overview"
                current={tab}
                onSelect={setTab}
                label="Summary"
              />
              <TabButton
                id="findings"
                current={tab}
                onSelect={setTab}
                label={`Findings ${page.artifact.findings.length}`}
              />
              <TabButton
                id="timeline"
                current={tab}
                onSelect={setTab}
                label="Timeline"
              />
              <TabButton
                id="raw"
                current={tab}
                onSelect={setTab}
                label="Technical data"
              />
            </div>
            {tab === "overview" ? (
              <div id="panel-overview" role="tabpanel">
                <RunOverview artifact={page.artifact} />
              </div>
            ) : null}
            {tab === "timeline" ? (
              <div
                id="panel-timeline"
                role="tabpanel"
                className="timeline-layout"
              >
                <RunTimeline samples={page.samples} />
                <EvidencePanel artifact={page.artifact} />
              </div>
            ) : null}
            {tab === "findings" ? (
              <div id="panel-findings" role="tabpanel">
                {page.artifact.findings.length === 0 ? (
                  <div className="callout">
                    <p className="status">
                      <span aria-hidden="true">●</span>
                      <span>No deterministic findings</span>
                    </p>
                    <p className="muted">
                      Review category budgets and data quality before treating
                      this as proof that no performance issue exists.
                    </p>
                  </div>
                ) : (
                  <div className="findings-layout">
                    <div
                      className="finding-list"
                      role="radiogroup"
                      aria-label="Findings in this run"
                    >
                      {page.artifact.findings.map((finding) => (
                        <label
                          key={finding.findingId}
                          className={
                            selectedId === finding.findingId
                              ? "finding-row is-selected"
                              : "finding-row"
                          }
                        >
                          <input
                            type="radio"
                            name="finding"
                            value={finding.findingId}
                            checked={selectedId === finding.findingId}
                            onChange={() => setSelectedId(finding.findingId)}
                            aria-label={finding.findingId}
                          />
                          <span>
                            <strong>{findingTitle(finding.ruleId)}</strong>
                            <small>
                              {finding.severity} impact · {finding.confidence}{" "}
                              confidence
                            </small>
                          </span>
                        </label>
                      ))}
                    </div>
                    {selected === undefined ? (
                      <p className="muted">Select a finding to inspect.</p>
                    ) : (
                      <FindingDetail
                        finding={selected}
                        metrics={page.artifact.metrics}
                        evidence={page.artifact.evidence}
                        scenarioId={page.artifact.scenarioId}
                        startedAt={page.artifact.startedAt}
                        profileId={page.artifact.profileId}
                        rulePackIds={page.artifact.rulePackIds}
                      />
                    )}
                  </div>
                )}
              </div>
            ) : null}
            {tab === "raw" ? (
              <div id="panel-raw" role="tabpanel">
                <h3>Technical data</h3>
                <p className="muted">
                  Raw JSON remains in the local run directory. This view keeps
                  technical identifiers separate from the decision-oriented
                  summary.
                </p>
                <dl className="technical-list">
                  <div>
                    <dt>Run ID</dt>
                    <dd className="mono">{page.artifact.runId}</dd>
                  </div>
                  <div>
                    <dt>Scenario</dt>
                    <dd className="mono">{page.artifact.scenarioId}</dd>
                  </div>
                  <div>
                    <dt>Profile</dt>
                    <dd className="mono">{page.artifact.profileId}</dd>
                  </div>
                </dl>
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </section>
  );
}

function TabButton(props: {
  id: TabId;
  current: TabId;
  label: string;
  onSelect: (id: TabId) => void;
}) {
  const selected = props.current === props.id;
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      className={selected ? "tab is-active" : "tab"}
      onClick={() => props.onSelect(props.id)}
    >
      {props.label}
    </button>
  );
}
