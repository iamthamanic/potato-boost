import { describe, expect, it } from "vitest";
import {
  pickDetectedAdapter,
  startFromPackageScripts,
} from "./project-inspect.js";

describe("project inspect helpers", () => {
  it("prefers a concrete adapter over unknown", () => {
    expect(
      pickDetectedAdapter([
        { kind: "unknown", confidence: 0 },
        { kind: "react", confidence: 0.3 },
        { kind: "vite", confidence: 0.5 },
      ]),
    ).toBe("vite");
    expect(pickDetectedAdapter([{ kind: "godot", confidence: 0.8 }])).toBe(
      "godot",
    );
    expect(pickDetectedAdapter([{ kind: "unknown", confidence: 0 }])).toBe(
      "unknown",
    );
  });

  it("reads a simple package.json start script as argv", () => {
    expect(
      startFromPackageScripts(
        JSON.stringify({ scripts: { dev: "pnpm --filter dashboard dev" } }),
      ),
    ).toEqual(["pnpm", "--filter", "dashboard", "dev"]);
    expect(
      startFromPackageScripts(
        JSON.stringify({ scripts: { start: "node app.js" } }),
      ),
    ).toEqual(["node", "app.js"]);
  });

  it("ignores shell-composed scripts instead of inventing argv", () => {
    expect(
      startFromPackageScripts(
        JSON.stringify({ scripts: { dev: "vite && echo ready" } }),
      ),
    ).toEqual([]);
    expect(startFromPackageScripts("{ not json")).toEqual([]);
  });
});
