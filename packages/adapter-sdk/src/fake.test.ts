import { parseSample } from "@potato-boost/schemas";
import { describe, expect, it } from "vitest";
import {
  collectFake,
  detectFake,
  doctorFake,
  FAKE_MANIFEST,
  FAKE_MARKER,
  launchFake,
} from "./fake.js";
import { runContractHarness } from "./harness.js";

describe("fake adapter", () => {
  it("passes the manifest contract harness", () => {
    const result = runContractHarness(FAKE_MANIFEST, 1);
    expect(result.ok).toBe(true);
    expect(FAKE_MANIFEST.capabilities).toEqual(
      expect.arrayContaining(["detect", "doctor", "launch", "collector"]),
    );
  });

  it("detects only when the fake marker is listed", () => {
    expect(detectFake([FAKE_MARKER]).kind).toBe("fake");
    expect(detectFake(["package.json"]).kind).toBe("unknown");
  });

  it("doctors without touching the network", () => {
    expect(doctorFake({ nodePresent: true }).ok).toBe(true);
    expect(doctorFake({ nodePresent: false }).ok).toBe(false);
  });

  it("launch kill is local and writes no files", async () => {
    const launched = launchFake();
    expect(launched.pid).toBe(0);
    await launched.kill();
    expect(launched.killed).toBe(true);
  });

  it("collects monotonically ordered schema-valid samples", () => {
    const result = collectFake({ count: 4 });
    expect(result.quality).toBe("valid");
    expect(result.dropped).toBe(0);
    const stamps = result.samples.map((sample) => sample.timestampNs);
    expect(stamps).toEqual([...stamps].sort((a, b) => a - b));
    for (const sample of result.samples) {
      const parsed = parseSample({ sampleId: "s", ...sample });
      expect(parsed.timestampNs).toBe(sample.timestampNs);
    }
  });

  it("drops overflow samples and degrades quality under backpressure", () => {
    const result = collectFake({ count: 20, maxBuffer: 4 });
    expect(result.samples).toHaveLength(4);
    expect(result.dropped).toBe(16);
    expect(result.quality).toBe("degraded");
    expect(result.quality).not.toBe("valid");
  });
});
