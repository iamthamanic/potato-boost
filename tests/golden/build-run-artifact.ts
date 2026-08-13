import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { analyzeSamples } from "../../packages/analysis/src/index.js";
import { integrityHash } from "../../packages/artifact-store/src/index.js";
import {
  bindFindingEvidence,
  buildEvidence,
} from "../../packages/evidence/src/index.js";
import { evaluate } from "../../packages/rule-engine/src/index.js";
import {
  parseRunArtifact,
  type RunArtifact,
  type Sample,
  SCHEMA_VERSION,
} from "../../packages/schemas/src/index.js";

const GOLDEN_RUN_ID = "01J9GOLDENV100000000000000";
const SAMPLE_COUNT = 40;
const FRAME_MS = 40;
const HITCH_THRESHOLD = 33.33;

export const GOLDEN_FIXTURE_REL =
  "packages/schemas/fixtures/golden-v1.0.0.json";

export function repoRootFromHere(metaUrl: string): string {
  return join(dirname(fileURLToPath(metaUrl)), "../..");
}

function samples(): Sample[] {
  const list: Sample[] = [];
  for (let index = 0; index < SAMPLE_COUNT; index += 1) {
    list.push({
      sampleId: `s${String(index)}`,
      source: "synthetic",
      metric: "frame_time",
      timestampNs: index,
      value: FRAME_MS,
      unit: "ms",
    });
  }
  return list;
}

function sha256OfJson(value: unknown): string {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

function loadWebPack(root: string): unknown {
  return JSON.parse(
    readFileSync(join(root, "packages/rules-web/pack.json"), "utf8"),
  );
}

/** Deterministic Slice-1 artifact: analysis → evidence → rules → bind. */
export function buildGoldenRunArtifact(projectRoot: string): RunArtifact {
  const frameSamples = samples();
  const analysis = analyzeSamples(frameSamples, {
    metric: "frame_time",
    hitchThreshold: HITCH_THRESHOLD,
  });
  const rawHash = sha256OfJson(frameSamples);
  const evidence = buildEvidence({
    evidenceId: "ev-golden-1",
    inputs: [{ kind: "raw", id: "samples.jsonl", rawHash }],
    calculation: "p95 of frame_time over measure window",
    confidence: "high",
  });
  const metrics = [
    { name: "frame_time_p95", value: analysis.p95, unit: "ms" },
    { name: "frame_time_p99", value: analysis.p99, unit: "ms" },
  ];
  const evaluation = evaluate(loadWebPack(projectRoot), {
    metrics,
    evidenceIds: [evidence.evidenceId],
    capabilities: ["web.cdp"],
  });
  const first = evaluation.evaluations[0];
  if (first === undefined || first.finding === null) {
    throw new Error("golden pipeline expected a rules-web finding");
  }
  const finding = bindFindingEvidence({
    findingId: first.finding.findingId,
    ruleId: first.finding.ruleId,
    severity: first.finding.severity,
    projectRoot,
    evidence: [evidence],
    mapping: {
      available: true,
      uri: "src/main.ts",
      line: 40,
      column: 2,
      method: "source-map",
    },
  });
  const rawManifest = {
    files: [
      {
        path: "samples.jsonl",
        hash: rawHash,
        bytes: JSON.stringify(frameSamples).length,
      },
    ],
  };
  return parseRunArtifact({
    schemaVersion: SCHEMA_VERSION,
    producer: { name: "potato-boost-golden", version: "1.0.0" },
    run: {
      runId: GOLDEN_RUN_ID,
      status: analysis.status,
      startedAt: "2026-08-13T12:00:00Z",
      git: { commit: null, dirty: true },
    },
    lockedInputs: {
      target: { id: "web-threejs", version: "1.0.0" },
      scenario: { id: "quick-scan", version: "1.0.0" },
      profile: { id: "budget-local", version: "1.0.0" },
      adapter: { id: "adapter-web", version: "1.0.0" },
      rulePacks: [{ id: "rules-web", version: "1.0.0" }],
    },
    fingerprints: {
      host: { arch: "test" },
      os: { name: "synthetic" },
      runtime: { node: "24.0.0" },
      adapter: { id: "adapter-web" },
      build: { mode: "release" },
      git: { commit: null, dirty: true },
    },
    rawManifest,
    metrics,
    evidence: [evidence],
    findings: [finding],
    integrity: {
      algorithm: "sha256",
      rawManifestHash: integrityHash(
        new TextEncoder().encode(JSON.stringify(rawManifest)),
      ),
      analysisVersion: "1.0.0",
    },
  });
}

export function goldenFixturePath(projectRoot: string): string {
  return join(projectRoot, GOLDEN_FIXTURE_REL);
}
