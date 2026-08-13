import { readdir, readFile, stat } from "node:fs/promises";
import type { DiscoveryFs } from "@potato-boost/core";

/** Read-only Node fs for discovery. */
export const nodeDiscoveryFs: DiscoveryFs = {
  readFile: (path) => readFile(path, "utf8"),
  readdir: (path) => readdir(path),
  exists: async (path) => {
    try {
      await stat(path);
      return true;
    } catch {
      return false;
    }
  },
};
