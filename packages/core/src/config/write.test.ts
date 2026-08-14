import { mkdtemp, readdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createNodeConfigFs } from "./fs.js";
import { buildInitPreview } from "./preview.js";
import type { ConfigFs } from "./types.js";
import { applyInit } from "./write.js";

function tracingFs(): { fs: ConfigFs; writes: string[] } {
  const writes: string[] = [];
  return {
    writes,
    fs: {
      exists: async () => false,
      readFile: async () => "",
      writeFile: async (path) => {
        writes.push(path);
      },
      mkdirp: async () => undefined,
    },
  };
}

describe("applyInit", () => {
  it("writes nothing without confirm", async () => {
    const { fs, writes } = tracingFs();
    const preview = buildInitPreview({
      canonicalRoot: "/tmp/potato-preview",
      kinds: ["web", "vite"],
      configExists: false,
      gitignoreExists: false,
    });
    const result = await applyInit(fs, preview, false);
    expect(result.wrote).toBe(false);
    expect(writes).toEqual([]);
  });

  it("writes config, gitignore, and audit log after confirm", async () => {
    const root = await mkdtemp(join(tmpdir(), "potato-init-"));
    const fs = createNodeConfigFs();
    const preview = buildInitPreview({
      canonicalRoot: root,
      kinds: ["web", "vite"],
      configExists: false,
      gitignoreExists: false,
    });
    const result = await applyInit(fs, preview, true);
    expect(result.wrote).toBe(true);
    const yaml = await readFile(join(root, "potato.config.yaml"), "utf8");
    expect(yaml).toMatch(/adapterId: "vite"/);
    expect(yaml).toMatch(/- "npx"/);
    expect(yaml).toMatch(/- "vite"/);
    const gitignore = await readFile(join(root, ".gitignore"), "utf8");
    expect(gitignore).toMatch(/^\.potato\/$/m);
    const log = await readFile(
      join(root, ".potato/logs/config-change.log"),
      "utf8",
    );
    expect(log).toMatch(/"action":"init"/);
    expect(log).not.toMatch(/secret|password|token/i);
    const names = await readdir(root);
    expect(names.sort()).toEqual([
      ".gitignore",
      ".potato",
      "potato.config.yaml",
    ]);
  });

  it("does not duplicate .potato/ in an existing gitignore", async () => {
    const root = await mkdtemp(join(tmpdir(), "potato-init-gi-"));
    await writeFile(join(root, ".gitignore"), "dist/\n.potato/\n");
    const fs = createNodeConfigFs();
    const preview = buildInitPreview({
      canonicalRoot: root,
      kinds: ["unknown"],
      configExists: false,
      gitignoreExists: true,
    });
    await applyInit(fs, preview, true);
    const gitignore = await readFile(join(root, ".gitignore"), "utf8");
    expect(gitignore.match(/\.potato\//g)?.length).toBe(1);
  });
});
