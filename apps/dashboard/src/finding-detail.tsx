/**
 * FindingDetail — six PRD §10 blocks for one finding, including ruleId and confidence.
 * Used on /runs/:id Findings tab. Location: apps/dashboard/src/finding-detail.tsx
 */
import {
  type EvidenceView,
  type FindingView,
  isAllowedSourceUri,
  type MetricView,
  relatedMetrics,
} from "./run-artifact.js";

type FindingDetailProps = {
  finding: FindingView;
  metrics: MetricView[];
  evidence: EvidenceView[];
  scenarioId: string;
  startedAt: string;
  profileId: string;
  rulePackIds: string[];
};

export function FindingDetail(props: FindingDetailProps) {
  const observed = relatedMetrics(props.finding, props.metrics);
  const linkedEvidence = props.evidence.filter((row) =>
    props.finding.evidenceIds.includes(row.evidenceId),
  );
  const sources = props.finding.sourceCandidates.filter((source) =>
    isAllowedSourceUri(source.uri),
  );
  const packs =
    props.rulePackIds.length > 0
      ? props.rulePackIds.join(", ")
      : "the locked rule pack";

  return (
    <article className="finding-detail">
      <header>
        <p className="finding-title">{props.finding.findingId}</p>
        <p className="muted">
          ruleId <span className="mono">{props.finding.ruleId}</span>
          {" · "}
          severity {props.finding.severity}
          {" · "}
          confidence {props.finding.confidence}
        </p>
      </header>
      <section>
        <h3>Observed</h3>
        <p>
          Finding {props.finding.findingId} ({props.finding.severity}).
        </p>
        {observed.length === 0 ? (
          <p className="muted">No related metrics in this artifact.</p>
        ) : (
          <ul>
            {observed.map((metric) => (
              <li key={metric.name} className="mono">
                {metric.name} {metric.value} {metric.unit}
              </li>
            ))}
          </ul>
        )}
      </section>
      <section>
        <h3>Budget or baseline</h3>
        <p>
          No budget recorded for this finding. Measurements are listed without a
          pass or fail claim.
        </p>
        {observed.map((metric) => (
          <p key={`budget-${metric.name}`} className="mono">
            {metric.name} {metric.value} {metric.unit}
          </p>
        ))}
      </section>
      <section>
        <h3>When in the scenario</h3>
        <p>
          Scenario <span className="mono">{props.scenarioId}</span> started at{" "}
          <span className="mono">{props.startedAt}</span>.
        </p>
      </section>
      <section>
        <h3>Supporting signals</h3>
        {linkedEvidence.length === 0 && sources.length === 0 ? (
          <p className="muted">No supporting signals in this artifact.</p>
        ) : (
          <ul>
            {linkedEvidence.map((row) => (
              <li key={row.evidenceId}>{row.calculation}</li>
            ))}
            {sources.map((source) => (
              <li key={`${source.uri}:${source.line ?? 0}`} className="mono">
                {source.uri}
                {source.line === null ? "" : `:${source.line}`}
              </li>
            ))}
          </ul>
        )}
      </section>
      <section>
        <h3>Plausible change class</h3>
        <p>Not classified in this artifact.</p>
      </section>
      <section>
        <h3>How to verify</h3>
        <p>
          Re-run scenario {props.scenarioId} with profile {props.profileId} and{" "}
          {packs}.
        </p>
      </section>
    </article>
  );
}
