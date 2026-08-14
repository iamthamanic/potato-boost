/**
 * EvidencePanel — raw vs derived vs source lists for the selected run.
 * Used on /runs/:id Timeline tab. Location: apps/dashboard/src/evidence-panel.tsx
 */
import { isAllowedSourceUri, type RunArtifactView } from "./run-artifact.js";

type EvidencePanelProps = {
  artifact: RunArtifactView;
};

export function EvidencePanel(props: EvidencePanelProps) {
  const sources = props.artifact.findings.flatMap((finding) =>
    finding.sourceCandidates.filter((source) => isAllowedSourceUri(source.uri)),
  );
  return (
    <aside className="evidence-panel">
      <h3>Evidence</h3>
      <section>
        <h4>Raw</h4>
        <ul>
          <li className="mono">samples.jsonl</li>
        </ul>
      </section>
      <section>
        <h4>Derived</h4>
        {props.artifact.evidence.length === 0 ? (
          <p className="muted">No derived evidence in this artifact.</p>
        ) : (
          <ul>
            {props.artifact.evidence.map((row) => (
              <li key={row.evidenceId}>{row.calculation}</li>
            ))}
          </ul>
        )}
      </section>
      <section>
        <h4>Source</h4>
        {sources.length === 0 ? (
          <p className="muted">No source candidates in this artifact.</p>
        ) : (
          <ul>
            {sources.map((source) => (
              <li key={`${source.uri}:${source.line ?? 0}`} className="mono">
                {source.uri}
                {source.line === null ? "" : `:${source.line}`}
              </li>
            ))}
          </ul>
        )}
      </section>
    </aside>
  );
}
