import { mkdir, mkdtemp, rename } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { type LocalApi, startLocalApi } from "./server.js";

type Project = {
  id: string;
};

type ProjectRun = {
  runId: string;
  projectId: string;
  status: string;
  targetId: string;
  scenarioId: string;
  scenarioLabel: string;
  profileId: string;
  rulePackIds: string[];
  comparable: boolean;
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
  input: {
    name: string;
    adapterId: "vite" | "godot";
    rulePackIds: string[];
    targetProfileId: string;
  },
): Promise<Project> {
  const response = await fetch(`${api.url}/api/v1/projects`, {
    method: "POST",
    headers: headers(api),
    body: JSON.stringify({
      ...input,
      root,
      start: ["pnpm", "dev"],
    }),
  });
  expect(response.status).toBe(201);
  return (await response.json()) as Project;
}

async function startProjectRun(
  api: LocalApi,
  projectId: string,
  key: string,
): Promise<Response> {
  return fetch(`${api.url}/api/v1/projects/${projectId}/runs`, {
    method: "POST",
    headers: { ...headers(api), "idempotency-key": key },
    body: JSON.stringify({ scenarioId: "quick-scan" }),
  });
}

describe("project-scoped local api runs", () => {
  let api: LocalApi | undefined;

  afterEach(async () => {
    await api?.close();
    api = undefined;
  });

  it("snapshots project settings and lists only owned runs", async () => {
    const temp = await mkdtemp(join(tmpdir(), "potato-project-runs-"));
    const rootA = join(temp, "app-a");
    const rootB = join(temp, "app-b");
    await mkdir(rootA);
    await mkdir(rootB);
    api = await startLocalApi({
      projectRegistryPath: join(temp, "projects.json"),
      runHoldMs: 60_000,
    });

    const projectA = await createProject(api, rootA, {
      name: "Web app",
      adapterId: "vite",
      rulePackIds: ["web-performance", "javascript-performance"],
      targetProfileId: "low-end-mobile",
    });
    const projectB = await createProject(api, rootB, {
      name: "Game",
      adapterId: "godot",
      rulePackIds: ["web-performance"],
      targetProfileId: "local-machine",
    });

    const startedA = await startProjectRun(api, projectA.id, "run-a");
    const startedB = await startProjectRun(api, projectB.id, "run-b");
    expect(startedA.status).toBe(202);
    expect(startedB.status).toBe(202);
    const runAId = ((await startedA.json()) as { runId: string }).runId;
    const runBId = ((await startedB.json()) as { runId: string }).runId;
    expect(runAId).not.toBe(runBId);

    const listA = await fetch(
      `${api.url}/api/v1/projects/${projectA.id}/runs`,
      { headers: headers(api) },
    );
    expect(listA.status).toBe(200);
    const bodyA = (await listA.json()) as { runs: ProjectRun[] };
    expect(bodyA.runs).toHaveLength(1);
    expect(bodyA.runs[0]).toMatchObject({
      runId: runAId,
      projectId: projectA.id,
      status: "running",
      targetId: "vite",
      scenarioId: "quick-scan",
      scenarioLabel: "Quick Scan",
      profileId: "low-end-mobile",
      rulePackIds: ["web-performance", "javascript-performance"],
      comparable: false,
    });

    const listB = await fetch(
      `${api.url}/api/v1/projects/${projectB.id}/runs`,
      { headers: headers(api) },
    );
    const bodyB = (await listB.json()) as { runs: ProjectRun[] };
    expect(bodyB.runs).toHaveLength(1);
    expect(bodyB.runs[0]?.runId).toBe(runBId);

    const aborted = await fetch(
      `${api.url}/api/v1/projects/${projectA.id}/runs/${runAId}/abort`,
      { method: "POST", headers: headers(api) },
    );
    expect(aborted.status).toBe(200);
    expect(((await aborted.json()) as { status: string }).status).toBe(
      "cancelled",
    );
  });

  it("rejects cross-project run access and idempotency aliases", async () => {
    const temp = await mkdtemp(join(tmpdir(), "potato-project-ownership-"));
    const rootA = join(temp, "app-a");
    const rootB = join(temp, "app-b");
    await mkdir(rootA);
    await mkdir(rootB);
    api = await startLocalApi({
      projectRegistryPath: join(temp, "projects.json"),
      runHoldMs: 60_000,
    });
    const projectA = await createProject(api, rootA, {
      name: "A",
      adapterId: "vite",
      rulePackIds: ["web-performance"],
      targetProfileId: "local-machine",
    });
    const projectB = await createProject(api, rootB, {
      name: "B",
      adapterId: "godot",
      rulePackIds: ["web-performance"],
      targetProfileId: "local-machine",
    });

    const first = await startProjectRun(api, projectA.id, "shared-key");
    expect(first.status).toBe(202);
    const runAId = ((await first.json()) as { runId: string }).runId;
    expect((await startProjectRun(api, projectB.id, "shared-key")).status).toBe(
      409,
    );

    const secondA = await startProjectRun(api, projectA.id, "second-a");
    const runA2Id = ((await secondA.json()) as { runId: string }).runId;
    const runB = await startProjectRun(api, projectB.id, "run-b");
    const runBId = ((await runB.json()) as { runId: string }).runId;

    const foreignSnapshot = await fetch(
      `${api.url}/api/v1/projects/${projectB.id}/runs/${runAId}`,
      { headers: headers(api) },
    );
    expect(foreignSnapshot.status).toBe(404);

    const foreignCompare = await fetch(
      `${api.url}/api/v1/projects/${projectA.id}/compare`,
      {
        method: "POST",
        headers: headers(api),
        body: JSON.stringify({
          baselineRunId: runAId,
          candidateRunId: runBId,
        }),
      },
    );
    expect(foreignCompare.status).toBe(404);

    const noArtifacts = await fetch(
      `${api.url}/api/v1/projects/${projectA.id}/compare`,
      {
        method: "POST",
        headers: headers(api),
        body: JSON.stringify({
          baselineRunId: runAId,
          candidateRunId: runA2Id,
        }),
      },
    );
    expect(noArtifacts.status).toBe(409);
  });

  it("fails closed when the registered project root moved", async () => {
    const temp = await mkdtemp(join(tmpdir(), "potato-project-run-moved-"));
    const root = join(temp, "app");
    const moved = join(temp, "app-moved");
    await mkdir(root);
    api = await startLocalApi({
      projectRegistryPath: join(temp, "projects.json"),
    });
    const project = await createProject(api, root, {
      name: "Moved app",
      adapterId: "vite",
      rulePackIds: ["web-performance"],
      targetProfileId: "local-machine",
    });
    await rename(root, moved);

    const start = await startProjectRun(api, project.id, "moved-root");
    expect(start.status).toBe(422);
    const list = await fetch(`${api.url}/api/v1/projects/${project.id}/runs`, {
      headers: headers(api),
    });
    expect(list.status).toBe(200);
    expect(((await list.json()) as { runs: ProjectRun[] }).runs).toEqual([]);
  });
});
