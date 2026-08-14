export type SampleView = {
  sampleId: string;
  source: string;
  metric: string;
  timestampNs: number;
  value: number;
  unit: string;
};

export type ZoomPreset = "all" | "measure";

export const MARKERS = [
  { id: "setup", label: "setup", atNs: 0 },
  { id: "warmup", label: "warmup", atNs: 10 },
  { id: "measure", label: "measure", atNs: 20 },
  { id: "cleanup", label: "cleanup", atNs: 39 },
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function parseSamples(raw: unknown): SampleView[] {
  if (!isRecord(raw) || !Array.isArray(raw.samples)) {
    return [];
  }
  return raw.samples.flatMap((item) => {
    if (!isRecord(item)) {
      return [];
    }
    const sampleId =
      typeof item.sampleId === "string" ? item.sampleId : undefined;
    const source = typeof item.source === "string" ? item.source : undefined;
    const metric = typeof item.metric === "string" ? item.metric : undefined;
    const unit = typeof item.unit === "string" ? item.unit : undefined;
    const timestampNs =
      typeof item.timestampNs === "number" && Number.isInteger(item.timestampNs)
        ? item.timestampNs
        : undefined;
    const value =
      typeof item.value === "number" && Number.isFinite(item.value)
        ? item.value
        : undefined;
    if (
      sampleId === undefined ||
      source === undefined ||
      metric === undefined ||
      unit === undefined ||
      timestampNs === undefined ||
      value === undefined
    ) {
      return [];
    }
    return [{ sampleId, source, metric, timestampNs, value, unit }];
  });
}

export function peakSample(samples: SampleView[]): SampleView | undefined {
  if (samples.length === 0) {
    return undefined;
  }
  const max = Math.max(...samples.map((sample) => sample.value));
  const atMax = samples.filter((sample) => sample.value === max);
  const first = atMax[0];
  if (first === undefined) {
    return undefined;
  }
  return atMax.find((sample) => sample.timestampNs >= 20) ?? first;
}

export function filterByPreset(
  samples: SampleView[],
  preset: ZoomPreset,
): SampleView[] {
  if (preset === "measure") {
    return samples.filter((sample) => sample.timestampNs >= 20);
  }
  return samples;
}
