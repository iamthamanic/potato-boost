import { parseSample, type Sample } from "@potato-boost/schemas";
import { CollectorError } from "./error.js";
import type {
  CapabilityRecord,
  CollectionReport,
  Collector,
  ProcessInfo,
  SampleInput,
} from "./types.js";

function cleanSample(input: SampleInput, sampleId: string): Sample {
  return parseSample({
    sampleId,
    source: input.source,
    metric: input.metric,
    timestampNs: input.timestampNs,
    value: input.value,
    unit: input.unit,
  });
}

export type CollectorHub = {
  ingest: (input: SampleInput) => Sample;
  recordCapability: (capability: CapabilityRecord) => void;
  recordProcessTree: (tree: readonly ProcessInfo[]) => void;
  report: () => CollectionReport;
};

export function createCollectorHub(): CollectorHub {
  const samples: Sample[] = [];
  const lastNs = new Map<string, number>();
  const capabilities: CapabilityRecord[] = [];
  const processTree: ProcessInfo[] = [];
  let seq = 0;

  return {
    ingest(input: SampleInput): Sample {
      if (!Number.isFinite(input.value)) {
        throw new CollectorError(
          "NON_FINITE",
          "NaN/Infinity sample values are rejected",
        );
      }
      if (
        !Number.isFinite(input.timestampNs) ||
        !Number.isInteger(input.timestampNs)
      ) {
        throw new CollectorError(
          "TIMESTAMP",
          "timestampNs must be a finite integer",
        );
      }
      const previous = lastNs.get(input.source);
      if (previous !== undefined && input.timestampNs < previous) {
        throw new CollectorError(
          "NOT_MONOTONIC",
          `source ${input.source} timestampNs went backwards`,
        );
      }
      lastNs.set(input.source, input.timestampNs);
      const sample = cleanSample(input, `s${seq}`);
      seq += 1;
      samples.push(sample);
      return sample;
    },
    recordCapability(capability: CapabilityRecord): void {
      capabilities.push(capability);
    },
    recordProcessTree(tree: readonly ProcessInfo[]): void {
      processTree.push(...tree);
    },
    report(): CollectionReport {
      const budgetEligible = capabilities.every(
        (capability) => !capability.required || capability.status === "ok",
      );
      return {
        samples,
        capabilities,
        processTree,
        budgetEligible,
        outcome: budgetEligible ? "ready" : "collector-incomplete",
      };
    },
  };
}

export async function collectRun(
  collectors: readonly Collector[],
): Promise<CollectionReport> {
  const hub = createCollectorHub();
  for (const collector of collectors) {
    const result = await collector.collect();
    hub.recordCapability(result.capability);
    if (result.processTree !== undefined) {
      hub.recordProcessTree(result.processTree);
    }
    for (const sample of result.samples) {
      hub.ingest(sample);
    }
  }
  return hub.report();
}
