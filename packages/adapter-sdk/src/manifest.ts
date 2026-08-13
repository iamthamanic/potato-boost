import { z } from "zod";

export const CAPABILITIES = [
  "detect",
  "doctor",
  "launch",
  "scenario-driver",
  "collector",
  "static-provider",
  "source-mapper",
] as const;
export type Capability = (typeof CAPABILITIES)[number];

export const adapterManifestSchema = z
  .object({
    id: z.string().min(1),
    version: z.string().min(1),
    capabilities: z.array(z.enum(CAPABILITIES)).min(1),
    detectors: z.array(z.string().min(1)).min(1),
    schemaVersion: z.string().min(1),
  })
  .strict();
export type AdapterManifest = z.infer<typeof adapterManifestSchema>;

export function isCompatibleSchema(
  manifest: AdapterManifest,
  expectedMajor: number,
): boolean {
  const major = Number.parseInt(
    manifest.schemaVersion.split(".")[0] ?? "0",
    10,
  );
  return major === expectedMajor;
}
