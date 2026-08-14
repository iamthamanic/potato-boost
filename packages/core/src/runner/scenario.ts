import type { Scenario } from "@potato-boost/scenario-engine";

/** Smoke Quick Scan: three measure repetitions. Not representative gameplay. */
export const QUICK_SCAN: Scenario = {
  id: "quick-scan",
  version: "1.0.0",
  setup: [{ action: "prepare" }],
  warmup: [{ action: "warmup" }],
  measure: [{ action: "measure" }],
  cleanup: [{ action: "cleanup" }],
  repetitions: 3,
  timeoutMs: 30_000,
  markers: ["smoke"],
};
