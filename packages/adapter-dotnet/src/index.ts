export {
  collectDotnetCounters,
  createNodeCollectEnv,
  DOTNET_COUNTERS_SNAPSHOT,
  type DotnetCollectEnv,
  type DotnetCounterRow,
  type DotnetCountersSnapshot,
  dotnetCountersCollector,
  parseDotnetCountersSnapshot,
  snapshotToSamples,
} from "./collector.js";
export {
  DOTNET_MANIFEST,
  detectDotnet,
  mergeDotnetCandidates,
} from "./detect.js";
export {
  type DotnetDoctorCheck,
  type DotnetDoctorReport,
  formatDotnetDoctorReport,
  runDotnetDoctor,
} from "./doctor.js";
export { createDotnetScenarioDriver } from "./driver.js";
export {
  createNodeDotnetEnv,
  createNodeDotnetFs,
  type DotnetEnv,
  locateDotnetSdk,
} from "./env.js";
export { dotnetQuickScanDeps } from "./scan.js";
export type {
  DotnetCandidate,
  DotnetDetectResult,
  DotnetEvidence,
  DotnetFs,
} from "./types.js";
