# Projektstatus

Stand: 2026-08-14 · Quelle: `.project-memory/` · Alle Claims **needs-review**.

## Fokus

- Generic Process/Static Mode steht; als Nächstes Godot Detect/Doctor (#42).

## Zuletzt erledigt

- Generic/unsupported für unbekannte Repos; Start-Argv nur als Override nach Confirm (issue #34).
- Fake-Adapter: Detect/Doctor/Launch/Collect ohne Browser (issue #33).
- `potato ci` Exit-Codes 0/1/2/3/4 mit maschinenlesbaren Report-Pfaden (issue #30).
- Hard Compare: non-comparable statt falscher Regression; Baseline nur mit Confirm (issue #28).
- Dashboard-A11y: Skip-Link, Reduced Motion, Axe auf Kernreisen (issue #26).
- Timeline + Evidence Panel (issue #25).
- Run-Detail: Overview ohne Score, sechs Finding-Blöcke (issue #24).
- Live-Run-UI: Phasen, Logs, Abort (issue #23).
- Setup-UI: DetectionCard, Command-Override, Doctor, Confirm/Cancel (issue #22).
- Dashboard-Shell mit PRD-Routen ohne Score-Zahl (issue #21).
- Offline-E2E: 0 Product-Requests bei blockiertem Netz (issue #39).
- Security-E2E Origin/Pfad/Shell fail-closed (issue #37).
- Local API: Loopback, Run-Token, Origin/Host, REST+SSE (issue #20).
- Abbruch räumt Child-Prozesse auf (issue #40).
- Secret-Redaktion in Recorder und Artifacts (issue #38).
- Quick-Scan-Runner mit sichtbaren Phasen und Artifact (issue #18).
- Collector CDP+OS auf gemeinsamer Zeitachse (issue #16).
- Web-Doctor: Node, Browser, Port, Startbefehl; `potato run` Exit 3 (issue #14).
- `potato init` schreibt Config erst nach `--confirm` (issue #13).
- Playwright-E2E-Smoke für `fixtures/web-threejs` (`pnpm test:e2e`).
- VisoDev-Importschema ohne VisoDev-Abhängigkeit (issue #35).
- Adapter SDK mit Capability-Manifest und Contract-Tests (issue #32).
- Report-Export mit validiertem JSON und statischem HTML (issue #29).
- `packages/evidence`: Provenienz und Source Candidates (issue #8).
- `packages/rule-engine` + `rules-web`: deterministische evaluate() (issue #7).
- `packages/analysis`: Quantile, Hitches, Datenqualität (issue #6).
- `packages/artifact-store`: atomares Schreiben unter `.potato` (issue #5).
- `packages/schemas`: Zod + committed JSON Schema für run-artifact (issue #4).
- TypeScript-Workspace-Gates: `pnpm checks` (issue #2).

## Unvollständig

- Rules und Settings im Dashboard sind noch Empty-States.

## Risiken

- Living-Docs-Claims sind needs-review.
- Offene PRD-Entscheidungen Q-001 bis Q-007.
- Node-Ziel ist 24 LTS; die lokale Maschine kann älter sein.

## Nächster Schritt

GitHub-Issue #42 (Godot Detect/Doctor).
