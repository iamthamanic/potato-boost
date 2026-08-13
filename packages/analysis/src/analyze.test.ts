import type { Sample } from "@potato-boost/schemas";
import { describe, expect, it } from "vitest";
import { analyzeSamples } from "./analyze.js";
import { AnalysisError } from "./error.js";
import { mean } from "./stats.js";

function samplesFromValues(
  values: readonly number[],
  metric = "frame_time",
): Sample[] {
  return values.map((value, index) => ({
    sampleId: `s${index}`,
    source: "synthetic",
    metric,
    timestampNs: index,
    value,
    unit: "ms",
  }));
}

describe("analyzeSamples (T-007)", () => {
  it("reports p95/p99 and zero hitches for a steady frame-time series", () => {
    const values = Array.from({ length: 40 }, () => 16.6);
    const result = analyzeSamples(samplesFromValues(values), {
      metric: "frame_time",
      hitchThreshold: 33.33,
    });
    expect(result.p95).toBeCloseTo(16.6, 5);
    expect(result.p99).toBeCloseTo(16.6, 5);
    expect(result.hitchCount).toBe(0);
    expect(result.dataQuality).toBe("valid");
    expect(result.status).toBe("completed");
  });

  it("does not treat a low mean as a pass when hitches raise p95", () => {
    const values = [
      ...Array.from({ length: 90 }, () => 16),
      ...Array.from({ length: 10 }, () => 80),
    ];
    const result = analyzeSamples(samplesFromValues(values), {
      metric: "frame_time",
      hitchThreshold: 33.33,
    });
    expect(result.mean).toBeLessThan(33.33);
    expect(result.p95).toBeGreaterThan(33.33);
    expect(result.hitchCount).toBe(10);
    expect(mean(values)).toBe(result.mean);
  });

  it("marks host noise over budget as noisy inconclusive, not fail", () => {
    const values = [
      8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 40, 55, 70, 90, 120,
    ];
    const result = analyzeSamples(samplesFromValues(values), {
      metric: "frame_time",
      hitchThreshold: 33.33,
      maxCoefficientOfVariation: 0.2,
    });
    expect(result.dataQuality).toBe("noisy");
    expect(result.status).toBe("inconclusive");
    expect(result.status).not.toBe("completed");
    expect(result.qualityReasonCodes).toContain("HOST_NOISE");
  });

  it("marks too few samples incomplete and inconclusive", () => {
    const result = analyzeSamples(samplesFromValues([16, 16.5, 17]), {
      metric: "frame_time",
      hitchThreshold: 33.33,
      minSampleCount: 16,
    });
    expect(result.dataQuality).toBe("incomplete");
    expect(result.status).toBe("inconclusive");
    expect(result.qualityReasonCodes).toContain("INSUFFICIENT_SAMPLES");
  });

  it("throws on an empty sample list instead of emitting NaN metrics", () => {
    expect(() =>
      analyzeSamples([], { metric: "frame_time", hitchThreshold: 33.33 }),
    ).toThrow(AnalysisError);
    try {
      analyzeSamples([], { metric: "frame_time", hitchThreshold: 33.33 });
      throw new Error("expected EMPTY_SAMPLES");
    } catch (error) {
      expect(error).toBeInstanceOf(AnalysisError);
      if (error instanceof AnalysisError) {
        expect(error.code).toBe("EMPTY_SAMPLES");
      }
    }
  });
});
