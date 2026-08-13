import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  parseRunArtifact,
  parseSample,
  safeParseRunArtifact,
} from "./parse.js";
import {
  errorEnvelopeSchema,
  evidenceSchema,
  findingSchema,
  runArtifactSchema,
  sampleSchema,
} from "./run-artifact.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function loadValid(): unknown {
  return JSON.parse(
    readFileSync(join(root, "fixtures/valid-run-artifact.json"), "utf8"),
  );
}

describe("parseRunArtifact", () => {
  it("accepts the golden fixture", () => {
    expect(parseRunArtifact(loadValid()).schemaVersion).toBe("1.0.0");
  });

  it("rejects a missing schemaVersion", () => {
    const input = loadValid() as Record<string, unknown>;
    delete input.schemaVersion;
    expect(() => parseRunArtifact(input)).toThrow();
  });

  it("rejects an unknown schema major", () => {
    const input = loadValid() as { schemaVersion: string };
    input.schemaVersion = "2.0.0";
    expect(safeParseRunArtifact(input).success).toBe(false);
  });

  it("ignores unknown additive fields", () => {
    const input = loadValid() as Record<string, unknown>;
    input.extraAdditive = { ok: true };
    expect(parseRunArtifact(input).schemaVersion).toBe("1.0.0");
  });

  it("treats git.commit null as valid and missing commit as invalid", () => {
    const withNull = loadValid();
    expect(parseRunArtifact(withNull).run.git.commit).toBeNull();

    const missing = loadValid() as {
      run: { git: Record<string, unknown> };
    };
    delete missing.run.git.commit;
    expect(() => parseRunArtifact(missing)).toThrow();
  });
});

describe("parseSample", () => {
  const base = {
    sampleId: "s1",
    source: "cdp",
    metric: "frame_time",
    timestampNs: 1,
    value: 16.6,
    unit: "ms",
  };

  it("rejects NaN and Infinity values", () => {
    expect(() => parseSample({ ...base, value: Number.NaN })).toThrow();
    expect(() =>
      parseSample({ ...base, value: Number.POSITIVE_INFINITY }),
    ).toThrow();
  });

  it("accepts a finite value", () => {
    expect(parseSample(base).value).toBe(16.6);
  });
});

describe("errorEnvelopeSchema", () => {
  it("strips stack traces from the public envelope", () => {
    const parsed = errorEnvelopeSchema.parse({
      code: "INVALID_SCHEMA",
      message: "run artifact failed validation",
      retryable: false,
      stack: "Error: secret\n    at parse",
    });
    expect(parsed).toEqual({
      code: "INVALID_SCHEMA",
      message: "run artifact failed validation",
      retryable: false,
    });
    expect("stack" in parsed).toBe(false);
  });
});

describe("generated JSON schemas", () => {
  it("matches Zod toJSONSchema output", () => {
    const committed = JSON.parse(
      readFileSync(join(root, "json/run-artifact.schema.json"), "utf8"),
    ) as unknown;
    expect(committed).toEqual(z.toJSONSchema(runArtifactSchema));
  });

  it("committed sample, evidence, finding, and error schemas match Zod", () => {
    const sampleCommitted = JSON.parse(
      readFileSync(join(root, "json/sample.schema.json"), "utf8"),
    ) as unknown;
    const evidenceCommitted = JSON.parse(
      readFileSync(join(root, "json/evidence.schema.json"), "utf8"),
    ) as unknown;
    const findingCommitted = JSON.parse(
      readFileSync(join(root, "json/finding.schema.json"), "utf8"),
    ) as unknown;
    const errorCommitted = JSON.parse(
      readFileSync(join(root, "json/error-envelope.schema.json"), "utf8"),
    ) as unknown;
    expect(sampleCommitted).toEqual(z.toJSONSchema(sampleSchema));
    expect(evidenceCommitted).toEqual(z.toJSONSchema(evidenceSchema));
    expect(findingCommitted).toEqual(z.toJSONSchema(findingSchema));
    expect(errorCommitted).toEqual(z.toJSONSchema(errorEnvelopeSchema));
  });
});
