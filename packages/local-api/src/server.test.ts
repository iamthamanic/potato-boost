import { mkdtemp, readdir, readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { type LocalApi, startLocalApi } from "./server.js";

async function occupyPort(): Promise<{
  port: number;
  close: () => Promise<void>;
}> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (address === null || typeof address === "string") {
        reject(new Error("probe bind failed"));
        return;
      }
      resolve({
        port: address.port,
        close: () =>
          new Promise((done) => {
            server.close(() => done());
          }),
      });
    });
  });
}

describe("local api loopback", () => {
  let api: LocalApi | undefined;

  afterEach(async () => {
    await api?.close();
    api = undefined;
  });

  it("binds 127.0.0.1, requires a token, and starts runs idempotently", async () => {
    api = await startLocalApi();
    expect(api.host).toBe("127.0.0.1");
    expect(api.url).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/);

    const denied = await fetch(`${api.url}/api/v1/runs`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: api.url,
        "idempotency-key": "k1",
      },
      body: JSON.stringify({
        targetId: "web-threejs",
        scenarioId: "quick-scan",
        profileId: "budget-local",
      }),
    });
    expect(denied.status).toBe(401);

    const headers = {
      "content-type": "application/json",
      authorization: `Bearer ${api.token}`,
      origin: api.url,
      "idempotency-key": "k1",
    };
    const body = {
      targetId: "web-threejs",
      scenarioId: "quick-scan",
      profileId: "budget-local",
    };
    const created = await fetch(`${api.url}/api/v1/runs`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    expect(created.status).toBe(202);
    const first = (await created.json()) as { runId: string };
    const replay = await fetch(`${api.url}/api/v1/runs`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    expect(replay.status).toBe(202);
    const second = (await replay.json()) as { runId: string };
    expect(second.runId).toBe(first.runId);

    const conflict = await fetch(`${api.url}/api/v1/runs`, {
      method: "POST",
      headers,
      body: JSON.stringify({ ...body, scenarioId: "other" }),
    });
    expect(conflict.status).toBe(409);

    const read = await fetch(`${api.url}/api/v1/runs/${first.runId}`, {
      headers: {
        authorization: `Bearer ${api.token}`,
        origin: api.url,
      },
    });
    expect(read.status).toBe(200);
    const listed = (await read.json()) as { runId: string; status: string };
    expect(listed.runId).toBe(first.runId);
  });

  it("rejects a foreign Origin even with a valid token", async () => {
    api = await startLocalApi();
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
    const body = (await response.json()) as { message: string };
    expect(JSON.stringify(body)).not.toContain(api.token);
  });

  it("picks a free loopback port when the preferred port is occupied", async () => {
    const busy = await occupyPort();
    try {
      api = await startLocalApi({ preferredPort: busy.port });
      expect(api.port).not.toBe(busy.port);
      expect(api.host).toBe("127.0.0.1");
    } finally {
      await busy.close();
    }
  });

  it("resumes SSE from Last-Event-ID and returns 410 after completion", async () => {
    api = await startLocalApi();
    const created = await fetch(`${api.url}/api/v1/runs`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${api.token}`,
        origin: api.url,
        "idempotency-key": "sse",
      },
      body: JSON.stringify({
        targetId: "web-threejs",
        scenarioId: "quick-scan",
        profileId: "budget-local",
      }),
    });
    const { runId } = (await created.json()) as { runId: string };
    const eventsUrl = `${api.url}/api/v1/runs/${runId}/events`;
    const first = await fetch(eventsUrl, {
      headers: {
        authorization: `Bearer ${api.token}`,
        origin: api.url,
      },
    });
    expect(first.status).toBe(200);
    expect(first.headers.get("content-type")).toMatch(/text\/event-stream/);
    const text = await first.text();
    expect(text).toMatch(/id: 1/);
    const resume = await fetch(eventsUrl, {
      headers: {
        authorization: `Bearer ${api.token}`,
        origin: api.url,
        "last-event-id": "1",
      },
    });
    expect(resume.status).toBe(200);
    const resumed = await resume.text();
    expect(resumed).not.toMatch(/id: 1\n/);
    const gone = await fetch(eventsUrl, {
      headers: {
        authorization: `Bearer ${api.token}`,
        origin: api.url,
        "last-event-id": "99",
      },
    });
    expect(gone.status).toBe(410);
  });

  it("detects candidates, writes on confirm only, and reports doctor capabilities", async () => {
    const root = await mkdtemp(join(tmpdir(), "potato-setup-"));
    await writeFile(
      join(root, "package.json"),
      '{"dependencies":{"vite":"1","react":"1"}}',
    );
    await writeFile(join(root, "vite.config.ts"), "export default {}");
    api = await startLocalApi({
      projectRoot: root,
      doctorEnv: {
        nodePath: "/usr/bin/node",
        nodeVersion: "v24.0.0",
        wantedNodeRange: ">=24",
        locateBrowser: async () => null,
        isPortInUse: async () => false,
        appPort: 5199,
      },
    });
    const headers = {
      authorization: `Bearer ${api.token}`,
      origin: "http://127.0.0.1:5173",
      "content-type": "application/json",
    };
    const before = await readdir(root);
    const detect = await fetch(`${api.url}/api/v1/detect`, { headers });
    expect(detect.status).toBe(200);
    const detected = (await detect.json()) as {
      wrote: boolean;
      ambiguous: boolean;
      candidates: { kind: string; confidence: number }[];
    };
    expect(detected.wrote).toBe(false);
    expect(detected.ambiguous).toBe(true);
    expect(detected.candidates.map((c) => c.kind)).toEqual(
      expect.arrayContaining(["vite", "react"]),
    );
    expect(JSON.stringify(detected)).not.toMatch(/96%/);
    expect(await readdir(root)).toEqual(before);

    const preflight = await fetch(`${api.url}/api/v1/detect`, {
      method: "OPTIONS",
      headers: { origin: "http://127.0.0.1:5173" },
    });
    expect(preflight.status).toBe(204);

    const preview = await fetch(`${api.url}/api/v1/config/preview`, {
      method: "POST",
      headers,
      body: JSON.stringify({ adapterId: "vite", start: ["npx", "vite"] }),
    });
    expect(preview.status).toBe(200);
    expect(((await preview.json()) as { wrote: boolean }).wrote).toBe(false);
    expect(await readdir(root)).toEqual(before);

    const cancel = await fetch(`${api.url}/api/v1/config/cancel`, {
      method: "POST",
      headers,
      body: "{}",
    });
    expect(cancel.status).toBe(200);
    expect(((await cancel.json()) as { wrote: boolean }).wrote).toBe(false);
    expect(await readdir(root)).toEqual(before);

    const rooted = await fetch(`${api.url}/api/v1/config/confirm`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        adapterId: "vite",
        start: ["npx", "vite"],
        root: "/etc",
      }),
    });
    expect(rooted.status).toBe(422);
    expect(await readdir(root)).toEqual(before);

    const confirm = await fetch(`${api.url}/api/v1/config/confirm`, {
      method: "POST",
      headers,
      body: JSON.stringify({ adapterId: "vite", start: ["npx", "vite"] }),
    });
    expect(confirm.status).toBe(200);
    const confirmed = (await confirm.json()) as { wrote: boolean };
    expect(confirmed.wrote).toBe(true);
    const yaml = await readFile(join(root, "potato.config.yaml"), "utf8");
    expect(yaml).toMatch(/adapterId: "vite"/);
    expect(yaml).toMatch(/- "npx"/);

    const doctor = await fetch(`${api.url}/api/v1/doctor`, {
      method: "POST",
      headers,
      body: JSON.stringify({ adapterId: "vite", start: ["npx", "vite"] }),
    });
    expect(doctor.status).toBe(200);
    const report = (await doctor.json()) as {
      ok: boolean;
      checks: { id: string; status: string; detail: string }[];
    };
    expect(report.ok).toBe(false);
    const browser = report.checks.find((check) => check.id === "browser");
    expect(browser?.status).toBe("missing");
    expect(browser?.detail).toMatch(/Playwright Chromium/);
  });
});
