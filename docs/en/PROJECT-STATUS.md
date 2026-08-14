# Project status

As of 2026-08-14 · source: `.project-memory/` · all claims **needs-review**.

## Focus

- Fixture e2e and `potato init --confirm` are in; next is doctor (#14).

## Recently completed

- `potato init` writes config only after `--confirm` (issue #13).
- Playwright e2e smoke for `fixtures/web-threejs` (`pnpm test:e2e`).
- VisoDev import schema without VisoDev dependency (issue #35).
- Adapter SDK with capability manifest and contract tests (issue #32).
- Report export with validated JSON and static HTML (issue #29).
- `packages/evidence`: provenance and source candidates (issue #8).
- `packages/rule-engine` + `rules-web`: deterministic evaluate() (issue #7).
- `packages/analysis`: quantiles, hitches, data quality (issue #6).
- `packages/artifact-store`: atomic writes under `.potato` (issue #5).
- `packages/schemas`: Zod + committed JSON Schema for run-artifact (issue #4).
- TypeScript workspace gates: `pnpm checks` (issue #2).

## Incomplete

- Doctor, collector, quick-scan runner, local API, and dashboard are still missing.

## Risks

- Living-docs claims are needs-review.
- Open PRD decisions Q-001 through Q-007.
- Target runtime is Node 24 LTS; the local machine may be older.

## Next step

GitHub issues #14 (doctor), #16 (collector), or #18 (quick-scan runner).
