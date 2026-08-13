import { relative, resolve, sep } from "node:path";
import { EvidenceError } from "./error.js";

const OPAQUE_SCHEME = /^[a-zA-Z][a-zA-Z0-9+.-]*:/;

export function assertInsideProjectRoot(
  projectRoot: string,
  candidate: string,
): string {
  const root = resolve(projectRoot);
  const resolved = resolve(root, candidate);
  const prefix = root.endsWith(sep) ? root : `${root}${sep}`;
  if (resolved !== root && !resolved.startsWith(prefix)) {
    throw new EvidenceError(
      "PATH_TRAVERSAL",
      "candidate path is outside the project root",
    );
  }
  return resolved;
}

/** Store a repo-relative posix path, never an absolute host path. Opaque schemes pass through. */
export function sanitizeCandidateUri(projectRoot: string, uri: string): string {
  if (uri.length === 0 || uri.includes("\0")) {
    throw new EvidenceError(
      "INVALID_URI",
      "candidate uri is empty or contains NUL",
    );
  }
  if (OPAQUE_SCHEME.test(uri) && !uri.startsWith("file:")) {
    return uri;
  }
  const stripped = uri.startsWith("file://")
    ? uri.slice("file://".length)
    : uri;
  const resolved = assertInsideProjectRoot(projectRoot, stripped);
  const rel = relative(resolve(projectRoot), resolved).split(sep).join("/");
  if (rel.startsWith("../") || rel === "..") {
    throw new EvidenceError(
      "PATH_TRAVERSAL",
      "candidate path is outside the project root",
    );
  }
  return rel.length === 0 ? "." : rel;
}
