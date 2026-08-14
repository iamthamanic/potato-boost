# Project status

As of 2026-08-14 · source: `.project-memory/` · all claims **needs-review**.

## Focus

- Dashboard shell is in; next is the fake adapter or further dashboard tickets.

## Recently completed

- Dashboard shell with PRD routes and no score number (issue #21).
- Offline e2e: 0 product requests on a blocked network (issue #39).
- Security e2e origin/path/shell fail-closed (issue #37).
- Local API: loopback, run token, Origin/Host, REST+SSE (issue #20).
- Abort cleans up child processes (issue #40).
- Secret redaction in recorder and artifacts (issue #38).
- Quick Scan runner with visible phases and an artifact (issue #18).
- CDP+OS collectors on a shared timeline (issue #16).
- Web doctor: Node, browser, port, start command; `potato run` exit 3 (issue #14).
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

- Dashboard screens are still empty states, not a full analysis UI.

## Risks

- Living-docs claims are needs-review.
- Open PRD decisions Q-001 through Q-007.
- Target runtime is Node 24 LTS; the local machine may be older.

## Next step

GitHub issues #33/#34 (dashboard UI).
