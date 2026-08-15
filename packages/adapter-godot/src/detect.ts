import { adapterManifestSchema } from "@potato-boost/adapter-sdk";
import type {
  GodotCandidate,
  GodotDetectResult,
  GodotEvidence,
  GodotFs,
} from "./types.js";

export const GODOT_MANIFEST = adapterManifestSchema.parse({
  id: "godot",
  version: "0.0.1",
  capabilities: ["detect", "doctor", "collector", "scenario-driver"],
  detectors: ["project.godot", ".gd", ".csproj"],
  schemaVersion: "1.0.0",
});

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export async function detectGodot(
  fs: GodotFs,
  root: string,
): Promise<GodotDetectResult> {
  const filesTouched: string[] = [];
  const evidence: GodotEvidence[] = [];
  const projectPath = `${root}/project.godot`;
  const hasProject = await fs.exists(projectPath);
  if (hasProject) {
    filesTouched.push("project.godot");
    evidence.push({
      kind: "manifest",
      path: "project.godot",
      detail: "Godot project file",
    });
  }
  let names: string[] = [];
  try {
    names = await fs.readdir(root);
  } catch {
    names = [];
  }
  for (const name of names) {
    if (name.endsWith(".gd")) {
      filesTouched.push(name);
      evidence.push({
        kind: "marker",
        path: name,
        detail: "GDScript source",
      });
    }
    if (hasProject && name.endsWith(".csproj")) {
      filesTouched.push(name);
      evidence.push({
        kind: "marker",
        path: name,
        detail: "Godot C# project",
      });
    }
  }
  if (evidence.length === 0) {
    return { root, candidate: null, filesTouched, wrote: false };
  }
  const candidate: GodotCandidate = {
    kind: "godot",
    confidence: clamp(0.4 * Math.min(evidence.length, 3)),
    evidence,
  };
  return { root, candidate, filesTouched, wrote: false };
}

export function mergeGodotCandidates<
  T extends { kind: string; confidence: number },
>(
  candidates: readonly T[],
  godot: GodotCandidate | null,
): Array<T | GodotCandidate> {
  if (godot === null) {
    return [...candidates];
  }
  return [
    ...candidates.filter((candidate) => candidate.kind !== "unknown"),
    godot,
  ];
}
