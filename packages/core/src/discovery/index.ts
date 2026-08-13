export { candidateKinds, detectProject, hasWebCandidate } from "./detect.js";
export { createNodeDiscoveryFs, resolveCanonicalRoot } from "./fs.js";
export type {
  Candidate,
  CandidateKind,
  Detector,
  DiscoveryFs,
  DiscoveryResult,
  EvidenceEntry,
} from "./types.js";
export { webDetectors } from "./web-detectors.js";
