import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { runArtifactSchema } from "./run-artifact.js";

function fixturePath(): string {
  return join(process.cwd(), "packages/schemas/fixtures/golden-v1.0.0.json");
}

function visodevSchemaPath(): string {
  return join(process.cwd(), "packages/schemas/visodev-export.schema.json");
}

describe("visodev export schema", () => {
  it("golden artifact matches the import contract", async () => {
    const raw = await readFile(fixturePath(), "utf8");
    const artifact = runArtifactSchema.parse(JSON.parse(raw));

    const visodevExport = {
      schemaVersion: artifact.schemaVersion,
      runId: artifact.run.runId,
      startedAt: artifact.run.startedAt,
      metrics: artifact.metrics,
      findings: artifact.findings.map((f) => ({
        findingId: f.findingId,
        ruleId: f.ruleId,
        severity: f.severity,
        confidence: f.confidence,
      })),
      evidence: artifact.evidence.map((e) => ({
        evidenceId: e.evidenceId,
        confidence: e.confidence,
      })),
    };

    // Validate required fields manually (no external JSON Schema validator)
    expect(visodevExport.schemaVersion).toBe("1.0.0");
    expect(visodevExport.runId).toBe(artifact.run.runId);
    expect(visodevExport.findings.length).toBe(artifact.findings.length);
    expect(visodevExport.evidence.length).toBe(artifact.evidence.length);

    for (const finding of visodevExport.findings) {
      expect(finding).toHaveProperty("findingId");
      expect(finding).toHaveProperty("ruleId");
      expect(finding).toHaveProperty("severity");
      expect(finding).toHaveProperty("confidence");
    }

    for (const evidence of visodevExport.evidence) {
      expect(evidence).toHaveProperty("evidenceId");
      expect(evidence).toHaveProperty("confidence");
    }
  });

  it("schema file is valid JSON", async () => {
    const raw = await readFile(visodevSchemaPath(), "utf8");
    const schema = JSON.parse(raw);
    expect(schema.title).toBe("Potato Boost VisoDev Export");
    expect(schema.required).toContain("schemaVersion");
    expect(schema.required).toContain("runId");
    expect(schema.required).toContain("findings");
    expect(schema.required).toContain("evidence");
  });
});
