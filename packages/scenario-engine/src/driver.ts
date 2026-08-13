import type { ScenarioStep } from "./schema.js";

/** Contract for a scenario driver. Implementations must not write project files. */
export type ScenarioDriver = {
  execute: (step: ScenarioStep) => Promise<void>;
  now: () => string;
};

export function isTimeoutError(error: unknown): boolean {
  return (
    error instanceof Error && error.message.toLowerCase().includes("timeout")
  );
}
