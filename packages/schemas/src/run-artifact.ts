import { z } from "zod";

const openObject = z.object({}).passthrough();

const rfc3339Utc = z
  .string()
  .regex(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/,
    "must be RFC 3339 UTC",
  );

const nonEmptyString = z.string().min(1);

const finiteNumber = z.number().finite();

const versionedId = z
  .object({
    id: nonEmptyString,
    version: nonEmptyString,
  })
  .passthrough();

export const producerSchema = z
  .object({
    name: nonEmptyString,
    version: nonEmptyString,
  })
  .passthrough();

export const gitFingerprintSchema = z
  .object({
    commit: z.string().min(1).nullable(),
    dirty: z.boolean(),
  })
  .passthrough();

export const runSchema = z
  .object({
    runId: nonEmptyString,
    status: z.enum([
      "queued",
      "preparing",
      "running",
      "completed",
      "inconclusive",
      "failed",
      "cancelled",
    ]),
    startedAt: rfc3339Utc,
    git: gitFingerprintSchema,
  })
  .passthrough();

export const lockedInputsSchema = z
  .object({
    target: versionedId,
    scenario: versionedId,
    profile: versionedId,
    adapter: versionedId,
    rulePacks: z.array(versionedId),
  })
  .passthrough();

export const fingerprintsSchema = z
  .object({
    host: openObject,
    os: openObject,
    runtime: openObject,
    adapter: openObject,
    build: openObject,
    git: gitFingerprintSchema,
  })
  .passthrough();

export const rawManifestFileSchema = z
  .object({
    path: nonEmptyString,
    hash: nonEmptyString,
    bytes: z.number().int().nonnegative(),
  })
  .passthrough();

export const rawManifestSchema = z
  .object({
    files: z.array(rawManifestFileSchema),
  })
  .passthrough();

export const sampleSchema = z
  .object({
    sampleId: nonEmptyString,
    source: nonEmptyString,
    metric: nonEmptyString,
    timestampNs: z.number().int(),
    value: finiteNumber,
    unit: nonEmptyString,
  })
  .passthrough();

export const metricSchema = z
  .object({
    name: nonEmptyString,
    value: finiteNumber,
    unit: nonEmptyString,
  })
  .passthrough();

export const evidenceRefSchema = z
  .object({
    kind: nonEmptyString,
    id: nonEmptyString,
    rawHash: nonEmptyString,
  })
  .passthrough();

export const evidenceSchema = z
  .object({
    evidenceId: nonEmptyString,
    inputs: z.array(evidenceRefSchema),
    calculation: nonEmptyString,
    confidence: z.enum(["high", "medium", "low"]),
  })
  .passthrough();

export const sourceCandidateSchema = z
  .object({
    uri: nonEmptyString,
    line: z.number().int().positive().nullable(),
    column: z.number().int().positive().nullable(),
    method: nonEmptyString,
    confidenceFactors: z.array(nonEmptyString).min(1),
  })
  .passthrough();

export const findingSchema = z
  .object({
    findingId: nonEmptyString,
    ruleId: nonEmptyString,
    severity: z.enum(["info", "warning", "error"]),
    evidenceIds: z.array(nonEmptyString),
    sourceCandidates: z.array(sourceCandidateSchema),
    confidence: z.enum(["high", "medium", "low"]),
    confidenceFactors: z.array(nonEmptyString).min(1),
  })
  .passthrough();

export const integritySchema = z
  .object({
    algorithm: nonEmptyString,
    rawManifestHash: nonEmptyString,
    analysisVersion: nonEmptyString,
  })
  .passthrough();

export const runArtifactSchema = z
  .object({
    schemaVersion: nonEmptyString,
    producer: producerSchema,
    run: runSchema,
    lockedInputs: lockedInputsSchema,
    fingerprints: fingerprintsSchema,
    rawManifest: rawManifestSchema,
    metrics: z.array(metricSchema),
    evidence: z.array(evidenceSchema),
    findings: z.array(findingSchema),
    integrity: integritySchema,
  })
  .passthrough();

export const errorEnvelopeSchema = z.object({
  code: nonEmptyString,
  message: nonEmptyString,
  retryable: z.boolean(),
  details: z.unknown().optional(),
  correlationId: nonEmptyString.optional(),
});

export type RunArtifact = z.infer<typeof runArtifactSchema>;
export type Sample = z.infer<typeof sampleSchema>;
export type ErrorEnvelope = z.infer<typeof errorEnvelopeSchema>;
export type Finding = z.infer<typeof findingSchema>;
export type Evidence = z.infer<typeof evidenceSchema>;
