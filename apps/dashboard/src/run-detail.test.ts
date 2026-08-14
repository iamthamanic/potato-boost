import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FindingDetail } from "./finding-detail.js";
import {
  budgetCardsFromMetrics,
  isAllowedSourceUri,
  parseRunArtifactView,
  qualityFromStatus,
} from "./run-artifact.js";
import { RunOverview } from "./run-overview.js";

const goldenFinding = {
  findingId: "finding:web.frame_time.p95",
  ruleId: "web.frame_time.p95",
  severity: "warning",
  confidence: "medium" as const,
  evidenceIds: ["ev-golden-1"],
  sourceCandidates: [
    { uri: "src/main.ts", line: 40, column: 2 },
    { uri: "../secret", line: 1, column: 1 },
    { uri: "https://evil.example/x", line: 1, column: 1 },
  ],
};

describe("run artifact view", () => {
  it("maps completed quality and rendering metrics without inventing a score", () => {
    expect(qualityFromStatus("completed")).toBe("valid");
    const cards = budgetCardsFromMetrics([
      { name: "frame_time_p95", value: 40, unit: "ms" },
    ]);
    const rendering = cards.find((card) => card.category === "Rendering");
    expect(rendering?.status).toBe("inconclusive");
    expect(rendering?.metrics[0]?.value).toBe(40);
    expect(isAllowedSourceUri("src/main.ts")).toBe(true);
    expect(isAllowedSourceUri("../secret")).toBe(false);
    expect(isAllowedSourceUri("/etc/passwd")).toBe(false);
    expect(isAllowedSourceUri("https://evil.example")).toBe(false);
  });

  it("parses a golden-shaped payload", () => {
    const view = parseRunArtifactView({
      run: {
        runId: "01J9GOLDENV100000000000000",
        status: "completed",
        startedAt: "2026-08-13T12:00:00Z",
      },
      lockedInputs: {
        scenario: { id: "quick-scan" },
        profile: { id: "budget-local" },
        rulePacks: [{ id: "rules-web" }],
      },
      fingerprints: { host: { arch: "test" }, os: { name: "synthetic" } },
      metrics: [{ name: "frame_time_p95", value: 40, unit: "ms" }],
      evidence: [
        {
          evidenceId: "ev-golden-1",
          calculation: "p95 of frame_time over measure window",
        },
      ],
      findings: [goldenFinding],
    });
    expect(view?.runId).toBe("01J9GOLDENV100000000000000");
    expect(view?.findings[0]?.confidence).toBe("medium");
  });
});

describe("run overview and finding detail", () => {
  it("shows quality and budget categories without a Performance Score", () => {
    const html = renderToStaticMarkup(
      createElement(RunOverview, {
        artifact: {
          runId: "01J9GOLDENV100000000000000",
          status: "completed",
          startedAt: "2026-08-13T12:00:00Z",
          scenarioId: "quick-scan",
          profileId: "budget-local",
          rulePackIds: ["rules-web"],
          hostArch: "test",
          osName: "synthetic",
          metrics: [{ name: "frame_time_p95", value: 40, unit: "ms" }],
          evidence: [],
          findings: [goldenFinding],
        },
      }),
    );
    expect(html).toMatch(/Valid/);
    expect(html).toMatch(/Runtime/);
    expect(html).toMatch(/Rendering/);
    expect(html).toMatch(/Inconclusive/);
    expect(html).not.toMatch(/Performance Score/);
  });

  it("renders six finding blocks and keeps low confidence low", () => {
    const html = renderToStaticMarkup(
      createElement(FindingDetail, {
        finding: { ...goldenFinding, confidence: "low" },
        metrics: [{ name: "frame_time_p95", value: 40, unit: "ms" }],
        evidence: [
          {
            evidenceId: "ev-golden-1",
            calculation: "p95 of frame_time over measure window",
          },
        ],
        scenarioId: "quick-scan",
        startedAt: "2026-08-13T12:00:00Z",
        profileId: "budget-local",
        rulePackIds: ["rules-web"],
      }),
    );
    expect(html).toMatch(/<h3>Observed<\/h3>/);
    expect(html).toMatch(/<h3>Budget or baseline<\/h3>/);
    expect(html).toMatch(/<h3>When in the scenario<\/h3>/);
    expect(html).toMatch(/<h3>Supporting signals<\/h3>/);
    expect(html).toMatch(/<h3>Plausible change class<\/h3>/);
    expect(html).toMatch(/<h3>How to verify<\/h3>/);
    expect(html).toMatch(/web\.frame_time\.p95/);
    expect(html).toMatch(/confidence low/);
    expect(html).not.toMatch(/confidence medium/);
    expect(html).toMatch(/src\/main\.ts:40/);
    expect(html).not.toMatch(/\.\.\/secret/);
    expect(html).not.toMatch(/https:\/\/evil/);
    expect(html).not.toMatch(/Performance Score/);
  });
});
