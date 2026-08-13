import { describe, expect, it } from "vitest";
import { CORE_PACKAGE_NAME, workspaceReady } from "./index.js";

describe("workspaceReady", () => {
  it("returns true so the quality gate has a real test", () => {
    expect(workspaceReady()).toBe(true);
  });

  it("exports the package name", () => {
    expect(CORE_PACKAGE_NAME).toBe("@potato-boost/core");
  });
});
