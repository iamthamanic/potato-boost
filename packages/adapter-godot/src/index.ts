export {
  type AddonFs,
  createNodeAddonFs,
  installGodotAddon,
  readProjectFile,
  removeGodotAddon,
} from "./addon.js";
export {
  collectGodotPerformance,
  createNodeCollectEnv,
  type GodotCollectEnv,
  godotPerformanceCollector,
  hasValidGodotSnapshot,
  parseGodotPerformanceSnapshot,
  snapshotToSamples,
} from "./collector.js";
export { detectGodot, GODOT_MANIFEST, mergeGodotCandidates } from "./detect.js";
export {
  formatGodotDoctorReport,
  type GodotDoctorCheck,
  type GodotDoctorReport,
  runGodotDoctor,
} from "./doctor.js";
export { createGodotScenarioDriver } from "./driver.js";
export {
  createNodeGodotEnv,
  EXPECTED_GODOT,
  GODOT_BIN_NAMES,
  GODOT_WELL_KNOWN_PATHS,
  type GodotDoctorEnv,
  godotEnvCandidates,
  godotPathCandidates,
  locateGodotBinary,
} from "./env.js";
export {
  GODOT_ADDON_REL,
  GODOT_PERFORMANCE_SNAPSHOT,
  type GodotPerformanceRow,
  type GodotPerformanceSnapshot,
} from "./performance.js";
export { godotQuickScanDeps } from "./scan.js";
export type {
  GodotCandidate,
  GodotDetectResult,
  GodotEvidence,
  GodotFs,
} from "./types.js";
