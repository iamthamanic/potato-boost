import type {
  ScenarioDriver,
  ScenarioStep,
} from "@potato-boost/scenario-engine";

/** Walks Quick Scan phases. Does not write project files or spawn Godot. */
export function createGodotScenarioDriver(
  now: () => string = () => new Date().toISOString(),
): ScenarioDriver & { steps: ScenarioStep[] } {
  const steps: ScenarioStep[] = [];
  return {
    steps,
    execute: async (step) => {
      steps.push(step);
    },
    now,
  };
}
