import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { type RunArtifact, runArtifactSchema } from "@potato-boost/schemas";
import { renderHtmlReport } from "./template.js";

export type ExportResult = {
  jsonPath: string;
  htmlPath: string;
  runId: string;
};

export async function exportReport(
  artifact: RunArtifact,
  outDir: string,
): Promise<ExportResult> {
  const validated = runArtifactSchema.parse(artifact);
  await mkdir(outDir, { recursive: true });
  const jsonPath = join(outDir, "report.json");
  const htmlPath = join(outDir, "report.html");
  await writeFile(jsonPath, JSON.stringify(validated, null, 2));
  await writeFile(htmlPath, renderHtmlReport(validated));
  return { jsonPath, htmlPath, runId: validated.run.runId };
}
