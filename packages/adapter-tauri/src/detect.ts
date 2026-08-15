import { adapterManifestSchema } from "@potato-boost/adapter-sdk";
import type {
  TauriCandidate,
  TauriDetectResult,
  TauriEvidence,
  TauriFs,
} from "./types.js";

export const TAURI_MANIFEST = adapterManifestSchema.parse({
  id: "tauri",
  version: "0.0.1",
  capabilities: ["detect", "doctor"],
  detectors: [
    "src-tauri/tauri.conf.json",
    "tauri.conf.json",
    "tauri.conf.json5",
  ],
  schemaVersion: "1.0.0",
});

export const TAURI_CONF_FILES = [
  "src-tauri/tauri.conf.json",
  "src-tauri/tauri.conf.json5",
  "src-tauri/tauri.conf.toml",
  "tauri.conf.json",
  "tauri.conf.json5",
] as const;

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export async function detectTauri(
  fs: TauriFs,
  root: string,
): Promise<TauriDetectResult> {
  const filesTouched: string[] = [];
  const evidence: TauriEvidence[] = [];
  for (const rel of TAURI_CONF_FILES) {
    const path = `${root}/${rel}`;
    if (await fs.exists(path)) {
      filesTouched.push(rel);
      evidence.push({
        kind: "manifest",
        path: rel,
        detail: "Tauri config",
      });
    }
  }
  if (await fs.exists(`${root}/src-tauri`)) {
    filesTouched.push("src-tauri");
    evidence.push({
      kind: "marker",
      path: "src-tauri",
      detail: "Tauri native crate directory",
    });
  }
  if (evidence.length === 0) {
    return { root, candidate: null, filesTouched, wrote: false };
  }
  const candidate: TauriCandidate = {
    kind: "tauri",
    confidence: clamp(0.4 * Math.min(evidence.length, 3)),
    evidence,
  };
  return { root, candidate, filesTouched, wrote: false };
}

export function mergeTauriCandidates<
  T extends { kind: string; confidence: number },
>(
  candidates: readonly T[],
  tauri: TauriCandidate | null,
): Array<T | TauriCandidate> {
  if (tauri === null) {
    return [...candidates];
  }
  return [
    ...candidates.filter((candidate) => candidate.kind !== "unknown"),
    tauri,
  ];
}
