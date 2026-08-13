import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import {
  errorEnvelopeSchema,
  evidenceSchema,
  findingSchema,
  runArtifactSchema,
  sampleSchema,
} from "./run-artifact.js";

const here = dirname(fileURLToPath(import.meta.url));
const jsonDir = join(here, "..", "json");
mkdirSync(jsonDir, { recursive: true });

function writeSchema(name: string, schema: z.ZodType): void {
  const json = `${JSON.stringify(z.toJSONSchema(schema), null, 2)}\n`;
  writeFileSync(join(jsonDir, name), json);
}

writeSchema("run-artifact.schema.json", runArtifactSchema);
writeSchema("sample.schema.json", sampleSchema);
writeSchema("evidence.schema.json", evidenceSchema);
writeSchema("finding.schema.json", findingSchema);
writeSchema("error-envelope.schema.json", errorEnvelopeSchema);
