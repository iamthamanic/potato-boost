# Project status

As of 2026-08-13 · source: `.project-memory/` · all claims **needs-review**.

## Focus

- Discovery, scenario engine, fixture, report, and adapter SDK are in; next are doctor and dashboard.

## Recently completed

- Adapter SDK with capability manifest and contract tests (issue #32).
- Report export with validated JSON and static HTML (issue #29).
- Deterministic Three.js fixture with toggleable problems (issue #17).
- `packages/evidence`: provenance and source candidates (issue #8).
- `packages/rule-engine` + `rules-web`: deterministic evaluate() (issue #7).
- `packages/analysis`: quantiles, hitches, data quality (issue #6).
- `packages/artifact-store`: atomic writes under `.potato` (issue #5).
- `packages/schemas`: Zod + committed JSON Schema for run-artifact (issue #4).
- TypeScript workspace gates: `pnpm checks` (issue #2).

## Incomplete

- Doctor, dashboard, and Three.js fixture runner are still missing.

## Risks

- Living-docs claims are needs-review.
- Open PRD decisions Q-001 through Q-007.
- Target runtime is Node 24 LTS; the local machine may be older.

## Next step

GitHub issues #15 (CLI follow-on) or #17 (fixture).
