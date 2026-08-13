import { mkdir, open, readFile, rename, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { integrityHash } from "./hash.js";
import {
  ArtifactStoreError,
  artifactRelPath,
  assertInsidePotatoRoot,
  assertSafeRunId,
  potatoRoot,
} from "./paths.js";

export type CompletedRunRecord = {
  runId: string;
  hash: string;
  bytes: number;
  path: string;
};

export type ArtifactIndex = {
  runs: CompletedRunRecord[];
};

export type WriteOptions = {
  crashBeforeRename?: boolean;
  fsync?: boolean;
};

export type ArtifactStore = {
  writeCompleted: (
    runId: string,
    bytes: Uint8Array,
    options?: WriteOptions,
  ) => Promise<CompletedRunRecord>;
  readCompleted: (
    runId: string,
  ) => Promise<{ bytes: Uint8Array; record: CompletedRunRecord }>;
  getIndex: () => Promise<ArtifactIndex>;
};

function emptyIndex(): ArtifactIndex {
  return { runs: [] };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseIndex(raw: string): ArtifactIndex {
  const parsed: unknown = JSON.parse(raw);
  if (!isRecord(parsed) || !("runs" in parsed) || !Array.isArray(parsed.runs)) {
    throw new ArtifactStoreError(
      "INVALID_INDEX",
      "artifact index is not an object with runs[]",
    );
  }
  const runs: CompletedRunRecord[] = [];
  for (const entry of parsed.runs) {
    if (!isRecord(entry)) {
      throw new ArtifactStoreError(
        "INVALID_INDEX",
        "artifact index entry is malformed",
      );
    }
    const runId = entry.runId;
    const hash = entry.hash;
    const bytes = entry.bytes;
    const path = entry.path;
    if (
      typeof runId !== "string" ||
      typeof hash !== "string" ||
      typeof bytes !== "number" ||
      typeof path !== "string"
    ) {
      throw new ArtifactStoreError(
        "INVALID_INDEX",
        "artifact index entry is malformed",
      );
    }
    runs.push({ runId, hash, bytes, path });
  }
  return { runs };
}

function isNotFound(error: unknown): boolean {
  return isRecord(error) && error.code === "ENOENT";
}

async function writeAtomicFile(
  destPath: string,
  bytes: Uint8Array,
  options: WriteOptions,
): Promise<void> {
  const tmpPath = `${destPath}.tmp`;
  await mkdir(dirname(destPath), { recursive: true });
  const handle = await open(tmpPath, "w");
  try {
    let offset = 0;
    while (offset < bytes.byteLength) {
      const result = await handle.write(
        bytes,
        offset,
        bytes.byteLength - offset,
      );
      offset += result.bytesWritten;
    }
    if (options.fsync !== false) {
      await handle.sync();
    }
  } finally {
    await handle.close();
  }
  if (options.crashBeforeRename === true) {
    throw new ArtifactStoreError(
      "INJECTED_CRASH",
      "write aborted before atomic rename",
      true,
    );
  }
  await rename(tmpPath, destPath);
}

export function createArtifactStore(projectRoot: string): ArtifactStore {
  const root = potatoRoot(projectRoot);
  const indexPath = assertInsidePotatoRoot(
    projectRoot,
    join(root, "index.json"),
  );

  async function loadIndex(): Promise<ArtifactIndex> {
    try {
      const raw = await readFile(indexPath, "utf8");
      return parseIndex(raw);
    } catch (error) {
      if (error instanceof ArtifactStoreError) {
        throw error;
      }
      if (isNotFound(error)) {
        return emptyIndex();
      }
      throw new ArtifactStoreError(
        "INVALID_INDEX",
        "artifact index could not be read",
      );
    }
  }

  async function saveIndex(index: ArtifactIndex): Promise<void> {
    const payload = new TextEncoder().encode(
      `${JSON.stringify(index, null, 2)}\n`,
    );
    await writeAtomicFile(indexPath, payload, { fsync: true });
  }

  return {
    async writeCompleted(runId, bytes, options = {}) {
      assertSafeRunId(runId);
      const rel = artifactRelPath(runId);
      const destPath = assertInsidePotatoRoot(projectRoot, join(root, rel));
      const record: CompletedRunRecord = {
        runId,
        hash: integrityHash(bytes),
        bytes: bytes.byteLength,
        path: rel,
      };
      try {
        await writeAtomicFile(destPath, bytes, options);
      } catch (error) {
        await rm(`${destPath}.tmp`, { force: true });
        throw error;
      }
      const index = await loadIndex();
      const next: ArtifactIndex = {
        runs: [...index.runs.filter((entry) => entry.runId !== runId), record],
      };
      await saveIndex(next);
      return record;
    },

    async readCompleted(runId) {
      assertSafeRunId(runId);
      const index = await loadIndex();
      const record = index.runs.find((entry) => entry.runId === runId);
      if (record === undefined) {
        throw new ArtifactStoreError(
          "RUN_NOT_COMPLETED",
          "run is not a completed index entry and cannot be used as a baseline",
        );
      }
      const destPath = assertInsidePotatoRoot(
        projectRoot,
        join(root, record.path),
      );
      const bytes = new Uint8Array(await readFile(destPath));
      const actual = integrityHash(bytes);
      if (actual !== record.hash) {
        throw new ArtifactStoreError(
          "HASH_MISMATCH",
          "on-disk artifact hash does not match the completed index; not a valid baseline source",
        );
      }
      return { bytes, record };
    },

    async getIndex() {
      return loadIndex();
    },
  };
}

export { ArtifactStoreError, integrityHash };
