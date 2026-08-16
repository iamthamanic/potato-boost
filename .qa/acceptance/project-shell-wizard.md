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

- [ ] `/projects` is the dashboard entry point with project cards/list, empty state, and one clear Create project action; sidebar shows Projects plus all registered projects with active state.
- [ ] Project creation uses a keyboard-accessible multi-step wizard in this order: Project Setup → Rules → Target Profiles → Review, then creates exactly one project through #91 APIs.
- [ ] An existing project exposes a Test Setup screen where Project Setup, Rules, and Target Profiles can be edited and saved after creation.
- [ ] Desktop/tablet/mobile and reduced-motion states pass the existing accessibility/E2E quality floor; no duplicate primary navigation concepts are shown in sidebar and top nav.
- [ ] Touched files: zero type escape hatches (typed-strict / Boy Scout).

## Implementation Notes

Pending implementation and verification.