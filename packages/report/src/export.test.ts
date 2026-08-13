import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { runArtifactSchema } from "@potato-boost/schemas";
import { describe, expect, it } from "vitest";
import { exportReport } from "./export.js";

function fixturePath(): string {
  return join(process.cwd(), "packages/schemas/fixtures/golden-v1.0.0.json");
}

describe("exportReport", () => {
  it("writes JSON and HTML with the same finding IDs", async () => {
    const raw = await readFile(fixturePath(), "utf8");
    const artifact = runArtifactSchema.parse(JSON.parse(raw));
    const outDir = join(process.cwd(), "tmp-report-test");
    const result = await exportReport(artifact, outDir);

    const jsonRaw = await readFile(result.jsonPath, "utf8");
    const json = JSON.parse(jsonRaw);
    expect(json.run.runId).toBe(artifact.run.runId);
    expect(
      json.findings.map((f: { findingId: string }) => f.findingId),
    ).toEqual(artifact.findings.map((f) => f.findingId));

    const html = await readFile(result.htmlPath, "utf8");
    for (const finding of artifact.findings) {
      expect(html).toContain(finding.findingId);
      expect(html).toContain(finding.ruleId);
    }
    expect(html).toContain(artifact.run.runId);
  });

  it("validates against the schema", async () => {
    const bad = { schemaVersion: "1.0.0" };
    await expect(exportReport(bad as never, "/tmp/x")).rejects.toThrow();
  });
});
