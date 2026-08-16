/**
 * Dashboard shell — user destinations in navigation, run states in context.
 */
import { NavLink, Route, Routes } from "react-router-dom";
import { Compare } from "./compare.js";
import "./guided-ux.css";
import { LiveRun } from "./live-run.js";
import { NewRun } from "./new-run.js";
import { ProjectHome } from "./project-home.js";
import { RunDetail } from "./run-detail.js";
import { Screen } from "./screen.js";
import { SetupDetect } from "./setup-detect.js";
import { SetupDoctor } from "./setup-doctor.js";

const PRIMARY_NAV = [
  { to: "/project", label: "Overview" },
  { to: "/runs/new", label: "Runs" },
  { to: "/compare", label: "Compare" },
  { to: "/scenarios", label: "Scenarios" },
] as const;

const SETUP_NAV = [
  { to: "/profiles", label: "Target profiles" },
  { to: "/rules", label: "Rules" },
  { to: "/setup/detect", label: "Project setup" },
] as const;

function NavItems(props: { items: readonly { to: string; label: string }[] }) {
  return (
    <ul>
      {props.items.map((item) => (
        <li key={item.to}>
          <NavLink to={item.to} end={item.to === "/project"}>
            {item.label}
          </NavLink>
        </li>
      ))}
    </ul>
  );
}

export function App() {
  return (
    <div className="shell">
      <a className="skip-link" href="#main">Skip to main content</a>
      <nav className="nav" aria-label="Primary">
        <div className="nav-brand">
          <h1>Potato Boost</h1>
          <p className="nav-project">Local performance workbench</p>
        </div>
        <NavItems items={PRIMARY_NAV} />
        <p className="nav-label">Test setup</p>
        <NavItems items={SETUP_NAV} />
        <div className="nav-bottom">
          <NavLink to="/settings">Settings</NavLink>
        </div>
      </nav>
      <main id="main" tabIndex={-1}>
        <Routes>
          <Route path="/" element={<ProjectHome />} />
          <Route path="/project" element={<ProjectHome />} />
          <Route path="/setup/detect" element={<SetupDetect />} />
          <Route path="/setup/doctor" element={<SetupDoctor />} />
          <Route path="/scenarios" element={<Screen title="Scenarios" empty="No representative scenario yet. Quick Scan works without one; add a scenario when you need repeatable interaction." />} />
          <Route path="/profiles" element={<Screen title="Target profiles" empty="The recommended local target is used for Quick Scan. Add profiles when you need device-specific budgets." />} />
          <Route path="/runs/new" element={<NewRun />} />
          <Route path="/runs/:id/live" element={<LiveRun />} />
          <Route path="/runs/:id" element={<RunDetail />} />
          <Route path="/compare" element={<Compare />} />
          <Route path="/rules" element={<Screen title="Rules" empty="Bundled performance rules are applied automatically. Rule details appear here after a run." />} />
          <Route path="/settings" element={<Screen title="Settings" empty="Potato Boost stays local and offline by default. Project paths and retention settings will live here." />} />
        </Routes>
      </main>
    </div>
  );
}
