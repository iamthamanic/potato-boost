import { describe, expect, it } from "vitest";
import { ApiRequestError } from "./api.js";
import {
  projectApiError,
  projectIdFromPathname,
  projectOverviewPath,
  projectPath,
  projectSetupError,
  rulePackLabel,
  targetProfileLabel,
} from "./projects.js";

describe("project dashboard helpers", () => {
  it("builds and reads encoded project routes", () => {
    expect(projectOverviewPath("project alpha")).toBe(
      "/projects/project%20alpha/overview",
    );
    expect(projectPath("project alpha", "test-setup")).toBe(
      "/projects/project%20alpha/test-setup",
    );
    expect(projectIdFromPathname("/projects/project%20alpha/compare")).toBe(
      "project alpha",
    );
    expect(projectIdFromPathname("/projects/new")).toBeUndefined();
    expect(
      projectIdFromPathname("/projects/%E0%A4%A/overview"),
    ).toBeUndefined();
  });

  it("validates required setup fields without claiming filesystem authority", () => {
    expect(projectSetupError("", "/tmp/app")).toBe("Enter a project name.");
    expect(projectSetupError("App", "")).toBe("Enter the local project path.");
    expect(
      projectSetupError("App", "/missing/is-still-api-validated"),
    ).toBeUndefined();
  });

  it("turns local api statuses into actionable project messages", () => {
    expect(projectApiError(new ApiRequestError("conflict", 409))).toMatch(
      /already registered/i,
    );
    expect(projectApiError(new ApiRequestError("invalid", 422))).toMatch(
      /local path exists/i,
    );
    expect(projectApiError(new ApiRequestError("gone", 404))).toMatch(
      /no longer exists/i,
    );
  });

  it("keeps project setting labels human-readable", () => {
    expect(rulePackLabel("web-performance")).toBe("Web performance");
    expect(targetProfileLabel("low-end-mobile")).toBe("Low-end mobile");
    expect(rulePackLabel("custom-rule-pack")).toBe("custom-rule-pack");
  });
});
