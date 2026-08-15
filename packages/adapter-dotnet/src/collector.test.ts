import { collectRun } from "@potato-boost/collector-hub";
import { describe, expect, it } from "vitest";
import {
  collectDotnetCounters,
  dotnetCountersCollector,
  parseDotnetCountersSnapshot,
} from "./collector.js";

const SNAPSHOT = `{
  "schemaVersion": "1.0.0",
  "source": "dotnet.counters",
  "samples": [
    { "timestampNs": 1000, "cpuPercent": 12.5, "gcHeapBytes": 2048000 },
    { "timestampNs": 2000, "cpuPercent": 14, "gcHeapBytes": 2100000 }
  ]
}`;

describe("collectDotnetCounters", () => {
  it("emits finite samples that collectRun accepts", async () => {
    const result = await collectDotnetCounters({
      readSnapshot: async () => SNAPSHOT,
    });
    expect(result.capability.id).toBe("dotnet.counters");
    expect(result.capability.status).toBe("ok");
    expect(result.capability.required).toBe(false);
    expect(result.samples).toHaveLength(4);
    expect(result.samples[0]?.value).toBe(12.5);
    const report = await collectRun([
      dotnetCountersCollector({ readSnapshot: async () => SNAPSHOT }),
    ]);
    expect(report.outcome).toBe("ready");
    expect(report.budgetEligible).toBe(true);
    expect(
      report.samples.some((sample) => sample.metric === "cpu_percent"),
    ).toBe(true);
  });

  it("is unsupported and not required when the snapshot is missing", async () => {
    const result = await collectDotnetCounters({
      readSnapshot: async () => null,
    });
    expect(result.capability.status).toBe("unsupported");
    expect(result.capability.required).toBe(false);
    expect(result.samples).toEqual([]);
    const report = await collectRun([
      dotnetCountersCollector({ readSnapshot: async () => null }),
    ]);
    expect(report.budgetEligible).toBe(true);
    expect(report.capabilities[0]?.status).toBe("unsupported");
  });

  it("rejects NaN and Infinity", () => {
    expect(
      parseDotnetCountersSnapshot(
        JSON.stringify({
          schemaVersion: "1.0.0",
          source: "dotnet.counters",
          samples: [{ timestampNs: 1, cpuPercent: Number.NaN, gcHeapBytes: 1 }],
        }),
      ),
    ).toBeNull();
    expect(
      parseDotnetCountersSnapshot(
        JSON.stringify({
          schemaVersion: "1.0.0",
          source: "dotnet.counters",
          samples: [
            {
              timestampNs: 1,
              cpuPercent: 1,
              gcHeapBytes: Number.POSITIVE_INFINITY,
            },
          ],
        }),
      ),
    ).toBeNull();
  });
});
