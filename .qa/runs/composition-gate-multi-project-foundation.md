# Composition Gate — multi-project-foundation

HEAD_SHA: a9f588edf5834f6da767a6c17ab88b51348379a5
CODE_HEAD_NOTE: Subsequent commits in this ticket are verification/living-documentation only; no producer/consumer code changed after this implementation SHA.
VERDICT: CLEAR

## Business event

A local dashboard client registers or edits a project, then later invokes setup operations for that project. The selected project identity must resolve to the same canonical filesystem root and settings at every hop.

## Producer → consumer path

1. Authenticated loopback HTTP request reaches `packages/local-api/src/project-routes.ts`.
2. Route params/body are validated by strict Zod schemas from `projects.ts`.
3. `ProjectRegistry` canonicalizes an existing directory, rejects duplicate roots, and persists a versioned project record through temp-file + rename.
4. Later project-scoped setup routes resolve the validated project id through `ProjectRegistry.resolve()`.
5. `resolve()` re-canonicalizes the stored root and fails closed if it is missing or no longer resolves to its registered location.
6. Detect / doctor / config preview / cancel / confirm receive only the registry-owned canonical root. Config writes still occur only on explicit confirm.

## N-actor simulation

- Ten different valid roots create ten independent records with stable ids.
- A second actor attempting the same canonical root receives conflict instead of an alias record.
- Project reads return cloned arrays/records, so one consumer cannot mutate registry state by reference.

Result: CLEAR.

## Invalid / missing fallback simulation

- Invalid body or update → 422.
- Invalid project id syntax → 400.
- Unknown project id → 404.
- Duplicate canonical root → 409.
- Missing/non-directory/moved project root on scoped setup → 422.
- Corrupt persisted registry → startup fails closed; the file is not silently overwritten.
- No project-scoped setup path falls back to the API startup root or `process.cwd()`.

Result: CLEAR.

## Concurrent-consumer simulation

Registry create/update mutations share one promise queue. Concurrent mutations therefore serialize before the next in-memory state and atomic JSON write are published. A failed mutation releases the queue without replacing the last valid state. Setup consumers resolve a snapshot clone by stable project id.

Result: CLEAR.

## Side-effect boundary

The only new persistent side effect is the local registry JSON. Project creation/update writes that registry; project setup writes remain delegated to existing Core config behavior and only happen through explicit `/config/confirm`. No queue, webhook, worker, fan-out, or remote side effect was added.

## Evidence

- `packages/local-api/src/projects.test.ts`: persistence/restart, root edit, root isolation across detect/preview/cancel/confirm/doctor, moved root, duplicate/invalid root, corrupt-registry tests.
- GitHub Actions run 31940675896: `pnpm checks` and Playwright E2E both passed on implementation HEAD.
