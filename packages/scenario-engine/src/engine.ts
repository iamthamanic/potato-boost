import type { ScenarioDriver } from "./driver.js";
import { redactScenarioStep, scrubJsonText } from "./redact.js";
import type {
  PhaseEvent,
  Scenario,
  ScenarioRunResult,
  ScenarioStep,
} from "./schema.js";

export const SCENARIO_ABORTED = "aborted";

function abortError(): Error {
  return new Error(SCENARIO_ABORTED);
}

function whenAborted(signal: AbortSignal): Promise<never> {
  return new Promise((_, reject) => {
    if (signal.aborted) {
      reject(abortError());
      return;
    }
    signal.addEventListener("abort", () => reject(abortError()), {
      once: true,
    });
  });
}

async function runPhase(
  driver: ScenarioDriver,
  steps: readonly ScenarioStep[],
  phase: PhaseEvent["phase"],
  events: PhaseEvent[],
  timeoutMs: number,
  signal?: AbortSignal,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;

  for (const step of steps) {
    if (signal?.aborted === true) {
      throw abortError();
    }
    if (Date.now() > deadline) {
      throw new Error(`timeout in phase ${phase}`);
    }
    const safe = redactScenarioStep(step);
    events.push({ phase, at: driver.now(), detail: safe.action });
    const remaining = deadline - Date.now();
    if (remaining <= 0) {
      throw new Error(`timeout in phase ${phase}`);
    }
    const racers: Promise<unknown>[] = [
      driver.execute(safe),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error(`timeout in phase ${phase}`)),
          remaining,
        ),
      ),
    ];
    if (signal !== undefined) {
      racers.push(whenAborted(signal));
    }
    await Promise.race(racers);
  }
}

export async function runScenario(
  driver: ScenarioDriver,
  scenario: Scenario,
  signal?: AbortSignal,
): Promise<ScenarioRunResult> {
  const events: PhaseEvent[] = [];
  let baselineEligible = true;
  let error: string | undefined;

  try {
    await runPhase(
      driver,
      scenario.setup,
      "setup",
      events,
      scenario.timeoutMs,
      signal,
    );
    await runPhase(
      driver,
      scenario.warmup,
      "warmup",
      events,
      scenario.timeoutMs,
      signal,
    );

    for (let i = 0; i < scenario.repetitions; i++) {
      await runPhase(
        driver,
        scenario.measure,
        "measure",
        events,
        scenario.timeoutMs,
        signal,
      );
    }

    await runPhase(
      driver,
      scenario.cleanup,
      "cleanup",
      events,
      scenario.timeoutMs,
      signal,
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
