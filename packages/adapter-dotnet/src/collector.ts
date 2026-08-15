import type { Collector, CollectorResult } from "@potato-boost/collector-hub";

export const DOTNET_COUNTERS_SNAPSHOT = "potato.dotnet-counters.json";

export type DotnetCollectEnv = {
  readSnapshot: () => Promise<string | null>;
};

export type DotnetCounterRow = {
  timestampNs: number;
  cpuPercent: number;
  gcHeapBytes: number;
};

export type DotnetCountersSnapshot = {
  schemaVersion: "1.0.0";
  source: "dotnet.counters";
  samples: DotnetCounterRow[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}

function finiteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function parseRow(raw: unknown): DotnetCounterRow | null {
  if (!isRecord(raw)) {
    return null;
  }
  const timestampNs = raw.timestampNs;
  const cpuPercent = finiteNumber(raw.cpuPercent);
  const gcHeapBytes = finiteNumber(raw.gcHeapBytes);
  if (
    typeof timestampNs !== "number" ||
    !Number.isInteger(timestampNs) ||
    !Number.isFinite(timestampNs) ||
    cpuPercent === undefined ||
    gcHeapBytes === undefined
  ) {
    return null;
  }
  return { timestampNs, cpuPercent, gcHeapBytes };
}

export function parseDotnetCountersSnapshot(
  text: string,
): DotnetCountersSnapshot | null {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  if (!isRecord(raw)) {
    return null;
  }
  if (raw.schemaVersion !== "1.0.0" || raw.source !== "dotnet.counters") {
    return null;
  }
  if (!Array.isArray(raw.samples)) {
    return null;
  }
  const samples: DotnetCounterRow[] = [];
  for (const entry of raw.samples) {
    const row = parseRow(entry);
    if (row === null) {
      return null;
    }
    samples.push(row);
  }
  return { schemaVersion: "1.0.0", source: "dotnet.counters", samples };
}

export function snapshotToSamples(snapshot: DotnetCountersSnapshot) {
  return snapshot.samples.flatMap((row) => [
    {
      source: "dotnet.counters",
      metric: "cpu_percent",
      timestampNs: row.timestampNs,
      value: row.cpuPercent,
      unit: "percent",
    },
    {
      source: "dotnet.counters",
      metric: "gc_heap_bytes",
      timestampNs: row.timestampNs,
      value: row.gcHeapBytes,
      unit: "bytes",
    },
  ]);
}

export async function collectDotnetCounters(
  env: DotnetCollectEnv,
): Promise<CollectorResult> {
  const text = await env.readSnapshot();
  if (text === null) {
    return {
      capability: {
        id: "dotnet.counters",
        status: "unsupported",
        required: false,
        detail: `no ${DOTNET_COUNTERS_SNAPSHOT}; EventPipe is not invented`,
      },
      samples: [],
    };
  }
  const snapshot = parseDotnetCountersSnapshot(text);
  if (snapshot === null) {
    return {
      capability: {
        id: "dotnet.counters",
        status: "incomplete",
        required: false,
        detail: "invalid .NET counters snapshot",
      },
      samples: [],
    };
  }
  const samples = snapshotToSamples(snapshot);
  if (samples.length === 0) {
    return {
      capability: {
        id: "dotnet.counters",
        status: "incomplete",
        required: false,
        detail: "snapshot has no finite counter samples",
      },
      samples: [],
    };
  }
  return {
    capability: {
      id: "dotnet.counters",
      status: "ok",
      required: false,
      detail: `collected ${samples.length} .NET counter sample(s)`,
    },
    samples,
  };
}

export function dotnetCountersCollector(env: DotnetCollectEnv): Collector {
  return {
    id: "dotnet.counters",
    collect: () => collectDotnetCounters(env),
  };
}

export function createNodeCollectEnv(root: string): DotnetCollectEnv {
  return {
    readSnapshot: async () => {
      const { readFile } = await import("node:fs/promises");
      const { join } = await import("node:path");
      try {
        return await readFile(join(root, DOTNET_COUNTERS_SNAPSHOT), "utf8");
      } catch {
        return null;
      }
    },
  };
}
