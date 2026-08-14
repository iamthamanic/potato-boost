import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createArtifactStore } from "../../packages/artifact-store/src/index.js";
import { scrubJsonText } from "../../packages/scenario-engine/src/redact.js";
import { parseRunArtifact } from "../../packages/schemas/src/index.js";
import {
  buildGoldenRunArtifact,
  repoRootFromHere,
} from "./build-run-artifact.js";

const CANARY = "CANARY_SECRET_t011_do_not_store";
const root = repoRootFromHere(import.meta.url);

describe("artifact secret scrubber (T-011)", () => {
  it("writes zero canary hits when recorded input leaked into JSON", async () => {
    const built = buildGoldenRunArtifact(root);
    const dirty = {
      ...built,
      recorded: {
        url: `https://example.test/callback?token=${CANARY}`,
        headers: { Authorization: `Bearer ${CANARY}` },
        body: { password: CANARY },
      },
    };
    const scrubbed = scrubJsonText(JSON.stringify(dirty));
    expect(scrubbed).not.toContain(CANARY);
    const store = createArtifactStore(
      await mkdtemp(join(tmpdir(), "potato-canary-")),
    );
    const bytes = new TextEncoder().encode(`${scrubbed}\n`);
    await store.writeCompleted(built.run.runId, bytes);
    const loaded = await store.readCompleted(built.run.runId);
    const text = new TextDecoder().decode(loaded.bytes);
    expect(text).not.toContain(CANARY);
    expect(() => parseRunArtifact(JSON.parse(text))).not.toThrow();
  });
});
