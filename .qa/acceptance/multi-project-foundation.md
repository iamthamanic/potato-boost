# Acceptance — multi-project-foundation

## Intent

Introduce a persisted local project registry so Potato Boost can manage multiple project roots safely and project-scoped setup can resolve the selected project explicitly.

## Preconditions

- Local API remains loopback-only and token protected.
- Existing CLI commands keep their current single-project path semantics.
- Project roots are local filesystem directories.

## Happy Path

1. Given an empty registry and an existing local directory, when the client creates a project with name/root/settings, then the API canonicalizes the root, persists one versioned project record, and returns it.
2. Given a persisted project, when a new Local API instance uses the same registry path, then listing projects returns the same project/settings.
3. Given a registered project ID, when project-scoped detect/doctor/config preview/confirm is requested, then the setup code uses that project's stored canonical root.
4. Given updated project settings, when the project is patched, then only supplied editable settings change while id/root identity remains valid and persisted.

## Edge Cases

- Duplicate canonical roots are rejected with conflict.
- Unknown project IDs return not-found; no fallback root is used.
- Nonexistent or non-directory roots are rejected before persistence.
- Invalid IDs/bodies are rejected through Zod validation.
- Corrupt persisted JSON fails closed and is not overwritten.

## Scope

In: `packages/local-api/src/**`, focused Local API tests, acceptance/design docs.

Out: CLI behavior, dashboard redesign, cloud persistence, cross-project run storage.

## Security Coverage

- F-02: API inputs are schema validated before use; no new browser-side authority is introduced.
- F-03/F-05: no secrets or API keys are added to browser persistence.
- B-03: project endpoints stay behind the existing Local API token/loopback request hook.
- B-08/B-09: project identity is resolved server-side from a validated project ID; no client-supplied root is trusted on scoped setup routes.
- P-02: errors use existing sanitized error envelopes and do not return stack traces.
- P-04: no uploads are introduced; filesystem roots are canonicalized and must be existing directories.
- Potato-specific root allowlist: only persisted canonical project roots may be used by project-scoped setup operations.

## Acceptance

- [ ] Local API exposes typed create/list/read/update project endpoints and persists project records across API restarts using an injectable registry path for deterministic tests.
- [ ] Project records include stable id, name, root, setup selection/start command, selected rule packs, and target-profile selection with strict validation.
- [ ] Detect, doctor, config preview, cancel, and confirm can run against an explicit registered project and never silently use another project's root.
- [ ] Existing CLI behavior and existing Local API security checks remain green; no side-effect jobs are introduced.
- [ ] Touched files: zero type escape hatches (typed-strict / Boy Scout).

## Implementation Notes

Pending implementation and verification.