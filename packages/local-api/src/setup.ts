import { join } from "node:path";
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
  startArgv,
  webDetectors,
} from "@potato-boost/core";
import type { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";

const candidateKind = z.enum(["web", "vite", "react", "threejs", "unknown"]);

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

  async function detect() {
    return detectProject(fs, options.projectRoot, webDetectors);
  }

  app.get("/api/v1/detect", async (_request, reply) => {
    const result = await detect();
    const supported = result.candidates.filter(
      (candidate) => candidate.kind !== "unknown" && candidate.confidence > 0,
    );
    return reply.status(200).send({
      root: result.root,
      wrote: false,
      ambiguous: supported.length >= 2,
      candidates: result.candidates.map((candidate) => ({
        kind: candidate.kind,
        confidence: candidate.confidence,
        evidence: candidate.evidence,
        inferredStart: startArgv([candidate.kind]),
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
    const kinds: CandidateKind[] =
      parsed.data.adapterId === undefined
        ? detection.candidates.map((candidate) => candidate.kind)
        : [parsed.data.adapterId];
    const report = await runWebDoctor(
      detection.root,
      kinds,
      doctorEnv,
      parsed.data.start === undefined ? {} : { start: parsed.data.start },
    );
    return reply.status(200).send(report);
  });

  async function makePreview(body: z.infer<typeof configBody>) {
    const detection = await detect();
    const configPath = join(detection.root, "potato.config.yaml");
    const gitignorePath = join(detection.root, ".gitignore");
    return buildInitPreview({
      canonicalRoot: detection.root,
      kinds: [body.adapterId],
      adapterId: body.adapterId,
      start: body.start,
      configExists: await configFs.exists(configPath),
      gitignoreExists: await configFs.exists(gitignorePath),
    });
  }
}
