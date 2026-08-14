import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createNodeConfigFs } from "./fs.js";
import {
  buildInitPreview,
  parseArgvLine,
  parsePotatoConfigYaml,
  resolveRunStart,
  serializePotatoConfig,
} from "./preview.js";

describe("start override vs inferred", () => {
  it("parses whitespace argv without a shell string", () => {
    expect(parseArgvLine("  node   app.js ")).toEqual(["node", "app.js"]);
  });

  it("marks a differing start as override and round-trips yaml", () => {
    const preview = buildInitPreview({
      canonicalRoot: "/tmp/generic",
      kinds: ["unknown"],
      start: ["node", "app.js"],
      configExists: false,
      gitignoreExists: false,
    });
    expect(preview.config.commands.startSource).toBe("override");
    expect(preview.configYaml).toMatch(/startSource: "override"/);
    const parsed = parsePotatoConfigYaml(preview.configYaml);
    expect(parsed.commands.start).toEqual(["node", "app.js"]);
    expect(parsed.commands.startSource).toBe("override");
    expect(serializePotatoConfig(parsed)).toBe(preview.configYaml);
  });

  it("defaults missing startSource to inferred", () => {
    const parsed = parsePotatoConfigYaml(
      [
        'schemaVersion: "1.0.0"',
        'adapterId: "unknown"',
        'root: "."',
        "commands:",
        "  start: []",
        "",
      ].join("\n"),
    );
    expect(parsed.commands.startSource).toBe("inferred");
  });

  it("uses a confirmed override and keeps generic static empty otherwise", async () => {
    const root = await mkdtemp(join(tmpdir(), "potato-start-"));
    const fs = createNodeConfigFs();
    expect(await resolveRunStart(fs, root, ["unknown"])).toEqual([]);
    await writeFile(
      join(root, "potato.config.yaml"),
      serializePotatoConfig({
        schemaVersion: "1.0.0",
        adapterId: "unknown",
        root: ".",
        commands: { start: ["node", "app.js"], startSource: "override" },
      }),
    );
    expect(await resolveRunStart(fs, root, ["unknown"])).toEqual([
      "node",
      "app.js",
    ]);
    expect(await resolveRunStart(fs, root, ["vite"])).toEqual([
      "node",
      "app.js",
    ]);
  });

  it("ignores inferred config start for generic kinds", async () => {
    const root = await mkdtemp(join(tmpdir(), "potato-inferred-"));
    const fs = createNodeConfigFs();
    await writeFile(
      join(root, "potato.config.yaml"),
      serializePotatoConfig({
        schemaVersion: "1.0.0",
        adapterId: "unknown",
        root: ".",
        commands: { start: ["npx", "vite"], startSource: "inferred" },
      }),
    );
    expect(await resolveRunStart(fs, root, ["unknown"])).toEqual([]);
    expect(await resolveRunStart(fs, root, ["vite"])).toEqual(["npx", "vite"]);
  });
});
