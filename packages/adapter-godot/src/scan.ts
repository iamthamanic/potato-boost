import type { Collector } from "@potato-boost/collector-hub";
import type { ScenarioDriver } from "@potato-boost/scenario-engine";
import {
  createNodeCollectEnv,
  godotPerformanceCollector,
} from "./collector.js";
import { createGodotScenarioDriver } from "./driver.js";

export function godotQuickScanDeps(root: string): {
  collectors: readonly Collector[];
  driver: ScenarioDriver;
} {
  return {
    collectors: [godotPerformanceCollector(createNodeCollectEnv(root))],
    driver: createGodotScenarioDriver(),
  };
}
