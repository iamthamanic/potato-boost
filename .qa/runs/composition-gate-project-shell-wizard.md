# Composition Gate — project-shell-wizard

- HEAD_SHA: 74e1e803c9882ac9e2218c7ca5a6738d23878058
- Date: 2026-08-16
- Verdict: CLEAR
- Code-head note: later commits in this ticket are QA/living-documentation only; no runtime code changed after this verified implementation SHA.

## Event

A user creates or edits one local Potato Boost project and the dashboard must keep that exact project identity/settings through registry persistence, sidebar selection, active-project routing, and later Test Setup edits.

## Hop chain

Project wizard fields → final Review/Create action → authenticated `POST /api/v1/projects` → #91 strict Local API validation/canonical project registry → created project response → in-memory `ProjectProvider` refresh → project-specific Overview route/sidebar state.

Existing project Test Setup → explicit Save → authenticated `PATCH /api/v1/projects/:projectId` → validated registry update → provider state replacement → same project remains active in the project shell.

## Simulations

| Case | Intended | Composed | Result |
|------|----------|----------|--------|
| 1 event, N projects | One create/edit changes only the selected project and exactly one rail item becomes active | Project IDs come from the Local API record; routes encode the selected ID; PATCH targets that ID only; project rail derives active state from the URL | pass |
| invalid / duplicate / missing path | Keep wizard/setup state visible and fail closed; never fall back to another root/project | #91 API validates/canonicalizes roots and returns bounded 4xx errors; dashboard maps them to recovery copy without replacing provider state | pass |
| duplicate click / retry | One user create should not silently create multiple project records | Wizard `creating` ref blocks a second submit while pending; server duplicate-root conflict remains authoritative; E2E retry first discovers an existing root before attempting create | pass |
| unknown project id | No silent project substitution | `ProjectShell` requires a registry match for the route ID and renders an actionable not-found state otherwise | pass |

## Flags

No open blocker or flag. No queue, worker, webhook, fan-out, or remote side effect is introduced in this slice. Project writes remain a single authenticated loopback API mutation.

## Evidence

- GitHub Actions run `31941713043`: `pnpm checks` and Playwright/Axe E2E both passed on runtime HEAD `74e1e803c9882ac9e2218c7ca5a6738d23878058`.
- `e2e/dashboard-a11y.spec.ts`: project creation, retry-safe single creation, active project navigation, Test Setup save, keyboard, mobile/tablet, reduced-motion, Axe coverage.
- `apps/dashboard/src/project-wizard.tsx`: final-step-only create and pending-submit guard.
- `apps/dashboard/src/project-shell.tsx`: registry-backed project identity and not-found behavior.
