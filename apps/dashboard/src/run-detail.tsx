/**
 * RunDetail — Overview, Findings (six blocks), and a Raw stub for a completed run.
 * Route: /runs/:id. Location: apps/dashboard/src/run-detail.tsx
 */
import { useCallback, useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { ApiRequestError, apiRequest, readJson } from "./api.js";
import { EvidencePanel } from "./evidence-panel.js";
import { FindingDetail } from "./finding-detail.js";
import { parseRunArtifactView, type RunArtifactView } from "./run-artifact.js";
import { RunOverview } from "./run-overview.js";
import { RunTimeline } from "./run-timeline.js";
import { parseSamples, type SampleView } from "./timeline.js";

type TabId = "overview" | "timeline" | "findings" | "raw";

function parseTab(value: string | null): TabId {
  if (value === "findings" || value === "raw" || value === "timeline") {
    return value;
  }
  return "overview";
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
    if (id === "overview") {
      next.delete("tab");
    } else {
      next.set("tab", id);
    }
    setSearch(next, { replace: true });
  };

  const load = useCallback(async (): Promise<void> => {
    if (runId === undefined) {
      setPage({ kind: "empty", message: "Run id is missing." });
      return;
    }
    setPage({ kind: "loading", operation: "Loading run artifact" });
    try {
      const raw: unknown = await readJson<unknown>(
        await apiRequest(`/api/v1/runs/${runId}/artifact`),
      );
      const artifact = parseRunArtifactView(raw);
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
        ) {
          throw sampleError;
        }
      }
      setPage({ kind: "ready", artifact, samples });
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 404) {
        setPage({
          kind: "empty",
          message:
            "No run artifact found. Open a completed run or start a new run from New run.",
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
    <section>
      <h2>Run detail</h2>
      <div className="panel" aria-busy={page.kind === "loading"}>
        {page.kind === "loading" ? (
          <p className="status">
            <span aria-hidden="true">…</span>
            <span>Loading — {page.operation}…</span>
          </p>
        ) : null}
        {page.kind === "empty" ? (
          <>
            <p className="status">
              <span aria-hidden="true">○</span>
              <span>Empty</span>
            </p>
            <p>{page.message}</p>
            <p className="muted">
              Next action is named above. Nothing is scored as a single number.
            </p>
          </>
        ) : null}
        {page.kind === "error" ? (
          <>
            <p className="status">
              <span aria-hidden="true">!</span>
              <span>Error</span>
            </p>
            <p>{page.message}</p>
            {page.retryable ? (
              <button type="button" onClick={() => void load()}>
                Retry
              </button>
            ) : null}
          </>
        ) : null}
        {page.kind === "ready" ? (
          <>
            <p className="muted mono">run {page.artifact.runId}</p>
            <div className="tabs" role="tablist" aria-label="Run detail">
              <TabButton
                id="overview"
                current={tab}
                onSelect={setTab}
                label="Overview"
              />
              <TabButton
                id="timeline"
                current={tab}
                onSelect={setTab}
                label="Timeline"
              />
              <TabButton
                id="findings"
                current={tab}
                onSelect={setTab}
                label="Findings"
              />
              <TabButton id="raw" current={tab} onSelect={setTab} label="Raw" />
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
                  <p className="muted">No findings in this artifact.</p>
                ) : (
                  <>
                    <table className="checks">
                      <caption className="muted">Findings in this run</caption>
                      <thead>
                        <tr>
                          <th>Finding</th>
                          <th>Rule</th>
                          <th>Severity</th>
                          <th>Confidence</th>
                        </tr>
                      </thead>
                      <tbody>
                        {page.artifact.findings.map((finding) => (
                          <tr key={finding.findingId}>
                            <td>
                              <label>
                                <input
                                  type="radio"
                                  name="finding"
                                  value={finding.findingId}
                                  checked={selectedId === finding.findingId}
                                  onChange={() => {
                                    setSelectedId(finding.findingId);
                                  }}
                                />{" "}
                                <span className="mono">
                                  {finding.findingId}
                                </span>
                              </label>
                            </td>
                            <td className="mono">{finding.ruleId}</td>
                            <td>{finding.severity}</td>
                            <td>{finding.confidence}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
                  </>
                )}
              </div>
            ) : null}
            {tab === "raw" ? (
              <div id="panel-raw" role="tabpanel">
                <p className="muted">
                  Raw JSON is not loaded in this slice. Open the artifact file
                  from the run directory.
                </p>
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
      aria-controls={`panel-${props.id}`}
      className={selected ? "tab is-active" : "tab"}
      onClick={() => {
        props.onSelect(props.id);
      }}
    >
      {props.label}
    </button>
  );
}
