# Changelog

Human-readable chronicle. Canonical events live in `.project-memory/changes/`.

## 2026-08-13 — Rule engine

Deterministische `evaluate()`-API und versioniertes Pack `rules-web`. Fehlende Evidenz ist observation, nicht Fail.

Review-Status: **needs-review**.

## 2026-08-13 — Analysis engine

Reine Statistik: p95/p99, Hitch-Zählung, Datenqualität (`valid`/`noisy`/`incomplete`). Noise setzt `inconclusive`, nicht Fail. Mittelwert allein reicht nicht.

Review-Status: **needs-review**.

## 2026-08-13 — Artifact store

Atomarer lokaler Store unter `.potato` (temp, fsync, Rename, SHA-256). Index ist Source of Truth für completed.

Review-Status: **needs-review**.

## 2026-08-13 — Schemas core

Kanonische Zod- und JSON-Schemas für Run-Artefakte in `packages/schemas`. Unbekannte Schema-Majors werden abgelehnt; additive Felder bleiben erlaubt. Error-Envelope ohne Stack.

Review-Status: **needs-review**.

## 2026-08-13 — Bootstrap

Projektgedächtnis und QA-Scaffolding initialisiert. Greenfield: kein Anwendungscode.

- PRD importiert aus `potato-boost-product-spec.md`
- AGENTS.md, README, UI-Styleguide, `.qa/` angelegt
- Living-Docs-Viewer vorbereitet
- Roadmap/Epics: [ROADMAP.md](ROADMAP.md)
- Remote: https://github.com/iamthamanic/potato-boost

Review-Status: **needs-review**.
