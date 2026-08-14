# Design: Dashboard shell

Issue #21. Tokens from `docs/UI_STYLEGUIDE.md`. Desktop-first dense dev UI.

## Intent
Honest empty/loading/error screens for PRD §10 routes. No single Performance Score. Run token stays in memory (query `?token=`), never localStorage.

## Layout
- Left nav (English labels) + main pane
- Light/dark via `prefers-color-scheme` plus a Theme toggle (system/light/dark)
- 4px spacing scale, 14px UI, 12px metadata, 20px titles
- Status uses icon + text

## Routes
`/setup/detect` `/setup/doctor` `/project` `/scenarios` `/profiles` `/runs/new` `/runs/:id/live` `/runs/:id` `/compare` `/rules` `/settings`

`/` redirects to `/project`.

## States
Each screen: loading (named operation), empty (next action), error (retry). API down on `/project` shows error + retry, not an infinite spinner.

## Out
Timeline interaction, marketing look, DaisyUI/Next.js, token persistence.
