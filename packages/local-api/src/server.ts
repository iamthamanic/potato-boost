import { randomBytes, timingSafeEqual } from "node:crypto";
import { createServer } from "node:net";
import { errorEnvelopeSchema } from "@potato-boost/schemas";
import Fastify, { type FastifyInstance, type FastifyReply } from "fastify";
import { z } from "zod";

const startRunBody = z.object({
  targetId: z.string().min(1),
  scenarioId: z.string().min(1),
  profileId: z.string().min(1),
  rulePackIds: z.array(z.string().min(1)).optional(),
});

export type LocalApi = {
  url: string;
  host: "127.0.0.1";
  port: number;
  token: string;
  close: () => Promise<void>;
};

export type StartLocalApiOptions = {
  preferredPort?: number;
  token?: string;
};

type RunRecord = {
  runId: string;
  status: "queued" | "running" | "completed" | "cancelled" | "failed";
  payloadHash: string;
  events: { id: number; data: string }[];
  done: boolean;
};

function envelope(
  code: string,
  message: string,
  status: number,
  retryable = false,
): { status: number; body: unknown } {
  return {
    status,
    body: errorEnvelopeSchema.parse({ code, message, retryable }),
  };
}

function sendEnvelope(
  reply: FastifyReply,
  code: string,
  message: string,
  status: number,
): FastifyReply {
  const packed = envelope(code, message, status);
  return reply.status(packed.status).send(packed.body);
}

function tokenOk(provided: string | undefined, expected: string): boolean {
  if (provided === undefined || provided.length !== expected.length) {
    return false;
  }
  return timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
}

function readToken(header: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(header) ? header[0] : header;
  if (raw === undefined) {
    return undefined;
  }
  const bearer = /^Bearer\s+(\S+)$/i.exec(raw);
  return bearer?.[1] ?? raw;
}

function loopbackOrigin(port: number, origin: string): boolean {
  try {
    const url = new URL(origin);
    if (url.protocol !== "http:") {
      return false;
    }
    if (url.hostname !== "127.0.0.1" && url.hostname !== "localhost") {
      return false;
    }
    const originPort =
      url.port === "" ? (url.protocol === "http:" ? "80" : "443") : url.port;
    return originPort === String(port);
  } catch {
    return false;
  }
}

function loopbackHost(port: number, hostHeader: string | undefined): boolean {
  if (hostHeader === undefined) {
    return false;
  }
  const host = hostHeader.split(",")[0]?.trim().toLowerCase() ?? "";
  return host === `127.0.0.1:${port}` || host === `localhost:${port}`;
}

function payloadHash(body: unknown): string {
  return Buffer.from(JSON.stringify(body)).toString("hex");
}

async function portFree(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const probe = createServer();
    probe.once("error", () => {
      resolve(false);
    });
    probe.listen(port, "127.0.0.1", () => {
      probe.close(() => resolve(true));
    });
  });
}

export async function startLocalApi(
  options: StartLocalApiOptions = {},
): Promise<LocalApi> {
  const token = options.token ?? randomBytes(32).toString("base64url");
  const preferred = options.preferredPort;
  const port =
    preferred !== undefined && (await portFree(preferred)) ? preferred : 0;

  const runs = new Map<string, RunRecord>();
  const idempotency = new Map<string, string>();
  let boundPort = 0;

  const app: FastifyInstance = Fastify({
    logger: false,
  });

  app.addHook("onRequest", async (request, reply) => {
    boundPort = request.socket.localPort ?? boundPort;
    if (!loopbackHost(boundPort, request.headers.host)) {
      return sendEnvelope(reply, "FORBIDDEN", "host is not loopback", 403);
    }
    const origin = request.headers.origin;
    if (typeof origin === "string" && origin.length > 0) {
      if (!loopbackOrigin(boundPort, origin)) {
        return sendEnvelope(
          reply,
          "FORBIDDEN",
          "origin is not the local dashboard",
          403,
        );
      }
    }
    if (request.method === "OPTIONS") {
      return sendEnvelope(reply, "FORBIDDEN", "cors preflight denied", 403);
    }
    const provided = readToken(request.headers.authorization);
    if (!tokenOk(provided, token)) {
      return sendEnvelope(reply, "UNAUTHORIZED", "run token required", 401);
    }
    return undefined;
  });

  app.post("/api/v1/runs", async (request, reply) => {
    const keyHeader = request.headers["idempotency-key"];
    const key = Array.isArray(keyHeader) ? keyHeader[0] : keyHeader;
    if (key === undefined || key.length === 0) {
      return sendEnvelope(
        reply,
        "BAD_REQUEST",
        "Idempotency-Key is required",
        400,
      );
    }
    const parsed = startRunBody.safeParse(request.body);
    if (!parsed.success) {
      return sendEnvelope(reply, "UNPROCESSABLE", "invalid run request", 422);
    }
    const hash = payloadHash(parsed.data);
    const existingId = idempotency.get(key);
    if (existingId !== undefined) {
      const existing = runs.get(existingId);
      if (existing === undefined) {
        return sendEnvelope(reply, "CONFLICT", "idempotency record lost", 409);
      }
      if (existing.payloadHash !== hash) {
        return sendEnvelope(
          reply,
          "CONFLICT",
          "idempotency key reused with a different payload",
          409,
        );
      }
      return reply.status(202).send({ runId: existing.runId });
    }
    const runId = `run-${randomBytes(8).toString("hex")}`;
    const events = [
      { id: 1, data: JSON.stringify({ phase: "setup", detail: "queued" }) },
      { id: 2, data: JSON.stringify({ phase: "warmup", detail: "ready" }) },
    ];
    runs.set(runId, {
      runId,
      status: "running",
      payloadHash: hash,
      events,
      done: false,
    });
    idempotency.set(key, runId);
    return reply.status(202).send({ runId });
  });

  app.get("/api/v1/runs/:id", async (request, reply) => {
    const params = z.object({ id: z.string().min(1) }).parse(request.params);
    const run = runs.get(params.id);
    if (run === undefined) {
      return sendEnvelope(reply, "NOT_FOUND", "run not found", 404);
    }
    return reply.status(200).send({
      runId: run.runId,
      status: run.status,
    });
  });

  app.get("/api/v1/runs/:id/events", async (request, reply) => {
    const params = z.object({ id: z.string().min(1) }).parse(request.params);
    const run = runs.get(params.id);
    if (run === undefined) {
      return sendEnvelope(reply, "NOT_FOUND", "run not found", 404);
    }
    const lastHeader = request.headers["last-event-id"];
    const lastRaw = Array.isArray(lastHeader) ? lastHeader[0] : lastHeader;
    const lastId = lastRaw !== undefined ? Number(lastRaw) : 0;
    if (run.done && lastId >= (run.events.at(-1)?.id ?? 0)) {
      return sendEnvelope(reply, "GONE", "event stream completed", 410);
    }
    reply.hijack();
    reply.raw.writeHead(200, {
      "content-type": "text/event-stream",
      "cache-control": "no-cache",
      connection: "keep-alive",
    });
    for (const event of run.events) {
      if (event.id > lastId) {
        reply.raw.write(`id: ${event.id}\ndata: ${event.data}\n\n`);
      }
    }
    if (!run.done) {
      run.events.push({
        id: (run.events.at(-1)?.id ?? 0) + 1,
        data: JSON.stringify({ phase: "measure", detail: "stub" }),
      });
      const last = run.events.at(-1);
      if (last !== undefined) {
        reply.raw.write(`id: ${last.id}\ndata: ${last.data}\n\n`);
      }
      run.done = true;
      run.status = "completed";
    }
    reply.raw.end();
    return;
  });

  await app.listen({ host: "127.0.0.1", port });
  const address = app.server.address();
  if (address === null || typeof address === "string") {
    await app.close();
    throw new Error("local api did not bind a TCP port");
  }
  boundPort = address.port;
  const url = `http://127.0.0.1:${boundPort}`;
  return {
    url,
    host: "127.0.0.1",
    port: boundPort,
    token,
    close: async () => {
      await app.close();
    },
  };
}
