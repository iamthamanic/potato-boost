# Project shell and creation wizard

## Product model

Potato Boost has two navigation levels with different jobs:

1. **Project rail (left sidebar)** — choose which local project is active.
2. **Project context bar (horizontal)** — move among Overview, Runs, Compare, and Scenarios inside the active project.

Project setup is not a fifth workflow tab. It is a secondary project action named **Test Setup** because users revisit it less often than measurement work.

## Routes

- `/` → `/projects`
- `/projects` — projects hub
- `/projects/new` — create-project wizard
- `/projects/:projectId/overview` — project landing/workbench
- `/projects/:projectId/runs` — project workflow route (existing Quick Scan UI until #93 scopes run data)
- `/projects/:projectId/compare` — project workflow route (existing Compare UI until #93 scopes run data)
- `/projects/:projectId/scenarios` — project workflow route
- `/projects/:projectId/test-setup` — editable Project Setup / Rules / Target Profiles

Legacy single-project routes redirect into `/projects` in this slice rather than presenting a second competing navigation model.

## Visual direction

Keep the existing warm technical workbench tokens: warm canvas, paper-like panels, teal status/action color, IBM Plex UI/mono, thin borders, no glass or gradients.

The distinctive structural element is the **project rail**: the sidebar reads like a compact local workspace switcher, with Projects at the top, one visually active project, restrained readiness metadata, and a single Create project action. The project context bar then spans the content area like an instrument mode switch.

## Projects hub

The first screen answers: “Which project do you want to measure?”

- Header: Projects + Create project.
- Empty state: short explanation + Create your first project.
- Populated state: compact cards/list with project name, canonical path, setup summary, and Open project.
- No fabricated last-run data before #93 owns project run history.

## Creation wizard

The wizard creates **nothing until Review → Create project**, preventing partial registry entries.

### Step 1 — Project Setup

Fields:
- Project name
- Project path
- Project type/adapter
- Start argv (parsed with existing argv parser; never shell execution in the browser)

Validation is local for presence/shape; canonical path existence remains authoritative in the Local API on final create.

### Step 2 — Rules

Choose one or more local rule packs. Initial catalog:
- Web performance — default
- JavaScript performance
- Network performance

These are project settings, not claims that every pack has a separate backend evaluator in this UI slice.

### Step 3 — Target Profiles

Choose one target profile:
- Local machine — default
- Low-end mobile
- Mid-tier mobile

The stored IDs remain stable; descriptions explain intended measurement context.

### Step 4 — Review

Human-readable summary of project, path, start command, rules, and target profile. One primary **Create project** action POSTs exactly once. API failure keeps wizard state and surfaces a recovery message.

## Editable Test Setup

For an existing project, Test Setup shows three editing sections:
- Project Setup
- Rules
- Target Profiles

The screen loads the current project record and PATCHes only changed fields. Project path editing is supported so a moved local project can be repaired. Save failures keep the current form values.

## State / data boundaries

- The Local API is authoritative for project records.
- Dashboard project state is fetched; no authoritative project registry is stored in localStorage.
- Sidebar refreshes project data after creation/update through a small React project-context provider.
- Unknown project ids render a project-not-found state with a link back to Projects.

## Responsive behavior

- Desktop: fixed-width project rail + content.
- Tablet: narrower rail; context bar can wrap/scroll without hiding destinations.
- Mobile: project rail becomes a top project section; project cards and wizard are single-column; context tabs remain horizontally scrollable.
- Keyboard focus and reduced-motion behavior follow existing dashboard conventions.

## Follow-up boundary

#93 owns project-scoped run persistence/listing and Before/After run pickers. This ticket establishes the project IA and routes without pretending existing global/stub run data is already project-scoped.