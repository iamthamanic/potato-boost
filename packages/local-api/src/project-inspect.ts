import { parseArgvLine } from "@potato-boost/core";
import { z } from "zod";

export const inspectProjectBodySchema = z
  .object({
    root: z.string().trim().min(1).max(4096),
  })
  .strict();

const ADAPTER_ORDER = [
  "godot",
  "tauri",
  "dotnet",
  "threejs",
  "vite",
  "react",
  "web",
] as const;

export type InspectAdapterId = (typeof ADAPTER_ORDER)[number] | "unknown";

export function pickDetectedAdapter(
  candidates: readonly { kind: string; confidence: number }[],
): InspectAdapterId {
  const supported = candidates.filter(
    (candidate) => candidate.kind !== "unknown" && candidate.confidence > 0,
  );
  for (const kind of ADAPTER_ORDER) {
    if (supported.some((candidate) => candidate.kind === kind)) {
      return kind;
    }
  }
  return "unknown";
}

export function startFromPackageScripts(raw: string): string[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (typeof parsed !== "object" || parsed === null || !("scripts" in parsed)) {
    return [];
  }
  const scripts = parsed.scripts;
  if (typeof scripts !== "object" || scripts === null) {
    return [];
  }
  const record = scripts as Record<string, unknown>;
  for (const key of ["dev", "start"] as const) {
    const value = record[key];
    if (typeof value !== "string") {
      continue;
    }
    if (/[|&;<>$`]/.test(value)) {
      continue;
    }
    const argv = parseArgvLine(value);
    if (argv.length > 0) {
      return argv;
    }
  }
  return [];
}
