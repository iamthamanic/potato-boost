import {
  type RunArtifact,
  runArtifactSchema,
  type Sample,
  sampleSchema,
} from "./run-artifact.js";
import { assertSupportedSchemaVersion } from "./version.js";

export function parseRunArtifact(input: unknown): RunArtifact {
  const artifact = runArtifactSchema.parse(input);
  assertSupportedSchemaVersion(artifact.schemaVersion);
  return artifact;
}

export function parseSample(input: unknown): Sample {
  return sampleSchema.parse(input);
}

export function safeParseRunArtifact(input: unknown) {
  const parsed = runArtifactSchema.safeParse(input);
  if (!parsed.success) {
    return parsed;
  }
  try {
    assertSupportedSchemaVersion(parsed.data.schemaVersion);
    return parsed;
  } catch (error) {
    return {
      success: false as const,
      error,
    };
  }
}
