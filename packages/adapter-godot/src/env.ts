import { stat } from "node:fs/promises";
import { delimiter, join } from "node:path";

export const EXPECTED_GODOT = "Godot 4 (config_version=5)";

export const GODOT_BIN_NAMES = ["godot4", "godot", "Godot4", "Godot"] as const;

export const GODOT_WELL_KNOWN_PATHS = [
  "/Applications/Godot.app/Contents/MacOS/Godot",
  "/Applications/Godot_4.app/Contents/MacOS/Godot",
  "/usr/local/bin/godot4",
  "/usr/local/bin/godot",
  "/opt/homebrew/bin/godot4",
  "/opt/homebrew/bin/godot",
  "/usr/bin/godot4",
  "/usr/bin/godot",
] as const;

export type GodotDoctorEnv = {
  env: NodeJS.ProcessEnv;
  pathDirs: readonly string[];
  wellKnownPaths?: readonly string[];
  exists: (path: string) => Promise<boolean>;
};

async function pathExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

export function godotEnvCandidates(env: NodeJS.ProcessEnv): string[] {
  const keys = ["GODOT_BIN", "GODOT4", "GODOT"];
  const found: string[] = [];
  for (const key of keys) {
    const value = env[key];
    if (value !== undefined && value.length > 0) {
      found.push(value);
    }
  }
  return found;
}

export function godotPathCandidates(pathDirs: readonly string[]): string[] {
  const found: string[] = [];
  for (const dir of pathDirs) {
    if (dir.length === 0) {
      continue;
    }
    for (const name of GODOT_BIN_NAMES) {
      found.push(join(dir, name));
    }
  }
  return found;
}

export async function locateGodotBinary(
  env: GodotDoctorEnv,
): Promise<{ path: string | null; checked: readonly string[] }> {
  const wellKnown = env.wellKnownPaths ?? GODOT_WELL_KNOWN_PATHS;
  const checked = [
    ...godotEnvCandidates(env.env),
    ...godotPathCandidates(env.pathDirs),
    ...wellKnown,
  ];
  for (const candidate of checked) {
    if (await env.exists(candidate)) {
      return { path: candidate, checked };
    }
  }
  return { path: null, checked };
}

export function createNodeGodotEnv(
  processEnv: NodeJS.ProcessEnv = process.env,
): GodotDoctorEnv {
  return {
    env: processEnv,
    pathDirs: (processEnv.PATH ?? "").split(delimiter),
    exists: pathExists,
  };
}
