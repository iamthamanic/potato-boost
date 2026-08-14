import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { EvidencePanel } from "./evidence-panel.js";
import { RunTimeline } from "./run-timeline.js";
import { filterByPreset, parseSamples, peakSample } from "./timeline.js";

const samples = [
  {
    sampleId: "s0",
    source: "synthetic",
    metric: "frame_time",
    timestampNs: 0,
    value: 40,
    unit: "ms",
  },
  {
    sampleId: "s20",
    source: "synthetic",
    metric: "frame_time",
    timestampNs: 20,
    value: 40,
    unit: "ms",
  },
];

describe("timeline samples", () => {
  it("aligns the selected peak with the measure marker", () => {
    expect(peakSample(samples)?.sampleId).toBe("s20");
    expect(filterByPreset(samples, "measure")).toEqual([samples[1]]);
    expect(
      parseSamples({
        samples: [
          {
            sampleId: "s1",
            source: "synthetic",
            metric: "frame_time",
            timestampNs: 1,
            value: 40,
            unit: "ms",
          },
        ],
      }),
    ).toHaveLength(1);
  });
});

describe("timeline and evidence UI", () => {
  it("shows markers, selected range, and keyboard-visible zoom controls", () => {
    const html = renderToStaticMarkup(createElement(RunTimeline, { samples }));
    expect(html).toMatch(/setup/);
    expect(html).toMatch(/measure/);
    expect(html).toMatch(/Selected range/);
    expect(html).toMatch(/>All</);
    expect(html).toMatch(/>Measure</);
    expect(html).toMatch(/Samples \(narrow layout fallback\)/);
    expect(html).not.toMatch(/Performance Score/);
  });

  it("labels raw, derived, and source evidence", () => {
    const html = renderToStaticMarkup(
      createElement(EvidencePanel, {
        artifact: {
          runId: "01J9GOLDENV100000000000000",
          status: "completed",
          startedAt: "2026-08-13T12:00:00Z",
          scenarioId: "quick-scan",
          profileId: "budget-local",
          rulePackIds: ["rules-web"],
          hostArch: "test",
          osName: "synthetic",
          metrics: [],
          evidence: [
            {
              evidenceId: "ev-golden-1",
              calculation: "p95 of frame_time over measure window",
            },
          ],
          findings: [
            {
              findingId: "finding:web.frame_time.p95",
              ruleId: "web.frame_time.p95",
              severity: "warning",
              confidence: "medium",
              evidenceIds: ["ev-golden-1"],
              sourceCandidates: [{ uri: "src/main.ts", line: 40, column: 2 }],
            },
          ],
        },
      }),
    );
    expect(html).toMatch(/<h4>Raw<\/h4>/);
    expect(html).toMatch(/<h4>Derived<\/h4>/);
    expect(html).toMatch(/<h4>Source<\/h4>/);
    expect(html).toMatch(/samples\.jsonl/);
    expect(html).toMatch(/p95 of frame_time/);
    expect(html).toMatch(/src\/main\.ts:40/);
  });
});
