import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useParams,
} from "react-router-dom";
import { useProjects } from "./project-context.js";
import {
  adapterLabel,
  projectIdFromPathname,
  projectOverviewPath,
  projectPath,
} from "./projects.js";

export function ProjectRail() {
  const location = useLocation();
  const activeProjectId = projectIdFromPathname(location.pathname);
  const { status, projects, error, reload } = useProjects();

  return (
    <nav className="nav project-rail" aria-label="Projects">
      <div className="nav-brand">
        <Link className="brand-link" to="/projects">
          Potato Boost
        </Link>
        <p className="nav-project">Local performance workbench</p>
      </div>

      <div className="rail-heading">
        <span>Projects</span>
        <Link className="rail-add" to="/projects/new">
          + Create
        </Link>
      </div>

      <Link
        className={location.pathname === "/projects" ? "rail-all is-active" : "rail-all"}
        to="/projects"
        aria-current={location.pathname === "/projects" ? "page" : undefined}
      >
        All projects
      </Link>

      {status === "loading" ? (
        <p className="rail-status muted" role="status">
          Loading projects…
        </p>
      ) : null}

      {status === "error" ? (
        <div className="rail-error" role="alert">
          <p>{error}</p>
          <button type="button" onClick={() => void reload()}>
            Retry
          </button>
        </div>
      ) : null}

      {status === "ready" ? (
        <ul className="project-switcher">
          {projects.map((project) => {
            const active = activeProjectId === project.id;
            return (
              <li key={project.id}>
                <Link
                  className={active ? "project-switch is-active" : "project-switch"}
                  to={projectOverviewPath(project.id)}
                  aria-current={active ? "true" : undefined}
                >
                  <span className="project-switch-name">
                    <span className="project-dot" aria-hidden="true" />
                    {project.name}
                  </span>
                  <span className="project-switch-meta">
                    {adapterLabel(project.adapterId)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : null}

      <div className="nav-bottom">
        <NavLink to="/settings">Settings</NavLink>
      </div>
    </nav>
  );
}

export function ProjectShell() {
  const { projectId } = useParams();
  const { status, projects, error, reload } = useProjects();
  const project = projects.find((candidate) => candidate.id === projectId);

  if (status === "loading") {
    return (
      <section className="workspace-page" aria-busy="true">
        <p className="status">Loading project…</p>
      </section>
    );
  }

  if (status === "error") {
    return (
      <section className="workspace-page">
        <div className="panel">
          <h2>Project unavailable</h2>
          <p>{error}</p>
          <button type="button" onClick={() => void reload()}>
            Retry
          </button>
        </div>
      </section>
    );
  }

  if (projectId === undefined || project === undefined) {
    return (
      <section className="workspace-page">
        <div className="panel empty-project">
          <p className="eyebrow">Project not found</p>
          <h2>This project is not in your local registry</h2>
          <p>
            It may have been removed or the URL may be outdated. Choose a local
            project to continue.
          </p>
          <Link className="button-link primary-action" to="/projects">
            Back to projects
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="project-workspace">
      <header className="project-context-bar">
        <div className="project-context-title">
          <span className="project-dot" aria-hidden="true" />
          <div>
            <strong>{project.name}</strong>
            <span>{adapterLabel(project.adapterId)}</span>
          </div>
        </div>
        <nav className="project-tabs" aria-label={`${project.name} sections`}>
          <NavLink to={projectPath(project.id, "overview")}>Overview</NavLink>
          <NavLink to={projectPath(project.id, "runs")}>Runs</NavLink>
          <NavLink to={projectPath(project.id, "compare")}>Compare</NavLink>
          <NavLink to={projectPath(project.id, "scenarios")}>Scenarios</NavLink>
        </nav>
        <Link
          className="button-link project-setup-link"
          to={projectPath(project.id, "test-setup")}
        >
          Test Setup
        </Link>
      </header>
      <Outlet />
    </section>
  );
}
