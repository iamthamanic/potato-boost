import { describe, expect, it } from "vitest";
import { CollectorError } from "./error.js";
import { collectRun, createCollectorHub } from "./hub.js";
import type { Collector, SampleInput } from "./types.js";

function sample(
  overrides: Partial<SampleInput> & Pick<SampleInput, "source">,
): SampleInput {
  return {
    metric: "cpu.user",
    timestampNs: 1,
    value: 1,
    unit: "us",
    ...overrides,
  };
}

describe("collector hub", () => {
  it("keeps timestamps monotonic per source and stores only sample fields", () => {
    const hub = createCollectorHub();
    const first = hub.ingest(
      sample({
        source: "os",
        timestampNs: 10,
        authorization: "Bearer secret",
      } as SampleInput & { authorization: string }),
    );
    const second = hub.ingest(sample({ source: "os", timestampNs: 11 }));
    hub.ingest(sample({ source: "cdp", timestampNs: 9, metric: "heap.used" }));
    expect(first.timestampNs).toBe(10);
    expect(second.timestampNs).toBe(11);
    expect(JSON.stringify(hub.report().samples)).not.toMatch(/Bearer|secret/);
    expect(Object.keys(first).sort()).toEqual(
      ["metric", "sampleId", "source", "timestampNs", "unit", "value"].sort(),
    );
  });

  it("rejects NaN, Infinity, and backwards timestamps", () => {
    const hub = createCollectorHub();
    hub.ingest(sample({ source: "os", timestampNs: 5 }));
    expect(() =>
      hub.ingest(sample({ source: "os", value: Number.NaN })),
    ).toThrow(CollectorError);
    expect(() =>
      hub.ingest(sample({ source: "os", value: Number.POSITIVE_INFINITY })),
    ).toThrow(CollectorError);
    expect(() => hub.ingest(sample({ source: "os", timestampNs: 4 }))).toThrow(
      /NOT_MONOTONIC|backwards/,
    );
  });

  it("collects browser and OS sources on one timeline without treating missing CDP as a fail", async () => {
    const os: Collector = {
      id: "os",
      collect: async () => ({
        capability: {
          id: "os",
          status: "ok",
          required: true,
          detail: "process sampled",
        },
        samples: [
          sample({
            source: "os",
            metric: "memory.rss",
            unit: "byte",
            value: 2,
          }),
        ],
        processTree: [{ pid: 1, ppid: 0, name: "node" }],
      }),
    };
    const cdpMissing: Collector = {
      id: "cdp",
      collect: async () => ({
        capability: {
          id: "cdp",
          status: "unsupported",
          required: true,
          detail: "CDP not available",
        },
        samples: [],
      }),
    };
    const blocked = await collectRun([os, cdpMissing]);
    expect(blocked.samples.some((item) => item.source === "os")).toBe(true);
    expect(blocked.capabilities.find((item) => item.id === "cdp")?.status).toBe(
      "unsupported",
    );
    expect(blocked.budgetEligible).toBe(false);
    expect(blocked.outcome).toBe("collector-incomplete");

    const cdpOk: Collector = {
      id: "cdp",
      collect: async () => ({
        capability: {
          id: "cdp",
          status: "ok",
          required: true,
          detail: "metrics collected",
        },
        samples: [
          sample({
            source: "cdp",
            metric: "heap.used",
            unit: "byte",
            timestampNs: 2,
            value: 3,
          }),
        ],
      }),
    };
    const ready = await collectRun([os, cdpOk]);
    const sources = new Set(ready.samples.map((item) => item.source));
    expect(sources.has("os")).toBe(true);
    expect(sources.has("cdp")).toBe(true);
    expect(ready.budgetEligible).toBe(true);
    expect(ready.outcome).toBe("ready");
  });
});
