/**
 * StatusMark — icon plus text for quality/budget states (never color-only).
 * Used on run overview and budget cards. Location: apps/dashboard/src/status-mark.tsx
 */
import type { StatusKind } from "./run-artifact.js";

const LABELS: Record<StatusKind, { icon: string; text: string }> = {
  valid: { icon: "●", text: "Valid" },
  pass: { icon: "●", text: "Pass" },
  failed: { icon: "!", text: "Failed" },
  incomplete: { icon: "○", text: "Incomplete" },
  inconclusive: { icon: "?", text: "Inconclusive" },
};

type StatusMarkProps = {
  kind: StatusKind;
};

export function StatusMark(props: StatusMarkProps) {
  const label = LABELS[props.kind];
  return (
    <p className="status">
      <span aria-hidden="true">{label.icon}</span>
      <span>{label.text}</span>
    </p>
  );
}
