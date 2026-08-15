import type { Collector } from "@potato-boost/collector-hub";
import type { ScenarioDriver } from "@potato-boost/scenario-engine";
import { createNodeCollectEnv, dotnetCountersCollector } from "./collector.js";
import { createDotnetScenarioDriver } from "./driver.js";

export function dotnetQuickScanDeps(root: string): {
  collectors: readonly Collector[];
  driver: ScenarioDriver;
} {
  return {
    collectors: [dotnetCountersCollector(createNodeCollectEnv(root))],
    driver: createDotnetScenarioDriver(),
  };
}
