/**
 * RunOverview — run quality, budget-status categories, and test context. No score.
 * Used on /runs/:id Overview tab. Location: apps/dashboard/src/run-overview.tsx
 */
import {
  budgetCardsFromMetrics,
  qualityFromStatus,
  type RunArtifactView,
} from "./run-artifact.js";
import { StatusMark } from "./status-mark.js";

type RunOverviewProps = {
  artifact: RunArtifactView;
};

export function RunOverview(props: RunOverviewProps) {
  const quality = qualityFromStatus(props.artifact.status);
  const cards = budgetCardsFromMetrics(props.artifact.metrics);
  return (
    <div>
      <h3>Run quality</h3>
      <StatusMark kind={quality} />
      <p className="muted">
        Status {props.artifact.status}. This view does not compute an overall
        score.
      </p>
      <h3>Budget status</h3>
      <div className="budget-grid">
        {cards.map((card) => (
          <article key={card.category} className="budget-card">
            <h4>{card.category}</h4>
            <StatusMark kind={card.status} />
            {card.metrics.length === 0 ? (
              <p className="muted">No metric in this category.</p>
            ) : (
              <ul>
                {card.metrics.map((metric) => (
                  <li key={metric.name} className="mono">
                    {metric.name} {metric.value} {metric.unit}
                  </li>
                ))}
              </ul>
            )}
          </article>
        ))}
      </div>
      <h3>Test context</h3>
      <p className="mono">
        scenario {props.artifact.scenarioId} · profile{" "}
        {props.artifact.profileId} · host {props.artifact.hostArch} · os{" "}
        {props.artifact.osName}
      </p>
    </div>
  );
}
