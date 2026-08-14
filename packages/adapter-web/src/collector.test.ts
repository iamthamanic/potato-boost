import { collectRun } from "@potato-boost/collector-hub";
import { describe, expect, it } from "vitest";
import {
  type CdpCollectorEnv,
  type CdpHandle,
  cdpCollector,
  collectWebCdp,
} from "./collector.js";

function env(overrides: Partial<CdpCollectorEnv> = {}): CdpCollectorEnv {
  return {
    connectTimeoutMs: 50,
    nowNs: () => 1000,
    connect: async () => null,
    ...overrides,
  };
}

describe("collectWebCdp", () => {
  it("emits browser samples from an injected CDP session", async () => {
    const handle: CdpHandle = {
      getMetrics: async () => [{ name: "heap.used", value: 42, unit: "byte" }],
      close: async () => {},
    };
    const result = await collectWebCdp(
      env({
        connect: async () => handle,
      }),
    );
    expect(result.capability.status).toBe("ok");
    expect(result.samples[0]?.source).toBe("cdp");
    expect(result.samples[0]?.unit).toBe("byte");
    expect(Number.isInteger(result.samples[0]?.timestampNs)).toBe(true);
  });

  it("marks missing CDP as unsupported", async () => {
    const result = await collectWebCdp(env());
    expect(result.capability.status).toBe("unsupported");
    expect(result.samples).toEqual([]);
  });

  it("marks a connect timeout as incomplete", async () => {
    const result = await collectWebCdp(
      env({
        connectTimeoutMs: 20,
        connect: () =>
          new Promise<CdpHandle | null>((resolve) => {
            setTimeout(() => {
              resolve(null);
            }, 200);
          }),
      }),
    );
    expect(result.capability.status).toBe("incomplete");
  });

  it("does not treat missing CDP as a budget fail when composed", async () => {
    const report = await collectRun([cdpCollector(env())]);
    expect(report.capabilities[0]?.status).toBe("unsupported");
    expect(report.budgetEligible).toBe(false);
    expect(report.outcome).toBe("collector-incomplete");
  });
});
