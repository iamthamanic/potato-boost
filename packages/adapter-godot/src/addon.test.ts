import { describe, expect, it } from "vitest";
import {
  type AddonFs,
  applyGodotAddon,
  installGodotAddon,
  previewGodotAddon,
  removeGodotAddon,
} from "./addon.js";
import { GODOT_ADDON_DIR, GODOT_ADDON_REL } from "./performance.js";

function memoryFs(
  initial: ReadonlyMap<string, string> = new Map(),
): AddonFs & { files: Map<string, string> } {
  const files = new Map(initial);
  return {
    files,
    writeFile: async (path, contents) => {
      files.set(path, contents);
    },
    mkdirp: async () => undefined,
    rm: async (path) => {
      for (const key of [...files.keys()]) {
        if (key === path || key.startsWith(`${path}/`)) {
          files.delete(key);
        }
      }
    },
    exists: async (path) => files.has(path),
  };
}

describe("applyGodotAddon", () => {
  it("does not write without confirm", async () => {
    const fs = memoryFs();
    const preview = await applyGodotAddon("/tmp/godot-addon", false, fs);
    expect(preview.wrote).toBe(false);
    expect(preview.plannedPaths).toContain(GODOT_ADDON_REL);
    expect(fs.files.size).toBe(0);
    expect(previewGodotAddon().plannedPaths).toEqual(preview.plannedPaths);
  });

  it("writes under addons/potato_boost and remove deletes it", async () => {
    const fs = memoryFs();
    const result = await installGodotAddon("/tmp/godot-addon", true, fs);
    expect(result.wrote).toBe(true);
    expect(result.path.endsWith(GODOT_ADDON_REL)).toBe(true);
    expect(fs.files.has(result.path)).toBe(true);
    expect(fs.files.get(result.path)).toMatch(/Performance.get_monitor/);
    await removeGodotAddon("/tmp/godot-addon", fs);
    expect(fs.files.has(result.path)).toBe(false);
  });

  it("does not overwrite an existing addon", async () => {
    const existing = "/tmp/godot-addon/addons/potato_boost/performance_dump.gd";
    const fs = memoryFs(new Map([[existing, "old"]]));
    const preview = await applyGodotAddon("/tmp/godot-addon", true, fs);
    expect(preview.wrote).toBe(false);
    expect(preview.skippedExisting).toBe(true);
    expect(fs.files.get(existing)).toBe("old");
    expect(GODOT_ADDON_DIR).toBe("addons/potato_boost");
  });
});
