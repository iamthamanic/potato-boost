import type { ScenarioDriver } from "./driver.js";
import type { ScenarioStep } from "./schema.js";

/** Fake driver for tests. Records steps, never touches disk. */
export function createFakeDriver(): ScenarioDriver & { steps: ScenarioStep[] } {
  const steps: ScenarioStep[] = [];
  return {
    steps,
    execute: async (step) => {
      steps.push(step);
    },
    now: () => new Date().toISOString(),
  };
}
