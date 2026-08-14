import { createServer } from "node:net";
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
});
