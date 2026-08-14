/**
 * RunPhaseStepper — named phases with current operation text (not a spinner-only).
 * Used on /runs/:id/live. Location: apps/dashboard/src/run-phase-stepper.tsx
 */
import { RUN_PHASES, type RunPhase } from "./run-phases.js";

type RunPhaseStepperProps = {
  current: string;
  detail: string;
};

export function RunPhaseStepper(props: RunPhaseStepperProps) {
  const currentIndex = RUN_PHASES.indexOf(props.current as RunPhase);
  return (
    <ol className="stepper">
      {RUN_PHASES.map((phase, index) => {
        const state =
          currentIndex < 0
            ? "upcoming"
            : index < currentIndex
              ? "done"
              : index === currentIndex
                ? "current"
                : "upcoming";
        return (
          <li key={phase} className={`stepper-item is-${state}`}>
            <span className="status">
              <span aria-hidden="true">
                {state === "done" ? "●" : state === "current" ? "▶" : "○"}
              </span>
              <span>{phase}</span>
            </span>
            {state === "current" ? (
              <span className="muted" aria-live="polite">
                {props.detail.length > 0
                  ? `Operation: ${props.detail}`
                  : `Operation: ${phase}`}
              </span>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
