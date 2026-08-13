import { describe, expect, it } from "vitest";
import { runContractHarness } from "./harness.js";
import { adapterManifestSchema } from "./manifest.js";

const validManifest = {
  id: "adapter-web",
  version: "1.0.0",
  capabilities: ["detect", "doctor"],
  detectors: ["web", "vite", "react", "threejs"],
  schemaVersion: "1.0.0",
};

describe("adapterManifestSchema", () => {
  it("accepts a valid manifest", () => {
    const parsed = adapterManifestSchema.parse(validManifest);
    expect(parsed.id).toBe("adapter-web");
  });

  it("rejects missing detectors", () => {
    expect(() =>
      adapterManifestSchema.parse({ ...validManifest, detectors: [] }),
    ).toThrow();
  });

  it("rejects missing capabilities", () => {
    expect(() =>
      adapterManifestSchema.parse({ ...validManifest, capabilities: [] }),
    ).toThrow();
  });
});

describe("runContractHarness", () => {
  it("passes a compatible manifest", () => {
    const result = runContractHarness(validManifest, 1);
    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("rejects schema major mismatch", () => {
    const result = runContractHarness(
      { ...validManifest, schemaVersion: "2.0.0" },
      1,
    );
    expect(result.ok).toBe(false);
    expect(result.errors[0]).toMatch(/schema major mismatch/);
  });

  it("rejects unknown capability", () => {
    const result = runContractHarness(
      { ...validManifest, capabilities: ["unknown-cap"] },
      1,
    );
    expect(result.ok).toBe(false);
  });
});
