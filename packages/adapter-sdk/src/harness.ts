import type { AdapterManifest } from "./manifest.js";
import { adapterManifestSchema, isCompatibleSchema } from "./manifest.js";

export type HarnessResult = {
  ok: boolean;
  errors: string[];
};

export function runContractHarness(
  manifest: unknown,
  expectedSchemaMajor: number,
): HarnessResult {
  const errors: string[] = [];

  const parsed = adapterManifestSchema.safeParse(manifest);
  if (!parsed.success) {
    errors.push(
      ...parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
    );
    return { ok: false, errors };
  }

  if (!isCompatibleSchema(parsed.data, expectedSchemaMajor)) {
    errors.push(
      `schema major mismatch: manifest=${parsed.data.schemaVersion} expected major=${expectedSchemaMajor}`,
    );
  }

  return { ok: errors.length === 0, errors };
}

export function hasCapability(
  manifest: AdapterManifest,
  capability: string,
): boolean {
  return (manifest.capabilities as readonly string[]).includes(capability);
}
