import type { ScenarioDriver } from "./driver.js";
import { redactScenarioStep, scrubJsonText } from "./redact.js";
import type {
  PhaseEvent,
  Scenario,
  ScenarioRunResult,
  ScenarioStep,
} from "./schema.js";

async function runPhase(
  driver: ScenarioDriver,
  steps: readonly ScenarioStep[],
  phase: PhaseEvent["phase"],
  events: PhaseEvent[],
  timeoutMs: number,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;

  for (const step of steps) {
    if (Date.now() > deadline) {
      throw new Error(`timeout in phase ${phase}`);
    }
    const safe = redactScenarioStep(step);
    events.push({ phase, at: driver.now(), detail: safe.action });
    const remaining = deadline - Date.now();
    if (remaining <= 0) {
      throw new Error(`timeout in phase ${phase}`);
    }
    await Promise.race([
      driver.execute(safe),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error(`timeout in phase ${phase}`)),
          remaining,
        ),
      ),
    ]);
  }
}

export async function runScenario(
  driver: ScenarioDriver,
  scenario: Scenario,
): Promise<ScenarioRunResult> {
  const events: PhaseEvent[] = [];
  let baselineEligible = true;
  let error: string | undefined;

  try {
    await runPhase(driver, scenario.setup, "setup", events, scenario.timeoutMs);
    await runPhase(
      driver,
      scenario.warmup,
      "warmup",
      events,
      scenario.timeoutMs,
    );

    for (let i = 0; i < scenario.repetitions; i++) {
      await runPhase(
        driver,
        scenario.measure,
        "measure",
        events,
        scenario.timeoutMs,
      );
    }

    await runPhase(
      driver,
      scenario.cleanup,
      "cleanup",
      events,
      scenario.timeoutMs,
    );
  } catch (cause) {
    baselineEligible = false;
    error = scrubJsonText(
      cause instanceof Error ? cause.message : "scenario failed",
    );
  }

  return {
    scenarioId: scenario.id,
    scenarioVersion: scenario.version,
    events,
    baselineEligible,
    ...(error !== undefined ? { error } : {}),
  };
}
