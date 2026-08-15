import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve, sep } from "node:path";
import { GODOT_ADDON_REL } from "./performance.js";

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

export type AddonFs = {
  writeFile: (path: string, contents: string) => Promise<void>;
  mkdirp: (path: string) => Promise<void>;
  rm: (path: string) => Promise<void>;
};

function addonPath(root: string): string {
  const resolvedRoot = resolve(root);
  if (GODOT_ADDON_REL.includes("..") || GODOT_ADDON_REL.startsWith("/")) {
    throw new Error("invalid addon relative path");
  }
  const full = resolve(join(resolvedRoot, GODOT_ADDON_REL));
  const prefix = resolvedRoot.endsWith(sep)
    ? resolvedRoot
    : `${resolvedRoot}${sep}`;
  if (full !== resolvedRoot && !full.startsWith(prefix)) {
    throw new Error("addon path escapes project root");
  }
  return full;
}

export async function installGodotAddon(
  root: string,
  confirm: boolean,
  fs: AddonFs,
): Promise<{ wrote: boolean; path: string }> {
  const path = addonPath(root);
  if (!confirm) {
    return { wrote: false, path };
  }
  await fs.mkdirp(dirname(path));
  await fs.writeFile(path, DUMP_SCRIPT);
  return { wrote: true, path };
}

export async function removeGodotAddon(
  root: string,
  fs: AddonFs,
): Promise<void> {
  await fs.rm(addonPath(root));
}

export function createNodeAddonFs(): AddonFs {
  return {
    writeFile: (path, contents) => writeFile(path, contents, "utf8"),
    mkdirp: (path) => mkdir(path, { recursive: true }).then(() => undefined),
    rm: async (path) => {
      await rm(path, { force: true });
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
