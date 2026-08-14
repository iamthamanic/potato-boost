import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import {
  captureSessionFromSearch,
  getApiBase,
  getRunToken,
  resetSessionForTests,
} from "./session.js";

describe("dashboard session token", () => {
  afterEach(() => {
    resetSessionForTests();
  });

  it("keeps the run token in memory", () => {
    captureSessionFromSearch("?token=run-token-example&api=http://127.0.0.1:9");
    expect(getRunToken()).toBe("run-token-example");
    expect(getApiBase()).toBe("http://127.0.0.1:9");
  });

  it("does not write token keys to web storage APIs in source", async () => {
    const dir = fileURLToPath(new URL(".", import.meta.url));
    const names = (await readdir(dir)).filter(
      (name) => /\.(ts|tsx)$/.test(name) && !name.includes(".test."),
    );
    const text = (
      await Promise.all(names.map((name) => readFile(join(dir, name), "utf8")))
    ).join("\n");
    expect(text).not.toMatch(/localStorage|sessionStorage/);
    expect(text).not.toMatch(/Performance Score/);
  });
});
