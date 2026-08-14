import {
  detectGodot,
  type GodotDetectResult,
  mergeGodotCandidates,
} from "@potato-boost/adapter-godot";
import { type DiscoveryResult, detectProject } from "@potato-boost/core";
import { nodeDiscoveryFs } from "./node-fs.js";
import { webDetectors } from "./web-detectors.js";

export type CombinedCandidate = {
  kind: string;
  confidence: number;
  evidence: readonly { kind: string; path: string; detail: string }[];
};

export async function detectCombined(path: string): Promise<{
  root: string;
  wrote: false;
  candidates: CombinedCandidate[];
  filesTouched: readonly string[];
  web: DiscoveryResult;
  godot: GodotDetectResult;
}> {
  const web = await detectProject(nodeDiscoveryFs, path, webDetectors);
  const godot = await detectGodot(nodeDiscoveryFs, web.root);
  return {
    root: web.root,
    wrote: false,
    candidates: mergeGodotCandidates(web.candidates, godot.candidate),
    filesTouched: [...web.filesTouched, ...godot.filesTouched],
    web,
    godot,
  };
}
