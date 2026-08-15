import { describe, expect, it } from "vitest";
import { type AddonFs, installGodotAddon, removeGodotAddon } from "./addon.js";
import { GODOT_ADDON_REL } from "./performance.js";

function memoryFs(): AddonFs & { files: Map<string, string> } {
  const files = new Map<string, string>();
  return {
    files,
    writeFile: async (path, contents) => {
      files.set(path, contents);
    },
    mkdirp: async () => undefined,
    rm: async (path) => {
      files.delete(path);
    },
  };
}

describe("installGodotAddon", () => {
  it("does not write without confirm", async () => {
    const fs = memoryFs();
    const result = await installGodotAddon("/tmp/godot-addon", false, fs);
    expect(result.wrote).toBe(false);
    expect(fs.files.size).toBe(0);
  });

  it("writes under addons/potato-boost and remove deletes it", async () => {
    const fs = memoryFs();
    const result = await installGodotAddon("/tmp/godot-addon", true, fs);
    expect(result.wrote).toBe(true);
    expect(result.path.endsWith(GODOT_ADDON_REL)).toBe(true);
    expect(fs.files.has(result.path)).toBe(true);
    expect(fs.files.get(result.path)).toMatch(/Performance.get_monitor/);
    await removeGodotAddon("/tmp/godot-addon", fs);
    expect(fs.files.has(result.path)).toBe(false);
  });
});
