import { readFileSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createArtifactStore } from "../../packages/artifact-store/src/index.js";
import {
  parseRunArtifact,
  SCHEMA_VERSION,
  safeParseRunArtifact,
} from "../../packages/schemas/src/index.js";
import {
  buildGoldenRunArtifact,
  GOLDEN_FIXTURE_REL,
  goldenFixturePath,
  repoRootFromHere,
} from "./build-run-artifact.js";

const root = repoRootFromHere(import.meta.url);

describe("golden v1.0.0 artifact (T-010)", () => {
  it("matches the committed fixture and round-trips through the store", async () => {
    const built = buildGoldenRunArtifact(root);
    const committed = parseRunArtifact(
      JSON.parse(readFileSync(goldenFixturePath(root), "utf8")),
    );
    expect(built).toEqual(committed);
    expect(committed.schemaVersion).toBe(SCHEMA_VERSION);
    expect(committed.findings[0]?.ruleId).toBe("web.frame_time.p95");

    const store = createArtifactStore(
      await mkdtemp(join(tmpdir(), "potato-golden-")),
    );
    const bytes = new TextEncoder().encode(`${JSON.stringify(built)}\n`);
    const record = await store.writeCompleted(built.run.runId, bytes);
    const loaded = await store.readCompleted(built.run.runId);
    expect(loaded.record.hash).toBe(record.hash);
    const parsed = parseRunArtifact(
      JSON.parse(new TextDecoder().decode(loaded.bytes)),
    );
    expect(parsed).toEqual(built);
  });
});

describe("schema compatibility (NFR-009, EDGE-012)", () => {
  function loadGolden(): Record<string, unknown> {
    return JSON.parse(
      readFileSync(join(root, GOLDEN_FIXTURE_REL), "utf8"),
    ) as Record<string, unknown>;
  }

  it("accepts additive unknown fields within the supported major", () => {
    const input = loadGolden();
    input.extraAdditive = { from: "future-minor" };
    expect(parseRunArtifact(input).schemaVersion).toBe(SCHEMA_VERSION);
  });

  it("rejects an unknown major with a readable compatibility error", () => {
    const input = loadGolden();
    input.schemaVersion = "2.0.0";
    const result = safeParseRunArtifact(input);
    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error("expected unknown major to fail");
    }
    const message =
      result.error instanceof Error
        ? result.error.message
        : String(result.error);
    expect(message).toMatch(/Unsupported schemaVersion major 2/);
    expect(message).toMatch(/Update the CLI or convert the artifact/);
    expect(message).not.toMatch(/at parseRunArtifact/);
  });
});
