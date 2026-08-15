import { collectRun } from "@potato-boost/collector-hub";
import { describe, expect, it } from "vitest";
import {
  collectGodotPerformance,
  godotPerformanceCollector,
  parseGodotPerformanceSnapshot,
  snapshotToSamples,
} from "./collector.js";

const SNAPSHOT = `{
  "schemaVersion": "1.0.0",
  "source": "godot.performance",
  "samples": [
    { "timestampNs": 1000, "timeProcessS": 0.016, "fps": 60 },
    { "timestampNs": 2000, "timeProcessS": 0.017, "fps": 58 }
  ]
}`;

describe("collectGodotPerformance", () => {
  it("emits frame_time samples that parse as CON-001 samples", async () => {
    const result = await collectGodotPerformance({
      readSnapshot: async () => SNAPSHOT,
    });
    expect(result.capability.id).toBe("godot.performance");
    expect(result.capability.status).toBe("ok");
    expect(result.capability.required).toBe(false);
    const frame = result.samples.filter(
      (sample) => sample.metric === "frame_time",
    );
    expect(frame).toHaveLength(2);
    expect(frame[0]?.source).toBe("godot.performance");
    expect(frame[0]?.value).toBe(16);
    expect(frame[0]?.unit).toBe("ms");
    const report = await collectRun([
      godotPerformanceCollector({ readSnapshot: async () => SNAPSHOT }),
    ]);
    expect(report.outcome).toBe("ready");
    expect(
      report.samples.some((sample) => sample.metric === "frame_time"),
    ).toBe(true);
  });

  it("is unsupported and not required when the snapshot is missing", async () => {
    const result = await collectGodotPerformance({
      readSnapshot: async () => null,
    });
    expect(result.capability.status).toBe("unsupported");
    expect(result.capability.required).toBe(false);
    expect(result.samples).toEqual([]);
    const report = await collectRun([
      godotPerformanceCollector({ readSnapshot: async () => null }),
    ]);
    expect(report.budgetEligible).toBe(true);
    expect(report.capabilities[0]?.status).toBe("unsupported");
  });

  it("rejects NaN and non-finite monitors", () => {
    expect(
      parseGodotPerformanceSnapshot(
        JSON.stringify({
          schemaVersion: "1.0.0",
          source: "godot.performance",
          samples: [{ timestampNs: Number.NaN, fps: 60 }],
        }),
      ),
    ).toBeNull();
    const parsed = parseGodotPerformanceSnapshot(
      JSON.stringify({
        schemaVersion: "1.0.0",
        source: "godot.performance",
        samples: [{ timestampNs: 1, timeProcessS: Number.POSITIVE_INFINITY }],
      }),
    );
    expect(parsed).not.toBeNull();
    expect(
      snapshotToSamples(
        parsed ?? {
          schemaVersion: "1.0.0",
          source: "godot.performance",
          samples: [],
        },
      ),
    ).toEqual([]);
  });
});
