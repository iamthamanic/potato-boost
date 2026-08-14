import { describe, expect, it } from "vitest";
import { runScenario } from "./engine.js";
import { createFakeDriver } from "./fake-driver.js";
import { scenarioSchema } from "./schema.js";

const quickScan = scenarioSchema.parse({
  id: "quick-scan",
  version: "1.0.0",
  measure: [{ action: "sample-frame-time" }],
  repetitions: 3,
});

describe("scenarioSchema", () => {
  it("rejects empty measure", () => {
    expect(() =>
      scenarioSchema.parse({ id: "x", version: "1", measure: [] }),
    ).toThrow(/measure must not be empty/);
  });

  it("accepts a minimal scenario", () => {
    const s = scenarioSchema.parse({
      id: "x",
      version: "1",
      measure: [{ action: "a" }],
    });
    expect(s.repetitions).toBe(1);
    expect(s.timeoutMs).toBe(30_000);
  });
});

describe("runScenario", () => {
  it("runs three repetitions and writes phase events", async () => {
    const driver = createFakeDriver();
    const result = await runScenario(driver, quickScan);
    expect(result.baselineEligible).toBe(true);
    expect(result.error).toBeUndefined();
    const measureEvents = result.events.filter((e) => e.phase === "measure");
    expect(measureEvents).toHaveLength(3);
    expect(
      driver.steps.filter((s) => s.action === "sample-frame-time"),
    ).toHaveLength(3);
  });

  it("marks timeout as not baseline eligible", async () => {
    const driver = createFakeDriver();
    const scenario = scenarioSchema.parse({
      id: "slow",
      version: "1",
      measure: [{ action: "hang" }],
      timeoutMs: 10,
    });
    const hanging = {
      ...driver,
      execute: async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
      },
    };
    const result = await runScenario(hanging, scenario);
    expect(result.baselineEligible).toBe(false);
    expect(result.error).toMatch(/timeout/);
  });

  it("secretRef stays a name, not a value", () => {
    const step = { action: "login", secretRef: "GITHUB_TOKEN" };
    expect(step.secretRef).toBe("GITHUB_TOKEN");
    expect(step).not.toHaveProperty("secretValue");
  });

  it("redacts Authorization args before the driver runs", async () => {
    const seen: string[] = [];
    const driver = {
      ...createFakeDriver(),
      execute: async (step: {
        action: string;
        args?: Record<string, unknown>;
      }) => {
        seen.push(JSON.stringify(step));
      },
    };
    const scenario = scenarioSchema.parse({
      id: "login",
      version: "1",
      measure: [
        {
          action: "login",
          secretRef: "GITHUB_TOKEN",
          args: { authorization: "Bearer CANARY_SECRET_t011_do_not_store" },
        },
      ],
    });
    await runScenario(driver, scenario);
    expect(seen.join("")).not.toContain("CANARY_SECRET_t011_do_not_store");
    expect(seen.join("")).toContain("GITHUB_TOKEN");
  });
});
