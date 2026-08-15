import { describe, expect, it } from "vitest";
import {
  DOTNET_MANIFEST,
  detectDotnet,
  mergeDotnetCandidates,
} from "./detect.js";
import type { DotnetFs } from "./types.js";

function memoryFs(
  files: Record<string, string>,
  names: string[] = [],
): DotnetFs {
  return {
    readFile: async (path) => {
      const value = files[path];
      if (value === undefined) {
        throw new Error(`missing ${path}`);
      }
      return value;
    },
    readdir: async () => names,
    exists: async (path) => files[path] !== undefined,
  };
}

describe("detectDotnet", () => {
  it("returns csproj evidence without writing", async () => {
    const root = "/tmp/dotnet-fixture";
    const result = await detectDotnet(
      memoryFs({ [`${root}/App.csproj`]: "<Project />" }, ["App.csproj"]),
      root,
    );
    expect(result.wrote).toBe(false);
    expect(result.candidate?.kind).toBe("dotnet");
    expect(result.candidate?.confidence).toBe(0.9);
    expect(result.candidate?.evidence.map((entry) => entry.path)).toEqual([
      "App.csproj",
    ]);
    expect(DOTNET_MANIFEST.capabilities).toEqual(
      expect.arrayContaining(["detect", "doctor", "collector"]),
    );
  });

  it("returns sln evidence", async () => {
    const root = "/tmp/dotnet-sln";
    const result = await detectDotnet(
      memoryFs({ [`${root}/App.sln`]: "" }, ["App.sln"]),
      root,
    );
    expect(result.candidate?.kind).toBe("dotnet");
    expect(result.candidate?.confidence).toBe(0.7);
    expect(result.candidate?.evidence[0]?.path).toBe("App.sln");
  });

  it("skips Unity trees", async () => {
    const root = "/tmp/unity";
    const result = await detectDotnet(
      memoryFs(
        {
          [`${root}/ProjectSettings/ProjectVersion.txt`]:
            "m_EditorVersion: 2022",
          [`${root}/Game.csproj`]: "<Project />",
        },
        ["Game.csproj", "ProjectSettings"],
      ),
      root,
    );
    expect(result.candidate).toBeNull();
    expect(result.wrote).toBe(false);
  });

  it("skips Godot C# trees", async () => {
    const root = "/tmp/godot-cs";
    const result = await detectDotnet(
      memoryFs(
        {
          [`${root}/project.godot`]: "config_version=5\n",
          [`${root}/Game.csproj`]: "<Project />",
        },
        ["project.godot", "Game.csproj"],
      ),
      root,
    );
    expect(result.candidate).toBeNull();
  });

  it("returns null when no project files exist", async () => {
    const result = await detectDotnet(memoryFs({}, []), "/tmp/empty");
    expect(result.candidate).toBeNull();
  });

  it("keeps web candidates and appends dotnet", () => {
    const merged = mergeDotnetCandidates([{ kind: "web", confidence: 0.4 }], {
      kind: "dotnet",
      confidence: 0.9,
      evidence: [
        { kind: "marker", path: "App.csproj", detail: "MSBuild project" },
      ],
    });
    expect(merged.map((candidate) => candidate.kind)).toEqual([
      "web",
      "dotnet",
    ]);
  });
});
