# Acceptance — project-shell-wizard

## Intent

Make projects the top-level dashboard concept: users first choose/create a project, switch projects from the sidebar, create a project through a guided setup wizard, and revisit Test Setup later without mixing project settings into the primary workflow navigation.

## Preconditions

- #91 project registry and project-scoped Local API routes are merged.
- Local API remains authoritative for persisted project records.
- Dashboard copy and labels remain English per project style guide.

## Happy Path

1. With no projects, `/projects` presents one clear create action.
2. User completes Project Setup → Rules → Target Profiles → Review without creating partial registry entries.
3. Review creates exactly one project and navigates into that project's Overview context.
4. The project appears in the left project rail and can be switched/opened later.
5. Test Setup loads the current project settings and allows Project Setup, Rules, and Target Profiles to be saved after creation.

## Edge Cases

- Invalid/duplicate/missing project path errors are shown without clearing wizard state.
- Back/forward wizard navigation preserves current form values.
- Unknown project id shows an actionable not-found screen rather than falling through to another project.
- Many projects keep the rail usable and the active project unambiguous.
- Mobile/tablet layouts preserve project switching and wizard order without page-level horizontal overflow.

## Scope

In: `apps/dashboard/src/**`, focused dashboard tests, `e2e/dashboard-a11y.spec.ts`, minimal E2E harness changes, QA docs.

Out: project-scoped run storage/listing/compare selection (#93), collector/analysis changes, cloud storage/sharing.

## Security Coverage

- Project configuration is read/written only through the authenticated loopback Local API.
- The browser does not store an authoritative project registry or trust itself to canonicalize filesystem paths.
- Start command input is parsed into argv with the existing parser; no shell execution is introduced.
- Project API errors are rendered as bounded UI messages; no stack traces or arbitrary HTML are injected.

## Acceptance

- [x] `/projects` is the dashboard entry point with project cards/list, empty state, and one clear Create project action; sidebar shows Projects plus all registered projects with active state.
- [x] Project creation uses a keyboard-accessible multi-step wizard in this order: Project Setup → Rules → Target Profiles → Review, then creates exactly one project through #91 APIs.
- [x] An existing project exposes a Test Setup screen where Project Setup, Rules, and Target Profiles can be edited and saved after creation.
- [x] Desktop/tablet/mobile and reduced-motion states pass the existing accessibility/E2E quality floor; no duplicate primary navigation concepts are shown in sidebar and top nav.
- [x] Touched files: zero type escape hatches (typed-strict / Boy Scout).

## Implementation Notes

- `/projects` is the dashboard entry. The left rail owns project selection; Overview, Runs, Compare, and Scenarios live in the active-project context bar, while Test Setup is a secondary project action.
- The creation wizard holds draft form state locally and performs the first registry mutation only from Review → Create project. A pending-submit ref prevents double clicks; duplicate-root validation remains authoritative in the Local API.
- Test Setup loads the selected registry record and PATCHes that exact project. Project paths remain server-validated/canonicalized; the dashboard stores no authoritative registry in browser persistence.
- Legacy top-level workflow routes redirect to `/projects`, so users are not presented with two competing navigation models.
- #93 remains the explicit boundary for project-scoped run persistence/listing and human Before/After compare choices.
- Runtime verification on `74e1e803c9882ac9e2218c7ca5a6738d23878058`: GitHub Actions run `31941713043` passed `pnpm checks` and Playwright/Axe E2E, including project creation, active navigation, Test Setup editing, keyboard, mobile 390px, tablet 768px, and reduced-motion coverage.
- Web-interface review was reconciled with `docs/UI_STYLEGUIDE.md`; project form controls have associated labels/names and existing focus/reduced-motion conventions are preserved.

## Composition Gate

VERDICT: CLEAR

The create/edit event was reconstructed through dashboard state → authenticated Local API → canonical project registry → provider refresh → route/rail identity. Multiple-project, invalid-root, duplicate-submit/retry, and unknown-project simulations preserve project identity without silent fallback. See `.qa/runs/composition-gate-project-shell-wizard.md`.
