import type { Sample } from "@potato-boost/schemas";

export type CollectorCapabilityStatus =
  | "ok"
  | "missing"
  | "unsupported"
  | "incomplete";

export type CapabilityRecord = {
  id: string;
  status: CollectorCapabilityStatus;
  required: boolean;
  detail: string;
};

export type SampleInput = {
  source: string;
  metric: string;
  timestampNs: number;
  value: number;
  unit: string;
};

export type CollectorResult = {
  capability: CapabilityRecord;
  samples: readonly SampleInput[];
  processTree?: readonly ProcessInfo[];
};

export type ProcessInfo = {
  pid: number;
  ppid: number;
  name: string;
};

export type Collector = {
  id: string;
  collect: () => Promise<CollectorResult>;
};

export type CollectionOutcome = "ready" | "collector-incomplete";

export type CollectionReport = {
  samples: readonly Sample[];
  capabilities: readonly CapabilityRecord[];
  processTree: readonly ProcessInfo[];
  budgetEligible: boolean;
  outcome: CollectionOutcome;
};
