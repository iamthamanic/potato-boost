export type GodotFs = {
  readFile: (path: string) => Promise<string>;
  readdir: (path: string) => Promise<string[]>;
  exists: (path: string) => Promise<boolean>;
};

export type GodotEvidence = {
  kind: "marker" | "manifest";
  path: string;
  detail: string;
};

export type GodotCandidate = {
  kind: "godot";
  confidence: number;
  evidence: GodotEvidence[];
};

export type GodotDetectResult = {
  root: string;
  candidate: GodotCandidate | null;
  filesTouched: readonly string[];
  wrote: false;
};
