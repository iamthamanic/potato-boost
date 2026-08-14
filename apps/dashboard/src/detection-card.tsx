/**
 * DetectionCard — radio target with evidence ticks and honest 0–1 confidence.
 * Used on /setup/detect (J-001). Location: apps/dashboard/src/detection-card.tsx
 */
import {
  cardTone,
  type DetectedCandidate,
  formatConfidence,
} from "./detect.js";

type DetectionCardProps = {
  candidate: DetectedCandidate;
  selected: boolean;
  ambiguous: boolean;
  onSelect: (kind: string) => void;
};

export function DetectionCard(props: DetectionCardProps) {
  const tone = cardTone(props.candidate, props.ambiguous);
  const inputId = `target-${props.candidate.kind}`;
  return (
    <label className={`detect-card${props.selected ? " is-selected" : ""}`}>
      <input
        id={inputId}
        type="radio"
        name="detected-target"
        value={props.candidate.kind}
        checked={props.selected}
        onChange={() => {
          props.onSelect(props.candidate.kind);
        }}
      />
      <span className="detect-card-body">
        <span className="detect-card-head">
          <strong>{props.candidate.kind}</strong>
          <span className="muted">
            {tone === "unsupported"
              ? "Unsupported"
              : tone === "ambiguous"
                ? "Ambiguous"
                : "Candidate"}
          </span>
        </span>
        <span className="muted mono">
          confidence {formatConfidence(props.candidate.confidence)}
        </span>
        {props.candidate.evidence.length === 0 ? (
          <span className="muted">No evidence. Override the start argv.</span>
        ) : (
          <ul className="evidence">
            {props.candidate.evidence.map((entry) => (
              <li key={`${entry.kind}-${entry.path}-${entry.detail}`}>
                <code>{entry.path}</code>
                <span className="muted"> {entry.detail}</span>
              </li>
            ))}
          </ul>
        )}
        {props.candidate.inferredStart.length > 0 ? (
          <span className="mono">
            inferred {JSON.stringify(props.candidate.inferredStart)}
          </span>
        ) : (
          <span className="muted">No inferred start argv</span>
        )}
      </span>
    </label>
  );
}
