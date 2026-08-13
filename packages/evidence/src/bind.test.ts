import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  bindFindingEvidence,
  buildEvidence,
  candidateCaption,
} from "./bind.js";
import { EvidenceError } from "./error.js";

const hash =
  "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

async function projectRoot(): Promise<string> {
  return mkdtemp(join(tmpdir(), "potato-evidence-"));
}

function evidence() {
  return buildEvidence({
    evidenceId: "ev-1",
    inputs: [{ kind: "raw", id: "samples.jsonl", rawHash: hash }],
    calculation: "p95 of frame_time over measure window",
    confidence: "high",
  });
}

describe("buildEvidence", () => {
  it("stores input ids, raw hashes, and a calculation hint", () => {
    const record = evidence();
    expect(record.inputs).toEqual([
      { kind: "raw", id: "samples.jsonl", rawHash: hash },
    ]);
    expect(record.calculation).toContain("p95");
    expect(record.confidence).toBe("high");
  });
});

describe("bindFindingEvidence", () => {
  it("keeps the finding when source mapping is missing and lowers confidence", async () => {
    const root = await projectRoot();
    const ev = evidence();
    const finding = bindFindingEvidence({
      findingId: "f-1",
      ruleId: "web.frame_time.p95",
      severity: "warning",
      projectRoot: root,
      evidence: [ev],
      mapping: {
        available: false,
        runtimeUri: "cdp:stack:main.js",
        runtimeLine: 12,
        runtimeColumn: null,
      },
    });
    expect(finding.evidenceIds).toEqual(["ev-1"]);
    expect(finding.confidence).toBe("low");
    expect(finding.confidenceFactors).toContain("source-map-missing");
    expect(finding.sourceCandidates).toHaveLength(1);
    const runtime = finding.sourceCandidates[0];
    expect(runtime).toBeDefined();
    if (runtime === undefined) {
      throw new Error("expected a runtime candidate");
    }
    expect(runtime.method).toBe("runtime");
    expect(candidateCaption(runtime)).toMatch(/^candidate \(/);
    expect(candidateCaption(runtime)).not.toMatch(/the bug is/i);
  });

  it("stores mapped candidates as ordered hypotheses, not as a confirmed cause", async () => {
    const root = await projectRoot();
    const finding = bindFindingEvidence({
      findingId: "f-2",
      ruleId: "web.frame_time.p95",
      severity: "warning",
      projectRoot: root,
      evidence: [evidence()],
      mapping: {
        available: true,
        uri: "src/main.ts",
        line: 40,
        column: 2,
        method: "source-map",
      },
    });
    expect(finding.confidence).toBe("medium");
    const mapped = finding.sourceCandidates[0];
    expect(mapped).toBeDefined();
    if (mapped === undefined) {
      throw new Error("expected a mapped candidate");
    }
    expect(mapped.uri).toBe("src/main.ts");
    expect(candidateCaption(mapped)).toBe(
      "candidate (source-map): src/main.ts:40",
    );
  });

  it("rejects candidate paths outside the project root", async () => {
    const root = await projectRoot();
    expect(() =>
      bindFindingEvidence({
        findingId: "f-3",
        ruleId: "web.frame_time.p95",
        severity: "warning",
        projectRoot: root,
        evidence: [evidence()],
        mapping: {
          available: true,
          uri: "../etc/passwd",
          line: 1,
          column: null,
          method: "source-map",
        },
      }),
    ).toThrow(EvidenceError);
  });
});
