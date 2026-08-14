import { describe, expect, it } from "vitest";
import {
  REDACTED,
  redactRecordedInput,
  redactScenarioStep,
  redactUrl,
  scrubJsonText,
} from "./redact.js";

const CANARY = "CANARY_SECRET_t011_do_not_store";

describe("secret redaction (T-011)", () => {
  it("drops Authorization, cookies, bodies, and password fields by default", () => {
    const redacted = redactRecordedInput({
      url: `https://example.test/login?token=${CANARY}&safe=1`,
      headers: {
        Authorization: `Bearer ${CANARY}`,
        Cookie: `sid=${CANARY}`,
        Accept: "application/json",
      },
      body: { password: CANARY },
      password: CANARY,
      secretRef: "APP_PASSWORD",
      note: "ok",
    });
    const json = JSON.stringify(redacted);
    expect(json).not.toContain(CANARY);
    expect(json).not.toMatch(/Bearer /);
    expect(redacted).toMatchObject({
      headers: { Accept: "application/json" },
      secretRef: "APP_PASSWORD",
      note: "ok",
    });
    expect(JSON.stringify(redacted)).not.toMatch(/"body"|"password"/);
    const url = (redacted as { url: string }).url;
    expect(url).not.toContain(CANARY);
    expect(url).toMatch(/token=redacted/);
    expect(url).toMatch(/safe=1/);
  });

  it("keeps secretRef names and redacts values that look like tokens", () => {
    expect(
      redactScenarioStep({ action: "login", secretRef: "GITHUB_TOKEN" }),
    ).toEqual({
      action: "login",
      secretRef: "GITHUB_TOKEN",
    });
    expect(
      redactScenarioStep({
        action: "login",
        secretRef: `ghp_${CANARY}`,
        args: { authorization: `Bearer ${CANARY}`, user: "ada" },
      }),
    ).toEqual({
      action: "login",
      secretRef: REDACTED,
      args: { user: "ada" },
    });
  });

  it("scrubs leftover Bearer and query secrets in artifact JSON", () => {
    const dirty = JSON.stringify({
      detail: `Authorization: Bearer ${CANARY}`,
      href: `https://example.test/?api_key=${CANARY}`,
    });
    const scrubbed = scrubJsonText(dirty);
    expect(scrubbed).not.toContain(CANARY);
    expect(scrubbed).toContain(`Bearer ${REDACTED}`);
    expect(scrubbed).not.toMatch(/"password"\s*:\s*"CANARY/);
  });

  it("redacts query secrets when URL parsing fails", () => {
    expect(redactUrl(`not-a-url?password=${CANARY}`)).not.toContain(CANARY);
  });
});
