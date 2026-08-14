# Projektstatus

Stand: 2026-08-14 · Quelle: `.project-memory/` · Alle Claims **needs-review**.

## Fokus

- Abort-Cleanup steht; als Nächstes Dashboard (#20).

## Zuletzt erledigt

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

- Local API und Dashboard fehlen noch.

## Risiken

- Living-Docs-Claims sind needs-review.
- Offene PRD-Entscheidungen Q-001 bis Q-007.
- Node-Ziel ist 24 LTS; die lokale Maschine kann älter sein.

## Nächster Schritt

GitHub-Issues #20 (Dashboard).
