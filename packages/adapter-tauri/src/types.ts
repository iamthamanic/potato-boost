export type TauriFs = {
  readFile: (path: string) => Promise<string>;
  readdir: (path: string) => Promise<string[]>;
  exists: (path: string) => Promise<boolean>;
};

export type TauriEvidence = {
  kind: "marker" | "manifest";
  path: string;
  detail: string;
};

export type TauriCandidate = {
  kind: "tauri";
  confidence: number;
  evidence: TauriEvidence[];
};

export type TauriDetectResult = {
  root: string;
  candidate: TauriCandidate | null;
  filesTouched: readonly string[];
  wrote: false;
};
