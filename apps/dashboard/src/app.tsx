/**
 * Dashboard shell — projects are top-level, workflow destinations live inside a project.
 */
import { Navigate, Route, Routes } from "react-router-dom";
import { Compare } from "./compare.js";
import "./guided-ux.css";
import { LiveRun } from "./live-run.js";
import { NewRun } from "./new-run.js";
import { ProjectProvider } from "./project-context.js";
import { ProjectHome } from "./project-home.js";
import { ProjectRunDetail } from "./project-run-detail.js";
import { ProjectRail, ProjectShell } from "./project-shell.js";
import "./project-ux.css";
import { ProjectWizard } from "./project-wizard.js";
import { ProjectsHub } from "./projects-hub.js";
import "./result-ux.css";
import { RunDetail } from "./run-detail.js";
import "./run-workspace.css";
import { Screen } from "./screen.js";
import { TestSetup } from "./test-setup.js";

export function App() {
  return (
    <ProjectProvider>
      <div className="shell">
        <a className="skip-link" href="#main">
          Skip to main content
        </a>
        <ProjectRail />
        <main id="main" tabIndex={-1}>
          <Routes>
            <Route path="/" element={<Navigate to="/projects" replace />} />
            <Route path="/projects" element={<ProjectsHub />} />
            <Route path="/projects/new" element={<ProjectWizard />} />
            <Route path="/projects/:projectId" element={<ProjectShell />}>
              <Route index element={<Navigate to="overview" replace />} />
              <Route path="overview" element={<ProjectHome />} />
              <Route path="runs" element={<NewRun />} />
              <Route path="runs/:id/live" element={<LiveRun />} />
              <Route path="runs/:id" element={<ProjectRunDetail />} />
              <Route path="compare" element={<Compare />} />
              <Route
                path="scenarios"
                element={
                  <Screen
                    title="Scenarios"
                    empty="No representative scenario yet. Quick Scan works without one; add a scenario when you need repeatable interaction."
                  />
                }
              />
              <Route path="test-setup" element={<TestSetup />} />
            </Route>

            <Route
              path="/project"
              element={<Navigate to="/projects" replace />}
            />
            <Route
              path="/runs/new"
              element={<Navigate to="/projects" replace />}
            />
            <Route
              path="/compare"
              element={<Navigate to="/projects" replace />}
            />
            <Route
              path="/scenarios"
              element={<Navigate to="/projects" replace />}
            />
            <Route
              path="/profiles"
              element={<Navigate to="/projects" replace />}
            />
            <Route
              path="/rules"
              element={<Navigate to="/projects" replace />}
            />
            <Route
              path="/setup/detect"
              element={<Navigate to="/projects" replace />}
            />
            <Route
              path="/setup/doctor"
              element={<Navigate to="/projects" replace />}
            />

            <Route path="/runs/:id/live" element={<LiveRun />} />
            <Route path="/runs/:id" element={<RunDetail />} />
            <Route
              path="/settings"
              element={
                <Screen
                  title="Settings"
                  empty="Potato Boost stays local and offline by default. Application-wide preferences live here."
                />
              }
            />
            <Route path="*" element={<Navigate to="/projects" replace />} />
          </Routes>
        </main>
      </div>
    </ProjectProvider>
  );
}
