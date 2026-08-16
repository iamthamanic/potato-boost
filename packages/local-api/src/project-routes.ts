import { join } from "node:path";
import {
  createNodeDotnetEnv,
  detectDotnet,
  mergeDotnetCandidates,
  runDotnetDoctor,
} from "@potato-boost/adapter-dotnet";
import {
  createNodeGodotEnv,
  detectGodot,
  mergeGodotCandidates,
  runGodotDoctor,
} from "@potato-boost/adapter-godot";
import {
  detectTauri,
  mergeTauriCandidates,
  runTauriDoctor,
} from "@potato-boost/adapter-tauri";
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
import {
  createProjectBodySchema,
  type ProjectRecord,
  type ProjectRegistry,
  ProjectRegistryError,
  projectIdParamSchema,
  updateProjectBodySchema,
} from "./projects.js";

const candidateKind = z.enum([
  "web",
  "vite",
  "react",
  "threejs",
  "unknown",
  "godot",
  "tauri",
  "dotnet",
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

type EnvelopeFn = (
  reply: FastifyReply,
  code: string,
  message: string,
  status: number,
) => FastifyReply;

export type ProjectRouteOptions = {
  doctorEnv?: DoctorEnv;
};

function webKindsFromAdapter(
  adapterId: z.infer<typeof candidateKind> | undefined,
  detected: readonly CandidateKind[],
): CandidateKind[] {
  if (adapterId === undefined) {
    return [...detected];
  }
  if (
    adapterId === "godot" ||
    adapterId === "tauri" ||
    adapterId === "dotnet"
  ) {
    return ["unknown"];
  }
  return [adapterId];
}

function inferredStartFor(kind: string): string[] {
  if (
    kind === "vite" ||
    kind === "web" ||
    kind === "react" ||
    kind === "threejs" ||
    kind === "unknown"
  ) {
    return startArgv([kind]);
  }
  return [];
}

function registryError(
  error: unknown,
  reply: FastifyReply,
  sendEnvelope: EnvelopeFn,
): FastifyReply {
  if (error instanceof ProjectRegistryError) {
    if (error.code === "DUPLICATE_ROOT") {
      return sendEnvelope(reply, "CONFLICT", error.message, 409);
    }
    if (error.code === "INVALID_ROOT") {
      return sendEnvelope(reply, "UNPROCESSABLE", error.message, 422);
    }
    if (error.code === "NOT_FOUND") {
      return sendEnvelope(reply, "NOT_FOUND", error.message, 404);
    }
  }
  return sendEnvelope(reply, "INTERNAL", "project registry operation failed", 500);
}

function resolveProject(
  registry: ProjectRegistry,
  params: unknown,
  reply: FastifyReply,
  sendEnvelope: EnvelopeFn,
): ProjectRecord | undefined {
  const parsed = projectIdParamSchema.safeParse(params);
  if (!parsed.success) {
    sendEnvelope(reply, "BAD_REQUEST", "invalid project id", 400);
    return undefined;
  }
  const project = registry.get(parsed.data.projectId);
  if (project === undefined) {
    sendEnvelope(reply, "NOT_FOUND", "project not found", 404);
    return undefined;
  }
  return project;
}

export function registerProjectRoutes(
  app: FastifyInstance,
  registry: ProjectRegistry,
  options: ProjectRouteOptions,
  sendEnvelope: EnvelopeFn,
): void {
  const fs = createNodeDiscoveryFs();
  const configFs = createNodeConfigFs();
  const doctorEnv = options.doctorEnv ?? createNodeDoctorEnv();
  const godotEnv = createNodeGodotEnv();
  const dotnetEnv = createNodeDotnetEnv();

  app.get("/api/v1/projects", async (_request, reply) => {
    return reply.status(200).send({ projects: registry.list() });
  });

  app.post("/api/v1/projects", async (request, reply) => {
    const parsed = createProjectBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return sendEnvelope(reply, "UNPROCESSABLE", "invalid project request", 422);
    }
    try {
      const project = await registry.create(parsed.data);
      return reply.status(201).send(project);
    } catch (error) {
      return registryError(error, reply, sendEnvelope);
    }
  });

  app.get("/api/v1/projects/:projectId", async (request, reply) => {
    const project = resolveProject(registry, request.params, reply, sendEnvelope);
    if (project === undefined) {
      return reply;
    }
    return reply.status(200).send(project);
  });

  app.patch("/api/v1/projects/:projectId", async (request, reply) => {
    const params = projectIdParamSchema.safeParse(request.params);
    const body = updateProjectBodySchema.safeParse(request.body);
    if (!params.success) {
      return sendEnvelope(reply, "BAD_REQUEST", "invalid project id", 400);
    }
    if (!body.success) {
      return sendEnvelope(reply, "UNPROCESSABLE", "invalid project update", 422);
    }
    try {
      const project = await registry.update(params.data.projectId, body.data);
      return reply.status(200).send(project);
    } catch (error) {
      return registryError(error, reply, sendEnvelope);
    }
  });

  async function detect(root: string) {
    return detectProject(fs, root, webDetectors);
  }

  async function detectedCandidates(root: string) {
    const result = await detect(root);
    const godot = await detectGodot(fs, result.root);
    const tauri = await detectTauri(fs, result.root);
    const dotnet = await detectDotnet(fs, result.root);
    const candidates = mergeDotnetCandidates(
      mergeTauriCandidates(
        mergeGodotCandidates(result.candidates, godot.candidate),
        tauri.candidate,
      ),
      dotnet.candidate,
    );
    return { result, godot, tauri, dotnet, candidates };
  }

  app.get("/api/v1/projects/:projectId/detect", async (request, reply) => {
    const project = resolveProject(registry, request.params, reply, sendEnvelope);
    if (project === undefined) {
      return reply;
    }
    const detection = await detectedCandidates(project.root);
    const supported = detection.candidates.filter(
      (candidate) => candidate.kind !== "unknown" && candidate.confidence > 0,
    );
    return reply.status(200).send({
      root: detection.result.root,
      wrote: false,
      ambiguous: supported.length >= 2,
      candidates: detection.candidates.map((candidate) => ({
        kind: candidate.kind,
        confidence: candidate.confidence,
        evidence: candidate.evidence,
        inferredStart: inferredStartFor(candidate.kind),
      })),
    });
  });

  async function makePreview(
    project: ProjectRecord,
    body: z.infer<typeof configBody>,
  ) {
    const detection = await detect(project.root);
    const configPath = join(detection.root, "potato.config.yaml");
    const gitignorePath = join(detection.root, ".gitignore");
    return buildInitPreview({
      canonicalRoot: detection.root,
      kinds:
        body.adapterId === "godot" ||
        body.adapterId === "tauri" ||
        body.adapterId === "dotnet"
          ? ["unknown"]
          : [body.adapterId],
      adapterId: body.adapterId,
      start: body.start,
      configExists: await configFs.exists(configPath),
      gitignoreExists: await configFs.exists(gitignorePath),
    });
  }

  app.post(
    "/api/v1/projects/:projectId/config/preview",
    async (request, reply) => {
      const project = resolveProject(registry, request.params, reply, sendEnvelope);
      if (project === undefined) {
        return reply;
      }
      const parsed = configBody.safeParse(request.body);
      if (!parsed.success) {
        return sendEnvelope(reply, "UNPROCESSABLE", "invalid config request", 422);
      }
      const preview = await makePreview(project, parsed.data);
      await applyInit(configFs, preview, false);
      return reply.status(200).send({
        wrote: false,
        plannedPaths: preview.plannedPaths,
        configYaml: preview.configYaml,
        adapterId: preview.config.adapterId,
        start: preview.config.commands.start,
      });
    },
  );

  app.post(
    "/api/v1/projects/:projectId/config/cancel",
    async (request, reply) => {
      const project = resolveProject(registry, request.params, reply, sendEnvelope);
      if (project === undefined) {
        return reply;
      }
      return reply.status(200).send({ wrote: false, writtenPaths: [] });
    },
  );

  app.post(
    "/api/v1/projects/:projectId/config/confirm",
    async (request, reply) => {
      const project = resolveProject(registry, request.params, reply, sendEnvelope);
      if (project === undefined) {
        return reply;
      }
      const parsed = configBody.safeParse(request.body);
      if (!parsed.success) {
        return sendEnvelope(reply, "UNPROCESSABLE", "invalid config request", 422);
      }
      const preview = await makePreview(project, parsed.data);
      const result = await applyInit(configFs, preview, true);
      await registry.update(project.id, {
        adapterId: parsed.data.adapterId,
        start: parsed.data.start,
      });
      return reply.status(200).send({
        wrote: result.wrote,
        writtenPaths: result.writtenPaths,
        configYaml: preview.configYaml,
        adapterId: preview.config.adapterId,
        start: preview.config.commands.start,
      });
    },
  );

  app.post("/api/v1/projects/:projectId/doctor", async (request, reply) => {
    const project = resolveProject(registry, request.params, reply, sendEnvelope);
    if (project === undefined) {
      return reply;
    }
    const parsed = doctorBody.safeParse(
      request.body === null || request.body === undefined ? {} : request.body,
    );
    if (!parsed.success) {
      return sendEnvelope(reply, "UNPROCESSABLE", "invalid doctor request", 422);
    }
    const detection = await detectedCandidates(project.root);
    const selectedAdapter =
      parsed.data.adapterId ??
      (project.adapterId === "unknown" ? undefined : project.adapterId);
    const kinds = webKindsFromAdapter(
      selectedAdapter,
      detection.result.candidates.map((candidate) => candidate.kind),
    );
    const start =
      parsed.data.start ??
      (project.start.length > 0
        ? project.start
        : await resolveRunStart(configFs, detection.result.root, kinds));
    const report = await runWebDoctor(
      detection.result.root,
      kinds,
      doctorEnv,
      { start },
    );
    const extra: Array<{
      id: string;
      status: string;
      required: boolean;
      path: string;
      detail: string;
    }> = [];
    let ok = report.ok;
    const includeGodot =
      detection.godot.candidate !== null || selectedAdapter === "godot";
    if (includeGodot) {
      const godotReport = await runGodotDoctor(detection.result.root, godotEnv);
      extra.push(...godotReport.checks);
      ok = ok && godotReport.ok;
    }
    const includeTauri =
      detection.tauri.candidate !== null || selectedAdapter === "tauri";
    if (includeTauri) {
      const hasFrontend = kinds.some((kind) => kind !== "unknown");
      const tauriReport = await runTauriDoctor(detection.result.root, hasFrontend);
      extra.push(...tauriReport.checks);
      ok = ok && tauriReport.ok;
    }
    const includeDotnet =
      detection.dotnet.candidate !== null || selectedAdapter === "dotnet";
    if (includeDotnet) {
      const dotnetReport = await runDotnetDoctor(detection.result.root, dotnetEnv);
      extra.push(...dotnetReport.checks);
      ok = ok && dotnetReport.ok;
    }
    if (extra.length === 0) {
      return reply.status(200).send(report);
    }
    return reply.status(200).send({
      root: detection.result.root,
      checks: [...extra, ...report.checks],
      ok,
    });
  });
}
