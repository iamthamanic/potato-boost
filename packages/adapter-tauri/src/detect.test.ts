import { describe, expect, it } from "vitest";
import { detectTauri, mergeTauriCandidates, TAURI_MANIFEST } from "./detect.js";
import type { TauriFs } from "./types.js";

function memoryFs(files: Record<string, string>): TauriFs {
  return {
    readFile: async (path) => {
      const value = files[path];
      if (value === undefined) {
        throw new Error(`missing ${path}`);
      }
      return value;
    },
    readdir: async () => [],
    exists: async (path) => files[path] !== undefined,
  };
}

describe("detectTauri", () => {
  it("returns evidence for src-tauri/tauri.conf.json without writing", async () => {
    const root = "/tmp/tauri-fixture";
    const result = await detectTauri(
      memoryFs({
        [`${root}/src-tauri/tauri.conf.json`]: '{"productName":"x"}',
        [`${root}/src-tauri`]: "",
      }),
      root,
    );
    expect(result.wrote).toBe(false);
    expect(result.candidate?.kind).toBe("tauri");
    expect(result.candidate?.confidence).toBeGreaterThan(0);
    expect(result.candidate?.evidence.map((entry) => entry.path)).toEqual(
      expect.arrayContaining(["src-tauri/tauri.conf.json", "src-tauri"]),
    );
    expect(TAURI_MANIFEST.capabilities).toEqual(["detect", "doctor"]);
  });

  it("returns null when no Tauri markers exist", async () => {
    const result = await detectTauri(memoryFs({}), "/tmp/empty");
    expect(result.candidate).toBeNull();
  });

  it("keeps web candidates and appends tauri", () => {
    const merged = mergeTauriCandidates([{ kind: "web", confidence: 0.4 }], {
      kind: "tauri",
      confidence: 0.4,
      evidence: [
        {
          kind: "manifest",
          path: "src-tauri/tauri.conf.json",
          detail: "Tauri config",
        },
      ],
    });
    expect(merged.map((candidate) => candidate.kind)).toEqual(["web", "tauri"]);
  });
});
