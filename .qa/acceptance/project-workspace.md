# Acceptance — project-workspace

## Intent

Complete the multi-project mental model by making run ownership, run history, contextual live/result routes, and Before/After compare choices belong to the active registered project instead of relying on global/raw run ids.

## Preconditions

- #91 project registry is merged and remains authoritative for canonical project roots/settings.
- #92 Projects hub/project shell is merged and provides `/projects/:projectId/...` routes.
- Existing global run routes remain compatible for legacy tests/fixtures.
- Current dashboard run lifecycle is in-memory; no durable artifact store is introduced here.

## Happy Path

1. Given a registered project with saved adapter/profile/rules, when Quick Scan starts from that project, then the Local API resolves the project server-side, snapshots those saved settings into one project-owned run, and returns its run id.
2. Given runs from multiple projects, when a project run list is requested, then only run summaries owned by that project are returned in creation order/context.
3. Given a project-owned live run, when snapshot/events/abort are requested through the contextual project route, then the API serves only that project's run and rejects another project's run id without fallback.
4. Given at least two artifact-backed runs owned by one project, when Compare is opened, then Before/After choices come only from that project's comparable summaries and project compare delegates to the existing deterministic comparison.
5. Given ordinary dashboard stub runs without persisted artifacts, when Compare is opened, then the user sees an honest project-scoped empty/not-ready state instead of fabricated comparison evidence or raw-id inputs.

## Edge Cases

- Unknown/invalid project id → bounded 400/404; no run is created.
- Registered project whose root moved → project-scoped start fails closed before creating a run.
- Unknown run id or run owned by another project → project-scoped snapshot/abort/events/compare does not substitute a global/other-project run.
- Reused idempotency key with different project/settings → conflict; no cross-project alias.
- Project with zero runs → Runs and Compare show instructional empty states.
- Project with fewer than two artifact-backed runs → Compare cannot execute and does not expose raw ids as the primary flow.
- Direct live/result URLs preserve the active project shell and verify ownership before contextual data access.

## Scope

In: `packages/local-api/src/server.ts`, focused Local API tests, `apps/dashboard/src/**`, `e2e/dashboard-a11y.spec.ts`, QA/living docs.

Out: `packages/analysis/**`, collectors, durable/cloud run persistence, fabricated fixture ownership, cross-project comparison, CLI behavior changes.

## Security Coverage

- F-02: dashboard project/run ids and UI choices are sent to validated Local API routes; client-side state is not treated as ownership authority.
- F-03/F-05: no tokens, project ownership map, or run authority are added to browser persistence.
- B-03: all new project-run endpoints remain behind the existing loopback host/origin/token hook.
- B-08/B-09: project/run ownership is resolved server-side; a client cannot pair a project id with another project's run/root/settings.
- P-02: invalid/not-found/cross-project cases use bounded existing error envelopes rather than stacks/internal paths.
- P-04: no upload/path input is added; project-scoped start uses the canonical root already controlled by `ProjectRegistry.resolve()`.

## Acceptance

- [ ] Active-project header exposes Overview, Runs, Compare, and Scenarios as the primary workflow tabs plus secondary Test Setup; workflow pages retain that shell on direct URLs.
- [ ] Run creation is associated server-side with a registered project and snapshots that project's saved adapter/target-profile/rule selections; Local API lists summaries filtered by project.
- [ ] Project-scoped snapshot/events/abort/compare enforce run ownership and never silently access another project's run.
- [ ] Runs and Compare use human-readable project-scoped run choices/empty states; raw run ids are secondary technical details rather than the default workflow.
- [ ] Compare only offers artifact-backed runs from the active project and does not fabricate project history from global golden fixtures.
- [ ] Desktop/tablet/mobile, keyboard, reduced-motion, and Axe quality floor remain green for the project workflow.
- [ ] Touched files: zero type escape hatches (typed-strict / Boy Scout).

## Implementation Notes

Pending implementation and verification.
