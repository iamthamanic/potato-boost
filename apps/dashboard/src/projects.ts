import { ApiRequestError, apiRequest, readJson } from "./api.js";

export type AdapterId =
  | "web"
  | "vite"
  | "react"
  | "threejs"
  | "unknown"
  | "godot"
  | "tauri"
  | "dotnet";

export type ProjectRecord = {
  id: string;
  name: string;
  root: string;
  adapterId: AdapterId;
  start: string[];
  rulePackIds: string[];
  targetProfileId: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateProjectInput = {
  name: string;
  root: string;
  adapterId: AdapterId;
  start: string[];
  rulePackIds: string[];
  targetProfileId: string;
};

export type UpdateProjectInput = Partial<CreateProjectInput>;

export const ADAPTER_OPTIONS: readonly {
  id: AdapterId;
  label: string;
  detail: string;
}[] = [
  {
    id: "unknown",
    label: "Auto / generic",
    detail:
      "Use when you want to configure the project before choosing an adapter.",
  },
  { id: "vite", label: "Vite", detail: "Vite-powered web application." },
  { id: "react", label: "React", detail: "React web application." },
  { id: "threejs", label: "Three.js", detail: "Three.js or WebGL experience." },
  { id: "web", label: "Web", detail: "Generic browser application." },
  { id: "tauri", label: "Tauri", detail: "Tauri desktop application." },
  { id: "godot", label: "Godot", detail: "Godot project." },
  { id: "dotnet", label: ".NET", detail: ".NET application." },
];

export const RULE_PACKS: readonly {
  id: string;
  label: string;
  detail: string;
}[] = [
  {
    id: "web-performance",
    label: "Web performance",
    detail: "Rendering, frame timing, loading, and core browser performance.",
  },
  {
    id: "javascript-performance",
    label: "JavaScript performance",
    detail: "Runtime work, long tasks, and JavaScript pressure.",
  },
  {
    id: "network-performance",
    label: "Network performance",
    detail: "Requests, transfer behavior, and loading pressure.",
  },
];

export const TARGET_PROFILES: readonly {
  id: string;
  label: string;
  detail: string;
}[] = [
  {
    id: "local-machine",
    label: "Local machine",
    detail: "Measure against the current development machine.",
  },
  {
    id: "low-end-mobile",
    label: "Low-end mobile",
    detail: "Use stricter expectations for constrained mobile hardware.",
  },
  {
    id: "mid-tier-mobile",
    label: "Mid-tier mobile",
    detail: "Use balanced expectations for mainstream mobile hardware.",
  },
];

export function adapterLabel(id: AdapterId): string {
  return ADAPTER_OPTIONS.find((option) => option.id === id)?.label ?? id;
}

export function rulePackLabel(id: string): string {
  return RULE_PACKS.find((option) => option.id === id)?.label ?? id;
}

export function targetProfileLabel(id: string): string {
  return TARGET_PROFILES.find((option) => option.id === id)?.label ?? id;
}

export function projectOverviewPath(projectId: string): string {
  return `/projects/${encodeURIComponent(projectId)}/overview`;
}

export function projectPath(projectId: string, section: string): string {
  return `/projects/${encodeURIComponent(projectId)}/${section}`;
}

export function projectIdFromPathname(pathname: string): string | undefined {
  const raw = /^\/projects\/([^/]+)/.exec(pathname)?.[1];
  if (raw === undefined || raw === "new") {
    return undefined;
  }
  try {
    return decodeURIComponent(raw);
  } catch {
    return undefined;
  }
}

export function projectSetupError(
  name: string,
  root: string,
): string | undefined {
  if (name.trim().length === 0) {
    return "Enter a project name.";
  }
  if (root.trim().length === 0) {
    return "Enter the local project path.";
  }
  return undefined;
}

export function projectApiError(error: unknown): string {
  if (error instanceof ApiRequestError) {
    if (error.status === 409) {
      return "This project path is already registered. Open the existing project instead.";
    }
    if (error.status === 422) {
      return "The project settings could not be saved. Check that the local path exists and the fields are valid.";
    }
    if (error.status === 404) {
      return "This project no longer exists in the local registry.";
    }
    if (error.status === 401 || error.status === 403) {
      return "The local dashboard session is no longer authorized. Restart Potato Boost and try again.";
    }
    return error.message;
  }
  return "The Local API is unreachable. Start Potato Boost and try again.";
}

export async function loadProjects(): Promise<ProjectRecord[]> {
  const body = await readJson<{ projects: ProjectRecord[] }>(
    await apiRequest("/api/v1/projects"),
  );
  return body.projects;
}

export async function createProject(
  input: CreateProjectInput,
): Promise<ProjectRecord> {
  return readJson<ProjectRecord>(
    await apiRequest("/api/v1/projects", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  );
}

export async function updateProject(
  projectId: string,
  input: UpdateProjectInput,
): Promise<ProjectRecord> {
  return readJson<ProjectRecord>(
    await apiRequest(`/api/v1/projects/${encodeURIComponent(projectId)}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  );
}
