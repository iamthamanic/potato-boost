# Changelog

Human-readable chronicle. Canonical events live in `.project-memory/changes/`.

## 2026-08-14 — Dashboard shell

React+Vite in `apps/dashboard`. PRD-Routen als Empty/Loading/Error. Kein einzelner Performance Score. Run-Token nur im Speicher (`?token=`).

Review-Status: **needs-review**.

## 2026-08-14 — Offline e2e (T-013)

Mit blockiertem Netz lädt die Fixture nur Loopback. Quick Scan und Local API machen keine Product-Requests. Voraussetzung: Packages bereits lokal (erster npx-Download darf offline scheitern).

Review-Status: **needs-review**.

## 2026-08-14 — Security E2E (T-009)

Fremder Origin, Path-Traversal in runId und Shell-Metazeichen in argv werden fail-closed getestet. `pnpm test:security` ist Exit 0 (NFR-005, EDGE-011).

Review-Status: **needs-review**.

## 2026-08-14 — Local API loopback

Fastify bindet nur `127.0.0.1`, zufälligen Port und ein pro-Prozess-Run-Token. Fremde Origins sind 403; ohne Token 401. `POST /api/v1/runs` ist idempotent; SSE resumed per `Last-Event-ID` (EDGE-011, CON-004/006).

Review-Status: **needs-review**.

## 2026-08-14 — Abort cleanup

Nach Stop sind innerhalb von 10 s keine vom Runner gestarteten Child-Prozesse mehr da. Cancelled/failed Runs sind keine Baselines. Warm-up-Crash bleibt `failed` (kein Budget-Fail). SIGINT bricht `potato run` ab (NFR-007, T-005).

Review-Status: **needs-review**.

## 2026-08-14 — Secret redaction

Authorization-Header, Request-Bodies, Passwortfelder und Query-Tokens werden nicht gespeichert. Canary-Secrets erscheinen nicht im Artifact (NFR-006, T-011).

Review-Status: **needs-review**.

## 2026-08-14 — Quick Scan runner

`potato run` orchestriert Setup, Warm-up, drei Measure-Wiederholungen und Cleanup. Erfolg schreibt ein schema-validiertes Artifact. Warm-up-Crash ist `failed` (kein Budget-Fail); Abbruch ist `cancelled` und beendet Child-Prozesse (FR-008, EDGE-006).

Review-Status: **needs-review**.

## 2026-08-14 — Collectors CDP + OS

Collector-Hub nimmt Samples mit monotonem `timestampNs` auf und weist NaN/Infinity ab. OS-Collector liefert CPU/RSS und Prozessbaum. Fehlt CDP, ist die Capability `unsupported` — kein stiller Null-Wert, kein Budget-Fail (FR-014, EDGE-010).

Review-Status: **needs-review**.

## 2026-08-14 — Web doctor

`potato doctor` prüft Node, Playwright-Chromium, Start-Argv und Port 5199. Checks erscheinen als `ok`/`missing` mit Pfad. Fehlende Pflicht-Capability blockt `potato run` mit Exit 3. Startbefehle werden nicht ausgeführt (FR-005, FR-006).

Review-Status: **needs-review**.

## 2026-08-14 — Init writes config after confirm

`potato init` zeigt geplante Pfade und YAML; schreibt `potato.config.yaml`, `.gitignore` (`.potato/`) und ein lokales Audit-Log nur mit `--confirm`. Ohne Confirm bleibt das Repo unberührt (FR-007, SCN-011).

Review-Status: **needs-review**.

## 2026-08-14 — Fixture Playwright e2e

`pnpm test:e2e` startet `fixtures/web-threejs` auf 127.0.0.1:5199 (Chromium). Overlay, Canvas, `?problem=`-Toggles und fehlende externe Requests sind belegt. Fixture ist Workspace-Paket mit gepinnten Versionen. CI hat einen eigenen `e2e`-Job.

Review-Status: **needs-review**.

## 2026-08-13 — VisoDev import schema

`docs/artifact-schema.md` und `packages/schemas/visodev-export.schema.json` beschreiben den Import. IDs sind identisch zu Run/Evidence; kein VisoDev-Code im Core (FR-026).

Review-Status: **needs-review**.

## 2026-08-13 — Adapter SDK

`packages/adapter-sdk` exportiert Manifest-Schema, Capability-Enum und Contract-Harness. Kern lädt Adapter über Manifest + Allowlist + Version Lock (FR-024, CON-005).

Review-Status: **needs-review**.

## 2026-08-13 — Report export

`packages/report` schreibt validiertes JSON und statisches HTML mit denselben Finding-IDs. Export ist rein lokal, kein Netzwerk (FR-022, FR-026).

Review-Status: **needs-review**.

## 2026-08-13 — Three.js fixture

`fixtures/web-threejs` ist eine deterministische App mit zuschaltbaren Performance-Problemen (Draw Calls, Long Task, Alloc). Keine externen Assets; offline-fähig (T-001, T-004).

Review-Status: **needs-review**.

## 2026-08-13 — Scenario engine

`packages/scenario-engine` modelliert Setup/Warm-up/Measure/Cleanup, Wiederholungen, Marker und Timeouts. Quick Scan ist ein vorgefertigtes Scenario (FR-009/010). Timeout bricht Phase ab ohne Baseline-Eignung.

Review-Status: **needs-review**.

## 2026-08-13 — Read-only Discovery

`packages/core/src/discovery/` scannt Marker/Manifeste und liefert Kandidaten (Web/Vite/React/Three.js) mit Evidence und Confidence 0..1. Keine Projektdateien werden vor Bestätigung geschrieben (BR-001). Leere Repos liefern 'unknown' statt eines erfundenen Stacks (EDGE-001).

Review-Status: **needs-review**.

## 2026-08-13 — CLI entrypoint

`packages/cli` mit Commander. `potato-boost`/`potato` zeigen Hilfe; unbekannte Commands/Flags enden mit Exit-Code 2. Subcommands sind Stubs.

Review-Status: **needs-review**.

## 2026-08-13 — Golden artifact tests

Committed `golden-v1.0.0.json`. Pipeline analysis → evidence → rules → store round-trip. Unknown majors are rejected with a readable error; additive fields are accepted.

Review-Status: **needs-review**.

## 2026-08-13 — Evidence graph

Provenienz und geordnete Source Candidates. Fehlendes Source Mapping senkt Confidence, droppt das Finding nicht. Pfade nur unter Projekt-Root.

Review-Status: **needs-review**.

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
