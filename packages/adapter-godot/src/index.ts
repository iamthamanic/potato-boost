export { detectGodot, GODOT_MANIFEST, mergeGodotCandidates } from "./detect.js";
export {
  formatGodotDoctorReport,
  type GodotDoctorCheck,
  type GodotDoctorReport,
  runGodotDoctor,
} from "./doctor.js";
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
export type {
  GodotCandidate,
  GodotDetectResult,
  GodotEvidence,
  GodotFs,
} from "./types.js";
