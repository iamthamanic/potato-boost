# Changelog

Human-readable chronicle. Canonical events live in `.project-memory/changes/`.

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
