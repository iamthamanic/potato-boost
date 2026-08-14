import { randomBytes, timingSafeEqual } from "node:crypto";
import { createServer } from "node:net";
import type { DoctorEnv } from "@potato-boost/adapter-web";
import {
  applyBaseline,
  type BaselinesFile,
  baselineGate,
  compareRuns,
  emptyBaselines,
} from "@potato-boost/analysis";
import { errorEnvelopeSchema } from "@potato-boost/schemas";
import Fastify, { type FastifyInstance, type FastifyReply } from "fastify";
import { z } from "zod";
import { GOLDEN_RUN_ID, goldenSamples, loadArtifactByRunId } from "./golden.js";
import { registerSetupRoutes } from "./setup.js";

const startRunBody = z.object({
  targetId: z.string().min(1),
  scenarioId: z.string().min(1),
  profileId: z.string().min(1),
  rulePackIds: z.array(z.string().min(1)).optional(),
});

const runIdParam = z
  .string()
  .min(1)
  .regex(/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/);

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
  projectRoot?: string;
  doctorEnv?: DoctorEnv;
  runHoldMs?: number;
};

type RunRecord = {
  runId: string;
  status: "queued" | "running" | "completed" | "cancelled" | "failed";
  payloadHash: string;
  events: { id: number; data: string }[];
  done: boolean;
  baselineEligible: boolean;
  sse: import("node:http").ServerResponse[];
  holdTimer: ReturnType<typeof setTimeout> | undefined;
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

function loopbackOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    if (url.protocol !== "http:") {
      return false;
    }
    return url.hostname === "127.0.0.1" || url.hostname === "localhost";
  } catch {
    return false;
  }
}

function allowLoopbackCors(reply: FastifyReply, origin: string): void {
  reply.header("access-control-allow-origin", origin);
  reply.header("vary", "Origin");
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

function pushEvent(
  run: RunRecord,
  payload: { phase: string; detail: string },
): void {
  const event = {
    id: (run.events.at(-1)?.id ?? 0) + 1,
    data: JSON.stringify(payload),
  };
  run.events.push(event);
  for (const sse of run.sse) {
    sse.write(`id: ${event.id}\ndata: ${event.data}\n\n`);
  }
}

function endSse(run: RunRecord): void {
  for (const sse of run.sse) {
    sse.end();
  }
  run.sse = [];
}

function finishRun(
  run: RunRecord,
  status: RunRecord["status"],
  baselineEligible: boolean,
): void {
  if (run.holdTimer !== undefined) {
    clearTimeout(run.holdTimer);
    run.holdTimer = undefined;
  }
  run.status = status;
  run.baselineEligible = baselineEligible;
  run.done = true;
  endSse(run);
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
  const runHoldMs = options.runHoldMs ?? 0;
  let baselines: BaselinesFile = emptyBaselines();

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
      if (!loopbackOrigin(origin)) {
        return sendEnvelope(
          reply,
          "FORBIDDEN",
          "origin is not the local dashboard",
          403,
        );
      }
      allowLoopbackCors(reply, origin);
    }
    if (request.method === "OPTIONS") {
      if (typeof origin === "string" && loopbackOrigin(origin)) {
        reply.header("access-control-allow-methods", "GET, POST, OPTIONS");
        reply.header(
          "access-control-allow-headers",
          "authorization, content-type, idempotency-key, last-event-id",
        );
        reply.header("access-control-max-age", "600");
        return reply.status(204).send();
      }
      return sendEnvelope(reply, "FORBIDDEN", "cors preflight denied", 403);
    }
    if (request.method === "GET") {
      const path = request.url.split("?")[0];
      if (path === "/healthz") {
        return reply.status(200).send({ ok: true });
      }
    }
    const provided = readToken(request.headers.authorization);
    if (!tokenOk(provided, token)) {
      return sendEnvelope(reply, "UNAUTHORIZED", "run token required", 401);
    }
    return undefined;
  });

  registerSetupRoutes(
    app,
    {
      projectRoot: options.projectRoot ?? process.cwd(),
      ...(options.doctorEnv === undefined
        ? {}
        : { doctorEnv: options.doctorEnv }),
    },
    sendEnvelope,
  );

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
      baselineEligible: false,
      sse: [],
      holdTimer: undefined,
    });
    idempotency.set(key, runId);
    return reply.status(202).send({ runId });
  });

  app.get("/api/v1/runs/:id", async (request, reply) => {
    const parsed = z.object({ id: runIdParam }).safeParse(request.params);
    if (!parsed.success) {
      return sendEnvelope(reply, "BAD_REQUEST", "invalid run id", 400);
    }
    const run = runs.get(parsed.data.id);
    if (run === undefined) {
      const fixture = await loadArtifactByRunId(parsed.data.id);
      if (fixture !== undefined) {
        return reply.status(200).send({
          runId: fixture.run.runId,
          status: fixture.run.status,
          baselineEligible: fixture.run.status === "completed",
        });
      }
      return sendEnvelope(reply, "NOT_FOUND", "run not found", 404);
    }
    return reply.status(200).send({
      runId: run.runId,
      status: run.status,
      baselineEligible: run.baselineEligible,
    });
  });

  app.get("/api/v1/runs/:id/artifact", async (request, reply) => {
    const parsed = z.object({ id: runIdParam }).safeParse(request.params);
    if (!parsed.success) {
      return sendEnvelope(reply, "BAD_REQUEST", "invalid run id", 400);
    }
    const fixture = await loadArtifactByRunId(parsed.data.id);
    if (fixture !== undefined) {
      return reply.status(200).send(fixture);
    }
    return sendEnvelope(reply, "NOT_FOUND", "artifact not found", 404);
  });

  app.get("/api/v1/runs/:id/samples", async (request, reply) => {
    const parsed = z.object({ id: runIdParam }).safeParse(request.params);
    if (!parsed.success) {
      return sendEnvelope(reply, "BAD_REQUEST", "invalid run id", 400);
    }
    if (parsed.data.id === GOLDEN_RUN_ID) {
      return reply.status(200).send({ samples: goldenSamples() });
    }
    return sendEnvelope(reply, "NOT_FOUND", "samples not found", 404);
  });

  app.post("/api/v1/runs/:id/abort", async (request, reply) => {
    const parsed = z.object({ id: runIdParam }).safeParse(request.params);
    if (!parsed.success) {
      return sendEnvelope(reply, "BAD_REQUEST", "invalid run id", 400);
    }
    const run = runs.get(parsed.data.id);
    if (run === undefined) {
      return sendEnvelope(reply, "NOT_FOUND", "run not found", 404);
    }
    if (run.status === "cancelled") {
      return reply.status(200).send({
        runId: run.runId,
        status: run.status,
        baselineEligible: false,
      });
    }
    if (run.done) {
      return sendEnvelope(reply, "CONFLICT", "run already finished", 409);
    }
    pushEvent(run, { phase: "cleanup", detail: "aborted" });
    finishRun(run, "cancelled", false);
    return reply.status(200).send({
      runId: run.runId,
      status: "cancelled",
      baselineEligible: false,
    });
  });

  const compareBody = z.object({
    baselineRunId: runIdParam,
    candidateRunId: runIdParam,
  });
  const baselineBody = z.object({
    runId: runIdParam,
    confirm: z.boolean(),
  });

  app.post("/api/v1/compare", async (request, reply) => {
    const parsed = compareBody.safeParse(request.body);
    if (!parsed.success) {
      return sendEnvelope(
        reply,
        "UNPROCESSABLE",
        "invalid compare request",
        422,
      );
    }
    const baseline = await loadArtifactByRunId(parsed.data.baselineRunId);
    const candidate = await loadArtifactByRunId(parsed.data.candidateRunId);
    if (baseline === undefined || candidate === undefined) {
      return sendEnvelope(
        reply,
        "NOT_FOUND",
        "compare artifact not found",
        404,
      );
    }
    return reply.status(200).send(compareRuns(baseline, candidate));
  });

  app.get("/api/v1/baselines", async (_request, reply) => {
    return reply.status(200).send(baselines);
  });

  app.post("/api/v1/baselines", async (request, reply) => {
    const parsed = baselineBody.safeParse(request.body);
    if (!parsed.success) {
      return sendEnvelope(
        reply,
        "UNPROCESSABLE",
        "invalid baseline request",
        422,
      );
    }
    const artifact = await loadArtifactByRunId(parsed.data.runId);
    if (artifact === undefined) {
      return sendEnvelope(reply, "NOT_FOUND", "artifact not found", 404);
    }
    const gate = baselineGate(artifact);
    if (!gate.ok) {
      return sendEnvelope(reply, gate.code, gate.message, 409);
    }
    if (!parsed.data.confirm) {
      return reply.status(200).send({ wrote: false, baselines });
    }
    baselines = applyBaseline(baselines, {
      targetId: artifact.lockedInputs.target.id,
      scenarioId: artifact.lockedInputs.scenario.id,
      profileId: artifact.lockedInputs.profile.id,
      runId: artifact.run.runId,
      setAt: new Date().toISOString().replace(/\.\d+Z$/, "Z"),
    });
    return reply.status(200).send({ wrote: true, baselines });
  });

  app.get("/api/v1/runs/:id/events", async (request, reply) => {
    const parsed = z.object({ id: runIdParam }).safeParse(request.params);
    if (!parsed.success) {
      return sendEnvelope(reply, "BAD_REQUEST", "invalid run id", 400);
    }
    const run = runs.get(parsed.data.id);
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
    const sseHeaders: Record<string, string> = {
      "content-type": "text/event-stream",
      "cache-control": "no-cache",
      connection: "keep-alive",
    };
    const origin = request.headers.origin;
    if (typeof origin === "string" && loopbackOrigin(origin)) {
      sseHeaders["access-control-allow-origin"] = origin;
      sseHeaders.vary = "Origin";
    }
    reply.raw.writeHead(200, sseHeaders);
    for (const event of run.events) {
      if (event.id > lastId) {
        reply.raw.write(`id: ${event.id}\ndata: ${event.data}\n\n`);
      }
    }
    if (run.done) {
      reply.raw.end();
      return;
    }
    run.sse.push(reply.raw);
    if (runHoldMs <= 0) {
      pushEvent(run, { phase: "measure", detail: "stub" });
      finishRun(run, "completed", true);
      return;
    }
    if (run.holdTimer === undefined) {
      run.holdTimer = setTimeout(() => {
        if (run.done) {
          return;
        }
        pushEvent(run, { phase: "measure", detail: "stub" });
        pushEvent(run, { phase: "analyze", detail: "stub" });
        pushEvent(run, { phase: "report", detail: "stub" });
        finishRun(run, "completed", true);
      }, runHoldMs);
    }
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
      for (const run of runs.values()) {
        if (run.holdTimer !== undefined) {
          clearTimeout(run.holdTimer);
          run.holdTimer = undefined;
        }
        endSse(run);
      }
      await app.close();
    },
  };
}
