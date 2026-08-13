import { posix, resolve, sep } from "node:path";

const RUN_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;

export class ArtifactStoreError extends Error {
  readonly code: string;
  readonly retryable: boolean;

  constructor(code: string, message: string, retryable = false) {
    super(message);
    this.name = "ArtifactStoreError";
    this.code = code;
    this.retryable = retryable;
  }
}

export function assertSafeRunId(runId: string): void {
  if (!RUN_ID_PATTERN.test(runId) || runId.includes("..")) {
    throw new ArtifactStoreError(
      "INVALID_RUN_ID",
      "runId must be a single path segment (letters, digits, ._-) without traversal",
    );
  }
}

export function potatoRoot(projectRoot: string): string {
  return resolve(projectRoot, ".potato");
}

export function assertInsidePotatoRoot(
  projectRoot: string,
  candidate: string,
): string {
  const root = potatoRoot(projectRoot);
  const resolved = resolve(candidate);
  const prefix = root.endsWith(sep) ? root : `${root}${sep}`;
  if (resolved !== root && !resolved.startsWith(prefix)) {
    throw new ArtifactStoreError(
      "PATH_TRAVERSAL",
      "resolved path is outside the project .potato directory",
    );
  }
  return resolved;
}

export function artifactRelPath(runId: string): string {
  assertSafeRunId(runId);
  return posix.join("runs", `${runId}.json`);
}
