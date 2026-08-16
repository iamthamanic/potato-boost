# Multi-project foundation

## Decision

Add one local `ProjectRegistry` boundary inside `@potato-boost/local-api`. It hides how project metadata is persisted and canonicalized. The Local API owns registry reads/writes; dashboard clients never become the authoritative store.

## Project record

A project is a local workspace reference, not a cloud tenant:

- stable opaque `id`
- human-readable `name`
- canonical absolute `root`
- `adapterId` and argv-array `start`
- selected `rulePackIds`
- selected `targetProfileId`
- timestamps

## Persistence

Use Node built-ins only. Store a versioned JSON document at an injectable path; production defaults to `~/.potato-boost/projects.json`. Writes use temp-file + rename so a partial write cannot truncate the registry. Tests inject a temp registry path.

## Security boundary

Creating a project canonicalizes an existing directory with `realpath`. Registered canonical roots form the root allowlist. Setup routes that target a project resolve the project by validated ID and use only its stored canonical root. Client-supplied roots are never accepted by project-scoped setup routes.

Existing loopback host/origin/token protection remains unchanged. Config writes still happen only via explicit `/config/confirm`.

## API shape

- `GET /api/v1/projects`
- `POST /api/v1/projects`
- `GET /api/v1/projects/:projectId`
- `PATCH /api/v1/projects/:projectId`
- project-scoped setup routes under `/api/v1/projects/:projectId/...`

The legacy setup routes remain for compatibility in this slice and keep using the Local API startup root; the new dashboard will consume project-scoped routes.

## Error semantics

- invalid body/id → 422/400
- unknown project → 404
- duplicate canonical root → 409
- missing/not-directory root → 422
- corrupt persisted registry → fail closed during startup rather than overwriting it

## Non-goals

No cloud storage, accounts, project deletion, cross-project runs, or CLI behavior changes.