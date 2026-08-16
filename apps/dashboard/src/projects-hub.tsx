import { Link } from "react-router-dom";
import { useProjects } from "./project-context.js";
import {
  adapterLabel,
  projectOverviewPath,
  rulePackLabel,
  targetProfileLabel,
} from "./projects.js";

export function ProjectsHub() {
  const { status, projects, error, reload } = useProjects();

  return (
    <section className="workspace-page projects-page">
      <header className="page-header projects-header">
        <div>
          <p className="eyebrow">Local workspaces</p>
          <h2>Projects</h2>
          <p className="muted">
            Choose the project you want to measure, or register another local
            workspace.
          </p>
        </div>
        <Link className="button-link primary-action" to="/projects/new">
          Create project
        </Link>
      </header>

      {status === "loading" ? (
        <div className="panel project-empty" aria-busy="true">
          <p className="status">Loading projects…</p>
        </div>
      ) : null}

      {status === "error" ? (
        <div className="panel project-empty" role="alert">
          <h3>Projects could not be loaded</h3>
          <p>{error}</p>
          <button type="button" onClick={() => void reload()}>
            Retry
          </button>
        </div>
      ) : null}

      {status === "ready" && projects.length === 0 ? (
        <div className="panel project-empty">
          <span className="empty-project-mark" aria-hidden="true">
            +
          </span>
          <h3>No projects yet</h3>
          <p>
            Register a local project once. Potato Boost will keep its test setup
            available for future scans.
          </p>
          <Link className="button-link primary-action" to="/projects/new">
            Create your first project
          </Link>
        </div>
      ) : null}

      {status === "ready" && projects.length > 0 ? (
        <div className="project-grid">
          {projects.map((project) => (
            <article className="project-card" key={project.id}>
              <div className="project-card-head">
                <span className="project-dot" aria-hidden="true" />
                <div>
                  <h3>{project.name}</h3>
                  <p className="mono project-root">{project.root}</p>
                </div>
              </div>
              <dl className="project-card-meta">
                <div>
                  <dt>Project type</dt>
                  <dd>{adapterLabel(project.adapterId)}</dd>
                </div>
                <div>
                  <dt>Target profile</dt>
                  <dd>{targetProfileLabel(project.targetProfileId)}</dd>
                </div>
                <div>
                  <dt>Rules</dt>
                  <dd>
                    {project.rulePackIds.length === 0
                      ? "None selected"
                      : project.rulePackIds.map(rulePackLabel).join(", ")}
                  </dd>
                </div>
              </dl>
              <div className="project-card-actions">
                <Link
                  className="button-link primary-action"
                  to={projectOverviewPath(project.id)}
                >
                  Open project
                </Link>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
