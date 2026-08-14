import { describe, expect, it } from "vitest";
import { createGodotScenarioDriver } from "./driver.js";

describe("createGodotScenarioDriver", () => {
  it("records steps and does not expose a write hook", async () => {
    const driver = createGodotScenarioDriver(() => "2026-08-15T00:00:00.000Z");
    await driver.execute({ action: "measure" });
    expect(driver.steps).toHaveLength(1);
    expect(driver.now()).toBe("2026-08-15T00:00:00.000Z");
    expect(driver).not.toHaveProperty("writeFile");
  });
});
