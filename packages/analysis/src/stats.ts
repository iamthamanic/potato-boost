import { AnalysisError } from "./error.js";

/** Linear interpolation quantile. `p` is in [0, 1]. Empty input is rejected. */
export function quantile(sortedFinite: readonly number[], p: number): number {
  if (sortedFinite.length === 0) {
    throw new AnalysisError(
      "EMPTY_SAMPLES",
      "cannot compute a quantile over an empty sample list",
    );
  }
  if (!Number.isFinite(p) || p < 0 || p > 1) {
    throw new AnalysisError(
      "INVALID_QUANTILE",
      "quantile p must be a finite number in [0, 1]",
    );
  }
  const last = sortedFinite.length - 1;
  const idx = last * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  const loVal = sortedFinite[lo];
  const hiVal = sortedFinite[hi];
  if (loVal === undefined || hiVal === undefined) {
    throw new AnalysisError("EMPTY_SAMPLES", "quantile index was out of range");
  }
  if (lo === hi) {
    return loVal;
  }
  const weight = idx - lo;
  return loVal * (1 - weight) + hiVal * weight;
}

export function mean(values: readonly number[]): number {
  if (values.length === 0) {
    throw new AnalysisError(
      "EMPTY_SAMPLES",
      "cannot compute a mean over an empty sample list",
    );
  }
  let sum = 0;
  for (const value of values) {
    sum += value;
  }
  return sum / values.length;
}

export function populationStdDev(values: readonly number[]): number {
  if (values.length === 0) {
    throw new AnalysisError(
      "EMPTY_SAMPLES",
      "cannot compute stddev over an empty sample list",
    );
  }
  const avg = mean(values);
  let sumSq = 0;
  for (const value of values) {
    const delta = value - avg;
    sumSq += delta * delta;
  }
  return Math.sqrt(sumSq / values.length);
}
