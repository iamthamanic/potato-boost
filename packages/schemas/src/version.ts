/** Supported run-artifact schema family. Minor adds fields; unknown majors are rejected. */
export const SCHEMA_VERSION = "1.0.0" as const;
export const SCHEMA_MAJOR = 1 as const;

export function parseSchemaMajor(schemaVersion: string): number {
  const majorText = schemaVersion.split(".")[0];
  if (majorText === undefined || majorText.length === 0) {
    throw new Error("schemaVersion is missing a major component");
  }
  const major = Number.parseInt(majorText, 10);
  if (!Number.isInteger(major) || major < 0) {
    throw new Error(`schemaVersion major is not an integer: ${schemaVersion}`);
  }
  return major;
}

export function assertSupportedSchemaVersion(schemaVersion: string): void {
  const major = parseSchemaMajor(schemaVersion);
  if (major !== SCHEMA_MAJOR) {
    throw new Error(
      `Unsupported schemaVersion major ${major} (supported major ${SCHEMA_MAJOR}). Update the CLI or convert the artifact.`,
    );
  }
}
