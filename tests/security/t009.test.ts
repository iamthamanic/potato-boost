import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createArtifactStore } from "../../packages/artifact-store/src/index.js";
import { createArgvLauncher } from "../../packages/core/src/runner/launch.js";
import { startLocalApi } from "../../packages/local-api/src/index.js";

describe("T-009 security e2e", () => {
  let close: (() => Promise<void>) | undefined;

  afterEach(async () => {
    await close?.();
    close = undefined;
  });

  it("rejects a foreign Origin even with a valid token", async () => {
    const api = await startLocalApi();
    close = api.close;
    const response = await fetch(`${api.url}/api/v1/runs`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${api.token}`,
        origin: "https://evil.example",
        "idempotency-key": "evil",
      },
      body: JSON.stringify({
        targetId: "web-threejs",
        scenarioId: "quick-scan",
        profileId: "budget-local",
      }),
    });
    expect(response.status).toBe(403);
    expect(await response.text()).not.toContain(api.token);
  });

  it("rejects path-traversal run ids and store writes", async () => {
    const api = await startLocalApi();
    close = api.close;
    const headers = {
      authorization: `Bearer ${api.token}`,
      origin: api.url,
    };
    const traversal = await fetch(`${api.url}/api/v1/runs/..%2Fetc%2Fpasswd`, {
      headers,
    });
    expect(traversal.status).toBe(400);
    const slash = await fetch(`${api.url}/api/v1/runs/a/b`, { headers });
    expect([400, 404]).toContain(slash.status);

    const store = createArtifactStore(await mkdtemp(join(tmpdir(), "t009-")));
    await expect(
      store.writeCompleted("../etc", new Uint8Array([1])),
    ).rejects.toMatchObject({ code: "INVALID_RUN_ID" });
  });

  it("passes shell metacharacters as argv, not via /bin/sh -c", async () => {
    const root = await mkdtemp(join(tmpdir(), "t009-spawn-"));
    const out = join(root, "argv.txt");
    const launcher = createArgvLauncher();
    const injected = "; rm -rf / && echo pwned $(uname)";
    const launched = await launcher.start(
      [
        process.execPath,
        "-e",
        "require('node:fs').writeFileSync(process.argv[1], process.argv[2])",
        out,
        injected,
      ],
      root,
    );
    let recorded = "";
    for (let i = 0; i < 50; i += 1) {
      try {
        recorded = await readFile(out, "utf8");
        break;
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
    }
    await launched.kill();
    expect(recorded).toBe(injected);
    expect(recorded).not.toMatch(/^pwned /);
  });
});
