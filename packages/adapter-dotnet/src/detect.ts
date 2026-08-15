import { adapterManifestSchema } from "@potato-boost/adapter-sdk";
import type {
  DotnetCandidate,
  DotnetDetectResult,
  DotnetEvidence,
  DotnetFs,
} from "./types.js";

export const DOTNET_MANIFEST = adapterManifestSchema.parse({
  id: "dotnet",
  version: "0.0.1",
  capabilities: ["detect", "doctor", "collector", "scenario-driver"],
  detectors: [".csproj", ".sln"],
  schemaVersion: "1.0.0",
});

const UNITY_VERSION = "ProjectSettings/ProjectVersion.txt";
const GODOT_PROJECT = "project.godot";

function isProjectFile(name: string): boolean {
  return name.endsWith(".csproj") || name.endsWith(".sln");
}

export async function detectDotnet(
  fs: DotnetFs,
  root: string,
): Promise<DotnetDetectResult> {
  const filesTouched: string[] = [];
  const evidence: DotnetEvidence[] = [];

  const unityMarker = `${root}/${UNITY_VERSION}`;
  if (await fs.exists(unityMarker)) {
    filesTouched.push(UNITY_VERSION);
    return { root, candidate: null, filesTouched, wrote: false };
  }

  const godotMarker = `${root}/${GODOT_PROJECT}`;
  if (await fs.exists(godotMarker)) {
    filesTouched.push(GODOT_PROJECT);
    return { root, candidate: null, filesTouched, wrote: false };
  }

  let names: string[];
  try {
    names = await fs.readdir(root);
  } catch {
    return { root, candidate: null, filesTouched, wrote: false };
  }

  const projectFiles = names.filter(isProjectFile).sort();
  for (const name of projectFiles) {
    filesTouched.push(name);
    evidence.push({
      kind: name.endsWith(".sln") ? "manifest" : "marker",
      path: name,
      detail: name.endsWith(".sln")
        ? "Visual Studio solution"
        : "MSBuild project",
    });
  }

  if (evidence.length === 0) {
    return { root, candidate: null, filesTouched, wrote: false };
  }

  const candidate: DotnetCandidate = {
    kind: "dotnet",
    confidence: evidence.some((item) => item.path.endsWith(".csproj"))
      ? 0.9
      : 0.7,
    evidence,
  };
  return { root, candidate, filesTouched, wrote: false };
}

export function mergeDotnetCandidates<
  T extends { kind: string; confidence: number },
>(
  candidates: readonly T[],
  dotnet: DotnetCandidate | null,
): Array<T | DotnetCandidate> {
  if (dotnet === null) {
    return [...candidates];
  }
  return [
    ...candidates.filter((candidate) => candidate.kind !== "unknown"),
    dotnet,
  ];
}
