import {
  mkdir,
  mkdtemp,
  realpath,
  rename,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { type LocalApi, startLocalApi } from "./server.js";

type Project = {
  id: string;
  name: string;
  root: string;
  adapterId: string;
  start: string[];
  rulePackIds: string[];
  targetProfileId: string;
};

function headers(api: LocalApi): Record<string, string> {
  return {
    authorization: `Bearer ${api.token}`,
    "content-type": "application/json",
    origin: api.url,
  };
}

async function createProject(
  api: LocalApi,
  root: string,
  name = "Fixture app",
): Promise<Response> {
  return fetch(`${api.url}/api/v1/projects`, {
    method: "POST",
    headers: headers(api),
    body: JSON.stringify({
      name,
      root,
      adapterId: "vite",
      start: ["pnpm", "dev"],
      rulePackIds: ["web-performance"],
      targetProfileId: "local-machine",
    }),
  });
}

describe("local project registry", () => {
  let api: LocalApi | undefined;

  afterEach(async () => {
    await api?.close();
    api = undefined;
  });

  it("persists projects and their settings across api restarts", async () => {
    const temp = await mkdtemp(join(tmpdir(), "potato-projects-"));
    const root = join(temp, "app");
    const updatedRoot = join(temp, "app-renamed");
    const registryPath = join(temp, "state", "projects.json");
    await mkdir(root);
    await mkdir(updatedRoot);

    api = await startLocalApi({ projectRegistryPath: registryPath });
    const created = await createProject(api, root);
    expect(created.status).toBe(201);
    const project = (await created.json()) as Project;
    expect(project.name).toBe("Fixture app");
    expect(project.root).toBe(await realpath(root));
    expect(project.start).toEqual(["pnpm", "dev"]);

    const patched = await fetch(`${api.url}/api/v1/projects/${project.id}`, {
      method: "PATCH",
      headers: headers(api),
      body: JSON.stringify({
        root: updatedRoot,
        rulePackIds: ["web-performance", "javascript-performance"],
        targetProfileId: "low-end-mobile",
      }),
    });
    expect(patched.status).toBe(200);
    const updated = (await patched.json()) as Project;
    expect(updated.root).toBe(await realpath(updatedRoot));

    await api.close();
    api = await startLocalApi({ projectRegistryPath: registryPath });
    const listed = await fetch(`${api.url}/api/v1/projects`, {
      headers: headers(api),
    });
    expect(listed.status).toBe(200);
    const body = (await listed.json()) as { projects: Project[] };
    expect(body.projects).toHaveLength(1);
    expect(body.projects[0]?.id).toBe(project.id);
    expect(body.projects[0]?.root).toBe(await realpath(updatedRoot));
    expect(body.projects[0]?.rulePackIds).toEqual([
      "web-performance",
      "javascript-performance",
    ]);
    expect(body.projects[0]?.targetProfileId).toBe("low-end-mobile");
  });

  it("uses only the registered project root for scoped detection", async () => {
    const temp = await mkdtemp(join(tmpdir(), "potato-project-root-"));
    const startupRoot = join(temp, "startup");
    const projectRoot = join(temp, "selected");
    await mkdir(startupRoot);
    await mkdir(projectRoot);
    await writeFile(
      join(projectRoot, "package.json"),
      JSON.stringify({
        scripts: { dev: "vite" },
        devDependencies: { vite: "latest" },
      }),
      "utf8",
    );

    api = await startLocalApi({
      projectRoot: startupRoot,
      projectRegistryPath: join(temp, "projects.json"),
    });
    const created = await createProject(api, projectRoot, "Selected app");
    const project = (await created.json()) as Project;

    const detected = await fetch(
      `${api.url}/api/v1/projects/${project.id}/detect`,
      { headers: headers(api) },
    );
    expect(detected.status).toBe(200);
    const body = (await detected.json()) as { root: string };
    expect(body.root).toBe(await realpath(projectRoot));
    expect(body.root).not.toBe(await realpath(startupRoot));

    const unknown = await fetch(
      `${api.url}/api/v1/projects/not-a-project/detect`,
      { headers: headers(api) },
    );
    expect(unknown.status).toBe(404);
  });

  it("fails closed when a registered project root moves", async () => {
    const temp = await mkdtemp(join(tmpdir(), "potato-project-moved-"));
    const projectRoot = join(temp, "selected");
    const movedRoot = join(temp, "moved");
    await mkdir(projectRoot);
    api = await startLocalApi({
      projectRegistryPath: join(temp, "projects.json"),
    });
    const created = await createProject(api, projectRoot, "Selected app");
    const project = (await created.json()) as Project;
    await rename(projectRoot, movedRoot);

    const detected = await fetch(
      `${api.url}/api/v1/projects/${project.id}/detect`,
      { headers: headers(api) },
    );
    expect(detected.status).toBe(422);

    const readable = await fetch(`${api.url}/api/v1/projects/${project.id}`, {
      headers: headers(api),
    });
    expect(readable.status).toBe(200);
  });

  it("rejects duplicate and invalid project roots", async () => {
    const temp = await mkdtemp(join(tmpdir(), "potato-project-errors-"));
    const root = join(temp, "app");
    await mkdir(root);
    api = await startLocalApi({
      projectRegistryPath: join(temp, "projects.json"),
    });

    expect((await createProject(api, root)).status).toBe(201);
    expect((await createProject(api, root, "Duplicate")).status).toBe(409);
    expect(
      (await createProject(api, join(temp, "missing"), "Missing")).status,
    ).toBe(422);
  });

  it("fails closed when the persisted registry is corrupt", async () => {
    const temp = await mkdtemp(join(tmpdir(), "potato-project-corrupt-"));
    const registryPath = join(temp, "projects.json");
    await writeFile(registryPath, "{ definitely-not-json", "utf8");

    await expect(
      startLocalApi({ projectRegistryPath: registryPath }),
    ).rejects.toThrow(/registry is invalid/i);
  });
});
