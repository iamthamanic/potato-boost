# Project workspace — scoped runs and compare

## Decision

Keep the existing Local API run lifecycle, but make **project ownership a server-side property of a run record**. The dashboard never sends a project root, target profile, or rule packs as authority when it starts a project run; it sends only the project id in the route and a scenario request. The Local API resolves the registered project and snapshots its current setup into the run record.

This extends the existing `RunRecord` boundary instead of adding a second run store or new persistence layer.

## Project run contract

A project-scoped run records:

- `projectId`
- run id + status/baseline eligibility
- scenario id
- target id derived from the registered project adapter
- profile id from the project's saved target profile
- rule-pack ids copied from the project record
- creation timestamp

The record is in-memory because existing dashboard runs are in-memory. Durable run/artifact persistence is a separate product concern and is not invented in this slice.

## API

Additive project endpoints:

- `POST /api/v1/projects/:projectId/runs`
- `GET /api/v1/projects/:projectId/runs`
- `GET /api/v1/projects/:projectId/runs/:id`
- `POST /api/v1/projects/:projectId/runs/:id/abort`
- `GET /api/v1/projects/:projectId/runs/:id/events`
- `POST /api/v1/projects/:projectId/compare`

Legacy global run endpoints stay available for existing CLI/test compatibility.

### Start

`POST .../runs` accepts only the scenario selection used by the dashboard. It resolves `projectId` through `ProjectRegistry.resolve()` before creating a run. This revalidates the canonical project root and prevents a client from pairing a valid id with another filesystem root/setup.

### List

`GET .../runs` validates that the project record exists, then returns only records whose server-owned `projectId` matches. Summaries expose human-useful status/time/context and a `comparable` flag.

### Contextual run operations

Snapshot/abort/events require both project id and run id. A run owned by another project is returned as not found; the API does not leak or silently substitute another project's run.

## Compare and artifact truth

The current dashboard Local API creates run lifecycle records but does **not** persist a real `RunArtifact` for those stub runs. Existing compare fixtures are global test fixtures and must not be fabricated as project history.

Therefore:

1. project run summaries mark `comparable` only when a real artifact can be loaded for that exact run id;
2. the project Compare UI uses only project-scoped summaries and enables Before/After comparison only when at least two artifact-backed project runs exist;
3. the project compare endpoint first enforces ownership for both run ids, then delegates to existing deterministic `compareRuns` only when both artifacts exist;
4. otherwise the UI/API returns an honest empty/not-ready state rather than pretending stub lifecycle runs contain measurement evidence.

This preserves the evidence contract and keeps collector/artifact work out of #93.

## Dashboard

### Runs

`/projects/:projectId/runs` becomes a project Runs workspace:

- page heading and one Quick Scan primary action
- recommended scan context reflects the active project's saved adapter/profile/rules
- recent project runs show status, time, scenario/profile and a result/live action
- no runs → instructional empty state
- technical run ids remain inside disclosure/secondary text

### Compare

`/projects/:projectId/compare` loads the same project's run summaries:

- Before / After are `<select>` controls with human labels (time + status/context)
- no comparable runs / fewer than two → explicit empty state and Test Setup / Run Scan path
- raw run ids appear only in technical details
- no cross-project option is rendered

### Live / result context

When a project id is present, Live Run verifies/streams/aborts through project-scoped endpoints. Run Detail verifies project ownership before loading the artifact. All existing global fixture routes remain available outside project context for compatibility tests.

## Security boundary

- Project id and run id are schema validated.
- Project-scoped start resolves the project server-side and snapshots server-owned settings.
- Ownership checks are performed server-side for list/snapshot/abort/events/compare.
- Cross-project run ids resolve as not found/conflict before artifact access.
- Existing loopback host/origin/token hook remains the outer boundary.

## Non-goals

No cross-project compare, cloud/durable run database, new collectors, synthetic/fabricated artifacts, rule-engine changes, or CLI behavior changes.
