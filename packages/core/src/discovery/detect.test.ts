import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { detectProject } from "./detect.js";
import { createNodeDiscoveryFs } from "./fs.js";
import { webDetectors } from "./web-detectors.js";

async function tempRoot(): Promise<string> {
  return mkdtemp(join(tmpdir(), "potato-discover-"));
}

function fixtureRoot(): string {
  return join(process.cwd(), "fixtures", "web-threejs");
}

describe("detectProject", () => {
  it("returns candidates with evidence and confidence for the web-threejs fixture", async () => {
    const fs = createNodeDiscoveryFs();
    const result = await detectProject(fs, fixtureRoot(), webDetectors);
    expect(result.wrote).toBe(false);
    expect(result.candidates.length).toBeGreaterThan(0);
    const web = result.candidates.find((c) => c.kind === "web");
    expect(web).toBeDefined();
    expect(web?.confidence).toBeGreaterThan(0);
    expect(web?.confidence).toBeLessThanOrEqual(1);
    expect(web?.evidence.length).toBeGreaterThan(0);
    const vite = result.candidates.find((c) => c.kind === "vite");
    expect(vite).toBeDefined();
    const three = result.candidates.find((c) => c.kind === "threejs");
    expect(three).toBeDefined();
  });

  it("does not invent a stack for an empty directory", async () => {
    const root = await tempRoot();
    const fs = createNodeDiscoveryFs();
    const result = await detectProject(fs, root, webDetectors);
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0]?.kind).toBe("unknown");
    expect(result.candidates[0]?.confidence).toBe(0);
    expect(result.candidates[0]?.evidence).toEqual([]);
  });

  it("returns multiple candidates when two targets are present", async () => {
    const root = await tempRoot();
    await writeFile(
      join(root, "package.json"),
      '{"dependencies":{"react":"latest"}}',
    );
    await writeFile(join(root, "vite.config.ts"), "export default {}");
    const fs = createNodeDiscoveryFs();
    const result = await detectProject(fs, root, webDetectors);
    const kinds = result.candidates.map((c) => c.kind);
    expect(kinds).toContain("vite");
    expect(kinds).toContain("react");
  });

  it("does not write files (read-only contract)", async () => {
    const root = await tempRoot();
    await writeFile(
      join(root, "package.json"),
      '{"dependencies":{"vite":"latest"}}',
    );
    const fs = createNodeDiscoveryFs();
    const before = await fs.readdir(root);
    await detectProject(fs, root, webDetectors);
    const after = await fs.readdir(root);
    expect(after.sort()).toEqual(before.sort());
  });
});
