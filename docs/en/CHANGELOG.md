# Changelog

Human-readable chronicle. Canonical events live in `.project-memory/changes/`.

## 2026-08-14 — Secret redaction

Authorization headers, request bodies, password fields, and query tokens are not stored. Canary secrets do not appear in the artifact (NFR-006, T-011).

Review status: **needs-review**.

## 2026-08-14 — Quick Scan runner

`potato run` orchestrates setup, warm-up, three measure repetitions, and cleanup. Success writes a schema-valid artifact. Warm-up crash is `failed` (not a budget fail); abort is `cancelled` and kills child processes (FR-008, EDGE-006).

Review status: **needs-review**.

## 2026-08-14 — Collectors CDP + OS

Collector hub ingests samples with monotonic `timestampNs` and rejects NaN/Infinity. OS collector emits CPU/RSS and a process tree. Missing CDP is `unsupported` — not a silent null, not a budget fail (FR-014, EDGE-010).

Review status: **needs-review**.

## 2026-08-14 — Web doctor

`potato doctor` checks Node, Playwright Chromium, start argv, and port 5199. Checks print as `ok`/`missing` with a path. A missing required capability blocks `potato run` with exit 3. Start commands are not executed (FR-005, FR-006).

Review status: **needs-review**.

## 2026-08-14 — Init writes config after confirm

`potato init` prints planned paths and YAML; writes `potato.config.yaml`, `.gitignore` (`.potato/`), and a local audit log only with `--confirm`. Without confirm the repo is untouched (FR-007, SCN-011).

Review status: **needs-review**.

## 2026-08-14 — Fixture Playwright e2e

`pnpm test:e2e` starts `fixtures/web-threejs` on 127.0.0.1:5199 (Chromium). Overlay, canvas, `?problem=` toggles, and no external requests are covered. Fixture is a workspace package with pinned versions. CI has a separate `e2e` job.

Review status: **needs-review**.

## 2026-08-13 — VisoDev import schema

`docs/artifact-schema.md` and `packages/schemas/visodev-export.schema.json` describe the import. IDs are identical to Run/Evidence; no VisoDev code in core (FR-026).

Review status: **needs-review**.

## 2026-08-13 — Adapter SDK

`packages/adapter-sdk` exports manifest schema, capability enum, and contract harness. Core loads adapters via manifest + allowlist + version lock (FR-024, CON-005).

Review status: **needs-review**.

## 2026-08-13 — Report export

`packages/report` writes validated JSON and static HTML with the same finding IDs. Export is purely local, no network (FR-022, FR-026).

Review status: **needs-review**.

## 2026-08-13 — Three.js fixture

`fixtures/web-threejs` is a deterministic app with toggleable performance problems (draw calls, long task, alloc). No external assets; offline-capable (T-001, T-004).

Review status: **needs-review**.

## 2026-08-13 — Scenario engine

`packages/scenario-engine` models Setup/Warm-up/Measure/Cleanup, repetitions, markers, and timeouts. Quick Scan is a preset scenario (FR-009/010). Timeout aborts a phase without baseline eligibility.

Review status: **needs-review**.

## 2026-08-13 — Read-only discovery

`packages/core/src/discovery/` scans markers/manifests and returns candidates (Web/Vite/React/Three.js) with evidence and confidence 0..1. No project files are written before confirmation (BR-001). Empty repos return 'unknown' instead of an invented stack (EDGE-001).

Review status: **needs-review**.

## 2026-08-13 — CLI entrypoint

`packages/cli` with Commander. `potato-boost`/`potato` print help; unknown commands/flags exit 2. Subcommands are stubs.

Review status: **needs-review**.

## 2026-08-13 — Golden artifact tests

Committed `golden-v1.0.0.json`. Pipeline analysis → evidence → rules → store round-trip. Unknown majors are rejected with a readable error; additive fields are accepted.

Review status: **needs-review**.

## 2026-08-13 — Evidence graph

Provenance and ordered source candidates. Missing source maps lower confidence and do not drop the finding. Paths stay under the project root.

Review status: **needs-review**.

## 2026-08-13 — Rule engine

Deterministic `evaluate()` API and versioned `rules-web` pack. Missing evidence is observation, not fail.

Review status: **needs-review**.

## 2026-08-13 — Analysis engine

Pure stats: p95/p99, hitch count, data quality (`valid`/`noisy`/`incomplete`). Noise yields `inconclusive`, not fail. Mean alone is not enough.

Review status: **needs-review**.

## 2026-08-13 — Artifact store

Atomic local store under `.potato` (temp, fsync, rename, SHA-256). Index is source of truth for completed.

Review status: **needs-review**.

## 2026-08-13 — Schemas core

Canonical Zod and JSON schemas for run artifacts in `packages/schemas`. Unknown schema majors are rejected; additive fields stay allowed. Error envelope has no stack.

Review status: **needs-review**.

## 2026-08-13 — Bootstrap

Project memory and QA scaffolding initialized. Greenfield: no application code, no remote.

- PRD imported from `potato-boost-product-spec.md`
- AGENTS.md, README, UI styleguide, `.qa/` created
- Living-docs viewer prepared

Review status: **needs-review**.
