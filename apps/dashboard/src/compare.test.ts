import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CompareTable, parseCompareView } from "./compare.js";

describe("compare view", () => {
  it("renders absolute, delta, and noise without a score", () => {
    const parsed = parseCompareView({
      comparability: "comparable",
      overall: "regressed",
      gitDirtyVisible: true,
      reasons: [],
      metrics: [
        {
          name: "frame_time_p95",
          unit: "ms",
          baseline: 40,
          candidate: 50,
          delta: 10,
          deltaPct: 25,
          noiseBudgetPct: 5,
          withinNoiseBudget: false,
          verdict: "regressed",
        },
      ],
    });
    expect(parsed).toBeDefined();
    if (parsed === undefined) {
      return;
    }
    expect(parsed.metrics[0]?.delta).toBe(10);
    const html = renderToStaticMarkup(
      createElement(CompareTable, { result: parsed }),
    );
    expect(html).toMatch(/40/);
    expect(html).toMatch(/50/);
    expect(html).toMatch(/regressed/);
    expect(html).toMatch(/5%/);
    expect(html).not.toMatch(/Performance Score/);
  });

  it("says non-comparable is not a performance failure", () => {
    const parsed = parseCompareView({
      comparability: "non-comparable",
      overall: "non-comparable",
      gitDirtyVisible: false,
      reasons: [{ code: "LOCK_BUILDMODE", detail: "debug vs release" }],
      metrics: [
        {
          name: "frame_time_p95",
          unit: "ms",
          baseline: 40,
          candidate: 80,
          delta: 40,
          deltaPct: 100,
          noiseBudgetPct: 5,
          withinNoiseBudget: false,
          verdict: "incomparable",
        },
      ],
    });
    expect(parsed).toBeDefined();
    if (parsed === undefined) {
      return;
    }
    const html = renderToStaticMarkup(
      createElement(CompareTable, { result: parsed }),
    );
    expect(html).toMatch(/not a performance failure/);
    expect(html).toMatch(/incomparable/);
  });
});
