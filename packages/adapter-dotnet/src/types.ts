export type DotnetFs = {
  readFile: (path: string) => Promise<string>;
  readdir: (path: string) => Promise<string[]>;
  exists: (path: string) => Promise<boolean>;
};

export type DotnetEvidence = {
  kind: "marker" | "manifest";
  path: string;
  detail: string;
};

export type DotnetCandidate = {
  kind: "dotnet";
  confidence: number;
  evidence: DotnetEvidence[];
};

export type DotnetDetectResult = {
  root: string;
  candidate: DotnetCandidate | null;
  filesTouched: readonly string[];
  wrote: false;
};
