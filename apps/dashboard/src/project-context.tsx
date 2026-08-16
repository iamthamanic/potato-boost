import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  type CreateProjectInput,
  createProject as createProjectRequest,
  loadProjects,
  type ProjectRecord,
  projectApiError,
  type UpdateProjectInput,
  updateProject as updateProjectRequest,
} from "./projects.js";

type ProjectContextValue = {
  status: "loading" | "ready" | "error";
  projects: ProjectRecord[];
  error: string | undefined;
  reload: () => Promise<void>;
  createProject: (input: CreateProjectInput) => Promise<ProjectRecord>;
  updateProject: (
    projectId: string,
    input: UpdateProjectInput,
  ) => Promise<ProjectRecord>;
};

const ProjectContext = createContext<ProjectContextValue | undefined>(
  undefined,
);

export function ProjectProvider(props: { children: ReactNode }) {
  const [status, setStatus] =
    useState<ProjectContextValue["status"]>("loading");
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [error, setError] = useState<string | undefined>(undefined);

  const reload = useCallback(async (): Promise<void> => {
    setStatus("loading");
    setError(undefined);
    try {
      setProjects(await loadProjects());
      setStatus("ready");
    } catch (caught) {
      setError(projectApiError(caught));
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const createProject = useCallback(
    async (input: CreateProjectInput): Promise<ProjectRecord> => {
      const project = await createProjectRequest(input);
      setProjects((current) => [...current, project]);
      setStatus("ready");
      setError(undefined);
      return project;
    },
    [],
  );

  const updateProject = useCallback(
    async (
      projectId: string,
      input: UpdateProjectInput,
    ): Promise<ProjectRecord> => {
      const project = await updateProjectRequest(projectId, input);
      setProjects((current) =>
        current.map((candidate) =>
          candidate.id === project.id ? project : candidate,
        ),
      );
      setStatus("ready");
      setError(undefined);
      return project;
    },
    [],
  );

  const value = useMemo<ProjectContextValue>(
    () => ({
      status,
      projects,
      error,
      reload,
      createProject,
      updateProject,
    }),
    [status, projects, error, reload, createProject, updateProject],
  );

  return (
    <ProjectContext.Provider value={value}>
      {props.children}
    </ProjectContext.Provider>
  );
}

export function useProjects(): ProjectContextValue {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error("useProjects must be used inside ProjectProvider");
  }
  return context;
}
