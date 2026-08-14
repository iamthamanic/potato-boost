import { join } from "node:path";
import {
  createNodeGodotEnv,
  detectGodot,
  mergeGodotCandidates,
  runGodotDoctor,
} from "@potato-boost/adapter-godot";
import {
  createNodeDoctorEnv,
  type DoctorEnv,
  runWebDoctor,
} from "@potato-boost/adapter-web";
import {
  applyInit,
  buildInitPreview,
  type CandidateKind,
  createNodeConfigFs,
  createNodeDiscoveryFs,
  detectProject,
  resolveRunStart,
  startArgv,
  webDetectors,
} from "@potato-boost/core";
import type { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";

const candidateKind = z.enum([
  "web",
  "vite",
  "react",
  "threejs",
  "unknown",
  "godot",
]);

const configBody = z
  .object({
    adapterId: candidateKind,
    start: z.array(z.string().min(1)),
  })
  .strict();

const doctorBody = z
  .object({
    adapterId: candidateKind.optional(),
    start: z.array(z.string().min(1)).optional(),
  })
  .strict();

function webKindsFromAdapter(
  adapterId: z.infer<typeof candidateKind> | undefined,
  detected: readonly CandidateKind[],
): CandidateKind[] {
  if (adapterId === undefined) {
    return [...detected];
  }
  if (adapterId === "godot") {
    return ["unknown"];
  }
  return [adapterId];
}

function inferredStartFor(kind: string): string[] {
  if (kind === "vite") {
    return startArgv(["vite"]);
  }
  if (kind === "web") {
    return startArgv(["web"]);
  }
  if (kind === "react") {
    return startArgv(["react"]);
  }
  if (kind === "threejs") {
    return startArgv(["threejs"]);
  }
  if (kind === "unknown") {
    return startArgv(["unknown"]);
  }
  return [];
}

export type SetupOptions = {
  projectRoot: string;
  doctorEnv?: DoctorEnv;
};

type EnvelopeFn = (
  reply: FastifyReply,
  code: string,
  message: string,
  status: number,
) => FastifyReply;

export function registerSetupRoutes(
  app: FastifyInstance,
  options: SetupOptions,
  sendEnvelope: EnvelopeFn,
): void {
  const fs = createNodeDiscoveryFs();
  const configFs = createNodeConfigFs();
  const doctorEnv = options.doctorEnv ?? createNodeDoctorEnv();

  const godotEnv = createNodeGodotEnv();

  async function detect() {
    return detectProject(fs, options.projectRoot, webDetectors);
  }

  app.get("/api/v1/detect", async (_request, reply) => {
    const result = await detect();
    const godot = await detectGodot(fs, result.root);
    const candidates = mergeGodotCandidates(result.candidates, godot.candidate);
    const supported = candidates.filter(
      (candidate) => candidate.kind !== "unknown" && candidate.confidence > 0,
    );
    return reply.status(200).send({
      root: result.root,
      wrote: false,
      ambiguous: supported.length >= 2,
      candidates: candidates.map((candidate) => ({
        kind: candidate.kind,
        confidence: candidate.confidence,
        evidence: candidate.evidence,
        inferredStart: inferredStartFor(candidate.kind),
      })),
    });
  });

  app.post("/api/v1/config/preview", async (request, reply) => {
    const parsed = configBody.safeParse(request.body);
    if (!parsed.success) {
      return sendEnvelope(
        reply,
        "UNPROCESSABLE",
        "invalid config request",
        422,
      );
    }
    const preview = await makePreview(parsed.data);
    await applyInit(configFs, preview, false);
    return reply.status(200).send({
      wrote: false,
      plannedPaths: preview.plannedPaths,
      configYaml: preview.configYaml,
      adapterId: preview.config.adapterId,
      start: preview.config.commands.start,
    });
  });

  app.post("/api/v1/config/cancel", async (_request, reply) => {
    return reply.status(200).send({ wrote: false, writtenPaths: [] });
  });

  app.post("/api/v1/config/confirm", async (request, reply) => {
    const parsed = configBody.safeParse(request.body);
    if (!parsed.success) {
      return sendEnvelope(
        reply,
        "UNPROCESSABLE",
        "invalid config request",
        422,
      );
    }
    const preview = await makePreview(parsed.data);
    const result = await applyInit(configFs, preview, true);
    return reply.status(200).send({
      wrote: result.wrote,
      writtenPaths: result.writtenPaths,
      configYaml: preview.configYaml,
      adapterId: preview.config.adapterId,
      start: preview.config.commands.start,
    });
  });

  app.post("/api/v1/doctor", async (request, reply) => {
    const parsed = doctorBody.safeParse(
      request.body === null || request.body === undefined ? {} : request.body,
    );
    if (!parsed.success) {
      return sendEnvelope(
        reply,
        "UNPROCESSABLE",
        "invalid doctor request",
        422,
      );
    }
    const detection = await detect();
    const godot = await detectGodot(fs, detection.root);
    const kinds = webKindsFromAdapter(
      parsed.data.adapterId,
      detection.candidates.map((candidate) => candidate.kind),
    );
    const start =
      parsed.data.start ??
      (await resolveRunStart(configFs, detection.root, kinds));
    const report = await runWebDoctor(detection.root, kinds, doctorEnv, {
      start,
    });
    const includeGodot =
      godot.candidate !== null || parsed.data.adapterId === "godot";
    if (!includeGodot) {
      return reply.status(200).send(report);
    }
    const godotReport = await runGodotDoctor(detection.root, godotEnv);
    return reply.status(200).send({
      root: detection.root,
      checks: [...godotReport.checks, ...report.checks],
      ok: godotReport.ok && report.ok,
    });
  });

  async function makePreview(body: z.infer<typeof configBody>) {
    const detection = await detect();
    const configPath = join(detection.root, "potato.config.yaml");
    const gitignorePath = join(detection.root, ".gitignore");
    return buildInitPreview({
      canonicalRoot: detection.root,
      kinds: body.adapterId === "godot" ? ["unknown"] : [body.adapterId],
      adapterId: body.adapterId,
      start: body.start,
      configExists: await configFs.exists(configPath),
      gitignoreExists: await configFs.exists(gitignorePath),
    });
  }
}
