import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { integrityHash } from "./hash.js";
import { ArtifactStoreError } from "./paths.js";
import { createArtifactStore } from "./store.js";

async function tempRoot(): Promise<string> {
  return mkdtemp(join(tmpdir(), "potato-artifact-"));
}

describe("createArtifactStore", () => {
  it("writes with temp+rename and records an integrity hash", async () => {
    const root = await tempRoot();
    const store = createArtifactStore(root);
    const bytes = new TextEncoder().encode('{"ok":true}');
    const record = await store.writeCompleted("run1", bytes);
    expect(record.hash).toBe(integrityHash(bytes));
    const index = await store.getIndex();
    expect(index.runs).toHaveLength(1);
    const loaded = await store.readCompleted("run1");
    expect(Buffer.from(loaded.bytes).equals(Buffer.from(bytes))).toBe(true);
  });

  it("rejects path-traversal runIds", async () => {
    const store = createArtifactStore(await tempRoot());
    await expect(
      store.writeCompleted("../etc", new Uint8Array([1])),
    ).rejects.toMatchObject({
      code: "INVALID_RUN_ID",
    });
    await expect(
      store.writeCompleted("a/b", new Uint8Array([1])),
    ).rejects.toMatchObject({
      code: "INVALID_RUN_ID",
    });
  });

  it("does not index a run when write crashes before rename", async () => {
    const root = await tempRoot();
    const store = createArtifactStore(root);
    await expect(
      store.writeCompleted("run-crash", new TextEncoder().encode("payload"), {
        crashBeforeRename: true,
      }),
    ).rejects.toMatchObject({ code: "INJECTED_CRASH" });
    const index = await store.getIndex();
    expect(index.runs).toEqual([]);
    await expect(store.readCompleted("run-crash")).rejects.toMatchObject({
      code: "RUN_NOT_COMPLETED",
    });
  });

  it("throws HASH_MISMATCH and refuses baseline use when bytes are tampered", async () => {
    const root = await tempRoot();
    const store = createArtifactStore(root);
    const bytes = new TextEncoder().encode("original");
    const record = await store.writeCompleted("run-tamper", bytes);
    await writeFile(join(root, ".potato", record.path), "tampered");
    await expect(store.readCompleted("run-tamper")).rejects.toBeInstanceOf(
      ArtifactStoreError,
    );
    await expect(store.readCompleted("run-tamper")).rejects.toMatchObject({
      code: "HASH_MISMATCH",
    });
    const index = await store.getIndex();
    expect(index.runs[0]?.runId).toBe("run-tamper");
  });
});

describe("integrityHash", () => {
  it("is stable for the same bytes", () => {
    const bytes = new Uint8Array([1, 2, 3]);
    expect(integrityHash(bytes)).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(integrityHash(bytes)).toBe(integrityHash(bytes));
  });
});
