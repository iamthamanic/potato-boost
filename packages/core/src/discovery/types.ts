/** Read-only filesystem surface for discovery. Implementations must not write. */
export type DiscoveryFs = {
  readFile: (path: string) => Promise<string>;
  readdir: (path: string) => Promise<string[]>;
  exists: (path: string) => Promise<boolean>;
};

export type CandidateKind = "web" | "vite" | "react" | "threejs" | "unknown";

export type EvidenceEntry = {
  kind: "marker" | "manifest" | "dependency";
  path: string;
  detail: string;
};

export type Candidate = {
  kind: CandidateKind;
  confidence: number;
  evidence: EvidenceEntry[];
};

export type DiscoveryResult = {
  root: string;
  candidates: Candidate[];
  filesTouched: readonly string[];
  wrote: false;
};

export type Detector = {
  id: string;
  kind: CandidateKind;
  weight: number;
  detect: (fs: DiscoveryFs, root: string) => Promise<EvidenceEntry[]>;
};
