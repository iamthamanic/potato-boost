# Project status

As of 2026-08-13 · source: `.project-memory/` · all claims **needs-review**.

## Focus

- Artifact spine: schema, store, analysis, rules, and evidence are in; next are golden tests, CLI, and fixture.

## Recently completed

- `packages/evidence`: provenance and source candidates (issue #8).
- `packages/rule-engine` + `rules-web`: deterministic evaluate() (issue #7).
- `packages/analysis`: quantiles, hitches, data quality (issue #6).
- `packages/artifact-store`: atomic writes under `.potato` (issue #5).
- `packages/schemas`: Zod + committed JSON Schema for run-artifact (issue #4).
- TypeScript workspace gates: `pnpm checks` (issue #2).

## Incomplete

- Golden artifact tests, CLI, dashboard, and fixtures are still missing.

## Risks

- Living-docs claims are needs-review.
- Open PRD decisions Q-001 through Q-007.
- Target runtime is Node 24 LTS; the local machine may be older.

## Next step

GitHub issues #9 (golden-artifact) or #11 (CLI) and #17 (fixture).
