import type { Sample } from "@potato-boost/schemas";
import { AnalysisError } from "./error.js";
import { mean, populationStdDev, quantile } from "./stats.js";

export type DataQuality = "valid" | "noisy" | "incomplete";

/** Run-quality outcome from analysis. Never pass or fail — rules decide budgets later. */
export type AnalysisStatus = "completed" | "inconclusive";

export type AnalysisOptions = {
  metric: string;
  hitchThreshold: number;
  minSampleCount?: number;
  maxCoefficientOfVariation?: number;
};

export type AnalysisResult = {
  metric: string;
  sampleCount: number;
  mean: number;
  p95: number;
  p99: number;
  hitchCount: number;
  dataQuality: DataQuality;
  status: AnalysisStatus;
  qualityReasonCodes: string[];
};

const DEFAULT_MIN_SAMPLES = 16;
const DEFAULT_MAX_CV = 0.35;

function collectFiniteValues(
  samples: readonly Sample[],
  metric: string,
): number[] {
  const values: number[] = [];
  for (const sample of samples) {
    if (sample.metric !== metric) {
      continue;
    }
    if (!Number.isFinite(sample.value)) {
      throw new AnalysisError(
        "NON_FINITE_VALUE",
        "sample values must be finite; refusing to emit NaN metrics",
      );
    }
    values.push(sample.value);
  }
  return values;
}

export function analyzeSamples(
  samples: readonly Sample[],
  options: AnalysisOptions,
): AnalysisResult {
  const minSampleCount = options.minSampleCount ?? DEFAULT_MIN_SAMPLES;
  const maxCv = options.maxCoefficientOfVariation ?? DEFAULT_MAX_CV;
  const values = collectFiniteValues(samples, options.metric);

  if (values.length === 0) {
    throw new AnalysisError(
      "EMPTY_SAMPLES",
      `no finite samples for metric ${options.metric}`,
    );
  }

  const sorted = [...values].sort((a, b) => a - b);
  const avg = mean(values);
  const p95 = quantile(sorted, 0.95);
  const p99 = quantile(sorted, 0.99);
  let hitchCount = 0;
  for (const value of values) {
    if (value > options.hitchThreshold) {
      hitchCount += 1;
    }
  }

  const qualityReasonCodes: string[] = [];
  let dataQuality: DataQuality = "valid";

  if (values.length < minSampleCount) {
    dataQuality = "incomplete";
    qualityReasonCodes.push("INSUFFICIENT_SAMPLES");
  }

  const stddev = populationStdDev(values);
  const cv = avg === 0 ? stddev : stddev / Math.abs(avg);
  if (cv > maxCv) {
    if (dataQuality === "valid") {
      dataQuality = "noisy";
    }
    qualityReasonCodes.push("HOST_NOISE");
  }

  const status: AnalysisStatus =
    dataQuality === "valid" ? "completed" : "inconclusive";

  return {
    metric: options.metric,
    sampleCount: values.length,
    mean: avg,
    p95,
    p99,
    hitchCount,
    dataQuality,
    status,
    qualityReasonCodes,
  };
}
