import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import type { ConfigFs } from "./types.js";

/** Node fs for confirmed config writes. Callers must allowlist paths first. */
export function createNodeConfigFs(): ConfigFs {
  return {
    exists: async (path) => {
      try {
        await stat(path);
        return true;
      } catch {
        return false;
      }
    },
    readFile: (path) => readFile(path, "utf8"),
    writeFile: (path, contents) => writeFile(path, contents, "utf8"),
    mkdirp: (path) => mkdir(path, { recursive: true }).then(() => undefined),
  };
}
