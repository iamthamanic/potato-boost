import {
  detectGodot,
  type GodotDetectResult,
  mergeGodotCandidates,
} from "@potato-boost/adapter-godot";
import {
  detectTauri,
  mergeTauriCandidates,
  type TauriDetectResult,
} from "@potato-boost/adapter-tauri";
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
  tauri: TauriDetectResult;
}> {
  const web = await detectProject(nodeDiscoveryFs, path, webDetectors);
  const godot = await detectGodot(nodeDiscoveryFs, web.root);
  const tauri = await detectTauri(nodeDiscoveryFs, web.root);
  return {
    root: web.root,
    wrote: false,
    candidates: mergeTauriCandidates(
      mergeGodotCandidates(web.candidates, godot.candidate),
      tauri.candidate,
    ),
    filesTouched: [
      ...web.filesTouched,
      ...godot.filesTouched,
      ...tauri.filesTouched,
    ],
    web,
    godot,
    tauri,
  };
}
