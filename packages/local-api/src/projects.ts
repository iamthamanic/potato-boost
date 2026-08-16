import { randomUUID } from "node:crypto";
import {
  mkdir,
  readFile,
  realpath,
  rename,
  stat,
  writeFile,
} from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { z } from "zod";

const adapterIdSchema = z.enum([
  "web",
  "vite",
  "react",
  "threejs",
  "unknown",
  "godot",
  "tauri",
  "dotnet",
]);

const projectIdSchema = z
  .string()
  .min(1)
  .regex(/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/);

const nameSchema = z.string().trim().min(1).max(120);
const rootSchema = z.string().trim().min(1).max(4096);
const argvSchema = z.array(z.string().min(1).max(512)).max(32);
const rulePackIdsSchema = z.array(z.string().min(1).max(120)).max(32);
const targetProfileIdSchema = z.string().min(1).max(120);

export const createProjectBodySchema = z
  .object({
    name: nameSchema,
    root: rootSchema,
    adapterId: adapterIdSchema.default("unknown"),
    start: argvSchema.default([]),
    rulePackIds: rulePackIdsSchema.default(["web-performance"]),
    targetProfileId: targetProfileIdSchema.default("local-machine"),
  })
  .strict();

export const updateProjectBodySchema = z
  .object({
    name: nameSchema.optional(),
    root: rootSchema.optional(),
    adapterId: adapterIdSchema.optional(),
    start: argvSchema.optional(),
    rulePackIds: rulePackIdsSchema.optional(),
    targetProfileId: targetProfileIdSchema.optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "at least one project field is required",
  });

export const projectIdParamSchema = z.object({ projectId: projectIdSchema });

export type ProjectRecord = {
  id: string;
  name: string;
  root: string;
  adapterId: z.infer<typeof adapterIdSchema>;
  start: string[];
  rulePackIds: string[];
  targetProfileId: string;
  createdAt: string;
  updatedAt: string;
};

const projectRecordSchema: z.ZodType<ProjectRecord> = z.object({
  id: projectIdSchema,
  name: nameSchema,
  root: rootSchema,
  adapterId: adapterIdSchema,
  start: argvSchema,
  rulePackIds: rulePackIdsSchema,
  targetProfileId: targetProfileIdSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const registryFileSchema = z.object({
  version: z.literal(1),
  projects: z.array(projectRecordSchema),
});

type CreateProjectInput = z.infer<typeof createProjectBodySchema>;
type UpdateProjectInput = z.infer<typeof updateProjectBodySchema>;

export type ProjectRegistryErrorCode =
  | "CORRUPT_REGISTRY"
  | "DUPLICATE_ROOT"
  | "INVALID_ROOT"
  | "NOT_FOUND";

export class ProjectRegistryError extends Error {
  readonly code: ProjectRegistryErrorCode;

  constructor(code: ProjectRegistryErrorCode, message: string) {
    super(message);
    this.name = "ProjectRegistryError";
    this.code = code;
  }
}

export type ProjectRegistry = {
  list: () => ProjectRecord[];
  get: (id: string) => ProjectRecord | undefined;
  resolve: (id: string) => Promise<ProjectRecord>;
  create: (input: CreateProjectInput) => Promise<ProjectRecord>;
  update: (id: string, input: UpdateProjectInput) => Promise<ProjectRecord>;
};

export type ProjectRegistryOptions = {
  path?: string;
};

function defaultRegistryPath(): string {
  return join(homedir(), ".potato-boost", "projects.json");
}

function cloneProject(project: ProjectRecord): ProjectRecord {
  return {
    ...project,
    start: [...project.start],
    rulePackIds: [...project.rulePackIds],
  };
}

async function canonicalDirectory(root: string): Promise<string> {
  try {
    const canonical = await realpath(root);
    const info = await stat(canonical);
    if (!info.isDirectory()) {
      throw new ProjectRegistryError(
        "INVALID_ROOT",
        "project root must be an existing directory",
      );
    }
    return canonical;
  } catch (error) {
    if (error instanceof ProjectRegistryError) {
      throw error;
    }
    throw new ProjectRegistryError(
      "INVALID_ROOT",
      "project root must be an existing directory",
    );
  }
}

function findProject(
  projects: readonly ProjectRecord[],
  id: string,
): ProjectRecord {
  const project = projects.find((candidate) => candidate.id === id);
  if (project === undefined) {
    throw new ProjectRegistryError("NOT_FOUND", "project not found");
  }
  return project;
}

async function readRegistry(path: string): Promise<ProjectRecord[]> {
  let raw: string;
  try {
    raw = await readFile(path, "utf8");
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return [];
    }
    throw error;
  }

  try {
    const parsed = registryFileSchema.parse(JSON.parse(raw));
    const uniqueIds = new Set(parsed.projects.map((project) => project.id));
    const uniqueRoots = new Set(parsed.projects.map((project) => project.root));
    if (
      uniqueIds.size !== parsed.projects.length ||
      uniqueRoots.size !== parsed.projects.length
    ) {
      throw new Error("duplicate project identity");
    }
    return parsed.projects.map(cloneProject);
  } catch {
    throw new ProjectRegistryError(
      "CORRUPT_REGISTRY",
      "project registry is invalid; refusing to overwrite it",
    );
  }
}

async function writeRegistry(
  path: string,
  projects: readonly ProjectRecord[],
): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const tempPath = `${path}.${process.pid}.${randomUUID()}.tmp`;
  const content = `${JSON.stringify({ version: 1, projects }, null, 2)}\n`;
  await writeFile(tempPath, content, { encoding: "utf8", mode: 0o600 });
  await rename(tempPath, path);
}

export async function createProjectRegistry(
  options: ProjectRegistryOptions = {},
): Promise<ProjectRegistry> {
  const path = options.path ?? defaultRegistryPath();
  let projects = await readRegistry(path);
  let mutation: Promise<void> = Promise.resolve();

  function enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const result = mutation.then(operation, operation);
    mutation = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  return {
    list: () => projects.map(cloneProject),
    get: (id) => {
      const project = projects.find((candidate) => candidate.id === id);
      return project === undefined ? undefined : cloneProject(project);
    },
    resolve: async (id) => {
      const project = findProject(projects, id);
      const canonicalRoot = await canonicalDirectory(project.root);
      if (canonicalRoot !== project.root) {
        throw new ProjectRegistryError(
          "INVALID_ROOT",
          "project root no longer resolves to its registered location",
        );
      }
      return cloneProject(project);
    },
    create: (input) =>
      enqueue(async () => {
        const canonicalRoot = await canonicalDirectory(input.root);
        if (projects.some((project) => project.root === canonicalRoot)) {
          throw new ProjectRegistryError(
            "DUPLICATE_ROOT",
            "a project for this root already exists",
          );
        }
        const now = new Date().toISOString();
        const project: ProjectRecord = {
          id: randomUUID(),
          name: input.name,
          root: canonicalRoot,
          adapterId: input.adapterId,
          start: [...input.start],
          rulePackIds: [...input.rulePackIds],
          targetProfileId: input.targetProfileId,
          createdAt: now,
          updatedAt: now,
        };
        const next = [...projects, project];
        await writeRegistry(path, next);
        projects = next;
        return cloneProject(project);
      }),
    update: (id, input) =>
      enqueue(async () => {
        const current = findProject(projects, id);
        const canonicalRoot =
          input.root === undefined
            ? current.root
            : await canonicalDirectory(input.root);
        if (
          canonicalRoot !== current.root &&
          projects.some(
            (project) => project.id !== id && project.root === canonicalRoot,
          )
        ) {
          throw new ProjectRegistryError(
            "DUPLICATE_ROOT",
            "a project for this root already exists",
          );
        }
        const updated: ProjectRecord = {
          ...current,
          name: input.name ?? current.name,
          root: canonicalRoot,
          adapterId: input.adapterId ?? current.adapterId,
          start:
            input.start === undefined ? [...current.start] : [...input.start],
          rulePackIds:
            input.rulePackIds === undefined
              ? [...current.rulePackIds]
              : [...input.rulePackIds],
          targetProfileId: input.targetProfileId ?? current.targetProfileId,
          updatedAt: new Date().toISOString(),
        };
        const index = projects.findIndex((project) => project.id === id);
        const next = [...projects];
        next[index] = updated;
        await writeRegistry(path, next);
        projects = next;
        return cloneProject(updated);
      }),
  };
}
