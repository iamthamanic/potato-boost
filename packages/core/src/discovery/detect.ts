import { assertInsideRoot, resolveCanonicalRoot } from "./fs.js";
import type {
  Candidate,
  CandidateKind,
  Detector,
  DiscoveryFs,
  DiscoveryResult,
} from "./types.js";

const MANIFEST_CANDIDATES = [
  "package.json",
  "vite.config.ts",
  "vite.config.js",
  "index.html",
];

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function aggregateConfidence(weight: number, evidenceCount: number): number {
  return clamp(weight * Math.min(evidenceCount, 3));
}

export async function detectProject(
  fs: DiscoveryFs,
  root: string,
  detectors: readonly Detector[],
): Promise<DiscoveryResult> {
  const filesTouched: string[] = [];
  const canonicalRoot = resolveCanonicalRoot(root);

  for (const name of MANIFEST_CANDIDATES) {
    const path = assertInsideRoot(canonicalRoot, name);
    if (await fs.exists(path)) {
      filesTouched.push(name);
    }
  }

  const candidates: Candidate[] = [];
  for (const detector of detectors) {
    const evidence = await detector.detect(fs, canonicalRoot);
    if (evidence.length > 0) {
      candidates.push({
        kind: detector.kind,
        confidence: aggregateConfidence(detector.weight, evidence.length),
        evidence,
      });
    }
  }

  if (candidates.length === 0) {
    candidates.push({ kind: "unknown", confidence: 0, evidence: [] });
  }

  return { root: canonicalRoot, candidates, filesTouched, wrote: false };
}

export function hasWebCandidate(candidates: readonly Candidate[]): boolean {
  return candidates.some((c) => c.kind === "web" && c.confidence > 0);
}

export function candidateKinds(result: DiscoveryResult): CandidateKind[] {
  return result.candidates.map((c) => c.kind);
}
