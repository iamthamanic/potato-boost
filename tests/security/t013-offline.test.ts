import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { runQuickScan } from "../../packages/core/src/runner/quick-scan.js";
import { startLocalApi } from "../../packages/local-api/src/index.js";

describe("offline product traffic (T-013)", () => {
  it("Quick Scan and local API complete without non-loopback fetch", async () => {
    const outbound: string[] = [];
    const original = globalThis.fetch;
    globalThis.fetch = (async (
      input: RequestInfo | URL,
      init?: RequestInit,
    ) => {
      const url = String(input instanceof Request ? input.url : input);
      const host = new URL(url, "http://127.0.0.1").hostname;
      if (host !== "127.0.0.1" && host !== "localhost") {
        outbound.push(url);
        throw new Error(`blocked outbound fetch: ${url}`);
      }
      return original(input, init);
    }) as typeof fetch;
    try {
      const root = await mkdtemp(join(tmpdir(), "potato-offline-"));
      const scan = await runQuickScan(root, { runId: "run-offline" });
      expect(scan.status).toBe("completed");
      const api = await startLocalApi();
      try {
        const created = await fetch(`${api.url}/api/v1/runs`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${api.token}`,
            origin: api.url,
            "idempotency-key": "offline",
          },
          body: JSON.stringify({
            targetId: "web-threejs",
            scenarioId: "quick-scan",
            profileId: "budget-local",
          }),
        });
        expect(created.status).toBe(202);
      } finally {
        await api.close();
      }
      expect(outbound).toEqual([]);
    } finally {
      globalThis.fetch = original;
    }
  });

  it("does not read HTTP_PROXY for product analytics", async () => {
    const { readFile } = await import("node:fs/promises");
    const { fileURLToPath } = await import("node:url");
    const root = fileURLToPath(new URL("../..", import.meta.url));
    const cli = await readFile(
      join(root, "packages/cli/src/program.ts"),
      "utf8",
    );
    expect(cli).not.toMatch(/telemetry|analytics|HTTP_PROXY|HTTPS_PROXY/i);
  });
});
