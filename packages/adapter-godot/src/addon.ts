import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join, resolve, sep } from "node:path";
import {
  GODOT_ADDON_DIR,
  GODOT_ADDON_FILES,
  GODOT_ADDON_PLUGIN_REL,
  GODOT_ADDON_REL,
} from "./performance.js";

const DUMP_SCRIPT = `extends Node
# Potato Boost Performance dump. Copied only after confirm. Safe to delete.

func _ready() -> void:
	var rows: Array = []
	rows.append({
		"timestampNs": Time.get_ticks_usec() * 1000,
		"timeProcessS": Performance.get_monitor(Performance.TIME_PROCESS),
		"fps": Performance.get_monitor(Performance.TIME_FPS),
		"drawCalls": Performance.get_monitor(Performance.RENDER_TOTAL_DRAW_CALLS_IN_FRAME),
		"memoryStatic": Performance.get_monitor(Performance.MEMORY_STATIC),
	})
	var payload := {
		"schemaVersion": "1.0.0",
		"source": "godot.performance",
		"samples": rows,
	}
	var file := FileAccess.open("user://potato.godot-performance.json", FileAccess.WRITE)
	if file:
		file.store_string(JSON.stringify(payload))
		file.close()
`;

const PLUGIN_CFG = `[plugin]
name="Potato Boost"
description="Optional Performance dump. Delete addons/potato_boost to clean up."
author="Potato Boost"
version="0.0.1"
script="performance_dump.gd"
`;

const ADDON_CONTENTS: Record<string, string> = {
  [GODOT_ADDON_PLUGIN_REL]: PLUGIN_CFG,
  [GODOT_ADDON_REL]: DUMP_SCRIPT,
};

export const GODOT_ADDON_CLEANUP =
  "Cleanup: delete addons/potato_boost after the run. The addon is optional.";

export type AddonFs = {
  writeFile: (path: string, contents: string) => Promise<void>;
  mkdirp: (path: string) => Promise<void>;
  rm: (path: string) => Promise<void>;
  exists: (path: string) => Promise<boolean>;
};

export type GodotAddonPreview = {
  plannedPaths: readonly string[];
  exists: boolean;
  wrote: boolean;
  skippedExisting: boolean;
  cleanup: string;
};

function insideRoot(root: string, rel: string): string {
  if (rel.includes("..") || rel.startsWith("/")) {
    throw new Error("invalid addon relative path");
  }
  const resolvedRoot = resolve(root);
  const full = resolve(join(resolvedRoot, rel));
  const prefix = resolvedRoot.endsWith(sep)
    ? resolvedRoot
    : `${resolvedRoot}${sep}`;
  if (full !== resolvedRoot && !full.startsWith(prefix)) {
    throw new Error("addon path escapes project root");
  }
  return full;
}

export function previewGodotAddon(): GodotAddonPreview {
  return {
    plannedPaths: [...GODOT_ADDON_FILES],
    exists: false,
    wrote: false,
    skippedExisting: false,
    cleanup: GODOT_ADDON_CLEANUP,
  };
}

export async function applyGodotAddon(
  root: string,
  confirm: boolean,
  fs: AddonFs,
): Promise<GodotAddonPreview> {
  const plannedPaths = [...GODOT_ADDON_FILES];
  let exists = false;
  for (const rel of GODOT_ADDON_FILES) {
    if (await fs.exists(insideRoot(root, rel))) {
      exists = true;
      break;
    }
  }
  if (!confirm) {
    return {
      plannedPaths,
      exists,
      wrote: false,
      skippedExisting: false,
      cleanup: GODOT_ADDON_CLEANUP,
    };
  }
  if (exists) {
    return {
      plannedPaths,
      exists: true,
      wrote: false,
      skippedExisting: true,
      cleanup: GODOT_ADDON_CLEANUP,
    };
  }
  for (const rel of GODOT_ADDON_FILES) {
    const path = insideRoot(root, rel);
    await fs.mkdirp(dirname(path));
    await fs.writeFile(path, ADDON_CONTENTS[rel] ?? "");
  }
  return {
    plannedPaths,
    exists: false,
    wrote: true,
    skippedExisting: false,
    cleanup: GODOT_ADDON_CLEANUP,
  };
}

export async function installGodotAddon(
  root: string,
  confirm: boolean,
  fs: AddonFs,
): Promise<{ wrote: boolean; path: string }> {
  const preview = await applyGodotAddon(root, confirm, fs);
  return { wrote: preview.wrote, path: insideRoot(root, GODOT_ADDON_REL) };
}

export async function removeGodotAddon(
  root: string,
  fs: AddonFs,
): Promise<void> {
  await fs.rm(insideRoot(root, GODOT_ADDON_DIR));
}

export function formatGodotAddonPreview(preview: GodotAddonPreview): string {
  const lines = [
    "Godot addon (optional):",
    ...preview.plannedPaths.map((path) => `  ${path}`),
    preview.cleanup,
  ];
  if (preview.skippedExisting) {
    lines.push("Existing addon left unchanged.");
  } else if (preview.wrote) {
    lines.push("Wrote addon.");
  } else {
    lines.push("No addon written. Re-run with --godot --confirm to apply.");
  }
  return `${lines.join("\n")}\n`;
}

export function createNodeAddonFs(): AddonFs {
  return {
    writeFile: (path, contents) => writeFile(path, contents, "utf8"),
    mkdirp: (path) => mkdir(path, { recursive: true }).then(() => undefined),
    rm: async (path) => {
      await rm(path, { force: true, recursive: true });
    },
    exists: async (path) => {
      try {
        await stat(path);
        return true;
      } catch {
        return false;
      }
    },
  };
}

export async function readProjectFile(
  root: string,
  name: string,
): Promise<string | null> {
  if (name.includes("..") || name.startsWith("/")) {
    return null;
  }
  try {
    return await readFile(join(root, name), "utf8");
  } catch {
    return null;
  }
}
