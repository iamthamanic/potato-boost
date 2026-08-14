/**
 * Dashboard shell — skip link, primary nav, and PRD routes.
 * Location: apps/dashboard/src/app.tsx
 */
import { NavLink, Route, Routes } from "react-router-dom";
import { LiveRun } from "./live-run.js";
import { NewRun } from "./new-run.js";
import { ProjectHome } from "./project-home.js";
import { GOLDEN_RUN_ID } from "./run-artifact.js";
import { RunDetail } from "./run-detail.js";
import { Screen } from "./screen.js";
import { SetupDetect } from "./setup-detect.js";
import { SetupDoctor } from "./setup-doctor.js";

const NAV = [
  { to: "/setup/detect", label: "Setup detect" },
  { to: "/setup/doctor", label: "Setup doctor" },
  { to: "/project", label: "Project" },
  { to: "/scenarios", label: "Scenarios" },
  { to: "/profiles", label: "Profiles" },
  { to: "/runs/new", label: "New run" },
  { to: "/runs/demo/live", label: "Live run" },
  { to: `/runs/${GOLDEN_RUN_ID}`, label: "Run detail" },
  { to: "/compare", label: "Compare" },
  { to: "/rules", label: "Rules" },
  { to: "/settings", label: "Settings" },
] as const;

export function App() {
  return (
    <div className="shell">
      <a className="skip-link" href="#main">
        Skip to main content
      </a>
      <nav className="nav" aria-label="Primary">
        <h1>Potato Boost</h1>
        <ul>
          {NAV.map((item) => (
            <li key={item.to}>
              <NavLink to={item.to} end={item.to === "/project"}>
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <main id="main" tabIndex={-1}>
        <Routes>
          <Route path="/" element={<ProjectHome />} />
          <Route path="/project" element={<ProjectHome />} />
          <Route path="/setup/detect" element={<SetupDetect />} />
          <Route path="/setup/doctor" element={<SetupDoctor />} />
          <Route
            path="/scenarios"
            element={
              <Screen
                title="Scenarios"
                empty="No validated scenario yet. Record or import a scenario before a representative run."
              />
            }
          />
          <Route
            path="/profiles"
            element={
              <Screen
                title="Profiles"
                empty="No target profile selected. Pick a profile to see budgets."
              />
            }
          />
          <Route path="/runs/new" element={<NewRun />} />
          <Route path="/runs/:id/live" element={<LiveRun />} />
          <Route path="/runs/:id" element={<RunDetail />} />
          <Route
            path="/compare"
            element={
              <Screen
                title="Compare"
                empty="No comparable runs yet. Complete a baseline and a candidate first."
              />
            }
          />
          <Route
            path="/rules"
            element={
              <Screen
                title="Rules"
                empty="No rule pack loaded. Bundled packs appear here after a run."
              />
            }
          />
          <Route
            path="/settings"
            element={
              <Screen
                title="Settings"
                empty="Local paths and retention are unchanged. Offline mode is the default."
              />
            }
          />
        </Routes>
      </main>
    </div>
  );
}
