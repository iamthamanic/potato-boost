/**
 * Run Tape — named measurement phases with explicit current operation.
 */
import { RUN_PHASES, type RunPhase } from "./run-phases.js";

type RunPhaseStepperProps = {
  current: string;
  detail: string;
};

function phaseLabel(phase: string): string {
  return phase.replaceAll("-", " ");
}

export function RunPhaseStepper(props: RunPhaseStepperProps) {
  const currentIndex = RUN_PHASES.indexOf(props.current as RunPhase);
  return (
    <div className="run-tape" aria-label="Run progress">
      <ol className="stepper">
        {RUN_PHASES.map((phase, index) => {
          const state = currentIndex < 0 ? "upcoming" : index < currentIndex ? "done" : index === currentIndex ? "current" : "upcoming";
          return (
            <li key={phase} className={`stepper-item is-${state}`} aria-current={state === "current" ? "step" : undefined}>
              <span className="run-tape-line" aria-hidden="true"><span className="run-tape-dot">{state === "done" ? "●" : state === "current" ? "▶" : "○"}</span></span>
              <span className="run-tape-label">{phaseLabel(phase)}</span>
            </li>
          );
        })}
      </ol>
      <p className="run-operation" aria-live="polite">
        <span className="eyebrow">Current operation</span>
        <strong>{props.detail.length > 0 ? props.detail : props.current}</strong>
      </p>
    </div>
  );
}
