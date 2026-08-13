import { readdir, readFile, stat } from "node:fs/promises";
import { resolve, sep } from "node:path";
import type { DiscoveryFs } from "./types.js";

/** Node fs implementation that is read-only by contract. */
export function createNodeDiscoveryFs(): DiscoveryFs {
  return {
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
}

export function resolveCanonicalRoot(root: string): string {
  const resolved = resolve(root);
  return resolved.endsWith(sep) ? resolved.slice(0, -sep.length) : resolved;
}

export function assertInsideRoot(root: string, candidate: string): string {
  const resolvedRoot = resolveCanonicalRoot(root);
  const resolved = resolve(resolvedRoot, candidate);
  const prefix = resolvedRoot.endsWith(sep)
    ? resolvedRoot
    : `${resolvedRoot}${sep}`;
  if (resolved !== resolvedRoot && !resolved.startsWith(prefix)) {
    throw new Error(`path outside root: ${candidate}`);
  }
  return resolved;
}
