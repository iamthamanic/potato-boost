import type {
  ScenarioDriver,
  ScenarioStep,
} from "@potato-boost/scenario-engine";

/** Walks Quick Scan phases. Does not spawn `dotnet` or write project files. */
export function createDotnetScenarioDriver(
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
