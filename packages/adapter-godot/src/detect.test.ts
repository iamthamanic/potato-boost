import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { detectGodot, GODOT_MANIFEST, mergeGodotCandidates } from "./detect.js";
import type { GodotFs } from "./types.js";

function memoryFs(files: Record<string, string>): GodotFs {
  return {
    readFile: async (path) => {
      const value = files[path];
      if (value === undefined) {
        throw new Error(`missing ${path}`);
      }
      return value;
    },
    readdir: async (path) => {
      const prefix = `${path}/`;
      return Object.keys(files)
        .filter((name) => name.startsWith(prefix))
        .map((name) => name.slice(prefix.length))
        .filter((name) => !name.includes("/"));
    },
    exists: async (path) => files[path] !== undefined,
  };
}

describe("detectGodot", () => {
  it("returns evidence for project.godot and .gd without writing", async () => {
    const root = "/tmp/godot-fixture";
    const result = await detectGodot(
      memoryFs({
        [`${root}/project.godot`]: "config_version=5\n",
        [`${root}/main.gd`]: "extends Node\n",
      }),
      root,
    );
    expect(result.wrote).toBe(false);
    expect(result.candidate?.kind).toBe("godot");
    expect(result.candidate?.confidence).toBeGreaterThan(0);
    expect(result.candidate?.confidence).toBeLessThanOrEqual(1);
    expect(result.candidate?.evidence.map((entry) => entry.path)).toEqual(
      expect.arrayContaining(["project.godot", "main.gd"]),
    );
    expect(GODOT_MANIFEST.capabilities).toEqual([
      "detect",
      "doctor",
      "collector",
      "scenario-driver",
    ]);
  });

  it("returns null when no Godot markers exist", async () => {
    const root = "/tmp/empty";
    const result = await detectGodot(memoryFs({}), root);
    expect(result.candidate).toBeNull();
  });

  it("replaces the unknown filler when Godot is present", () => {
    const merged = mergeGodotCandidates([{ kind: "unknown", confidence: 0 }], {
      kind: "godot",
      confidence: 0.4,
      evidence: [
        {
          kind: "manifest",
          path: "project.godot",
          detail: "Godot project file",
        },
      ],
    });
    expect(merged.map((candidate) => candidate.kind)).toEqual(["godot"]);
  });

  it("does not write into a real directory", async () => {
    const root = await mkdtemp(join(tmpdir(), "potato-godot-ro-"));
    await writeFile(join(root, "project.godot"), "config_version=5\n");
    const before = ["project.godot"];
    const fs: GodotFs = {
      readFile: async () => "",
      readdir: async () => ["project.godot"],
      exists: async (path) => path.endsWith("project.godot"),
    };
    const result = await detectGodot(fs, root);
    expect(result.wrote).toBe(false);
    expect(before).toEqual(["project.godot"]);
  });
});
