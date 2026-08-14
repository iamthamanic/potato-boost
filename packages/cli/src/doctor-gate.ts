import {
  createNodeGodotEnv,
  formatGodotDoctorReport,
  type GodotDoctorEnv,
  runGodotDoctor,
} from "@potato-boost/adapter-godot";
import {
  type DoctorEnv,
  formatDoctorReport,
  runWebDoctor,
} from "@potato-boost/adapter-web";
import {
  type CandidateKind,
  createNodeConfigFs,
  resolveRunStart,
} from "@potato-boost/core";
import { detectCombined } from "./detect-combined.js";

export async function runCombinedDoctor(
  path: string,
  doctorEnv: DoctorEnv,
  godotEnv: GodotDoctorEnv = createNodeGodotEnv(),
): Promise<{
  root: string;
  ok: boolean;
  text: string;
  start: string[];
  kinds: CandidateKind[];
  hasGodot: boolean;
}> {
  const combined = await detectCombined(path);
  const kinds = combined.web.candidates.map((candidate) => candidate.kind);
  const start = await resolveRunStart(
    createNodeConfigFs(),
    combined.root,
    kinds,
  );
  const chunks: string[] = [];
  let ok = true;
  if (combined.godot.candidate !== null) {
    const godot = await runGodotDoctor(combined.root, godotEnv);
    chunks.push(formatGodotDoctorReport(godot).trimEnd());
    ok = ok && godot.ok;
  }
  const web = await runWebDoctor(combined.root, kinds, doctorEnv, { start });
  chunks.push(formatDoctorReport(web).trimEnd());
  ok = ok && web.ok;
  return {
    root: combined.root,
    ok,
    text: `${chunks.join("\n")}\n`,
    start,
    kinds,
    hasGodot: combined.godot.candidate !== null,
  };
}
