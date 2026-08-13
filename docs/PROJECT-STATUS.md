# Projektstatus

Stand: 2026-08-13 · Quelle: `.project-memory/` · Alle Claims **needs-review**.

## Fokus

- Read-only Discovery und Scenario Engine stehen; als Nächstes Doctor und Dashboard.

## Zuletzt erledigt

- Scenario Engine mit Phasen und Wiederholungen (issue #15).
- Read-only Discovery mit Evidence und Confidence (issue #12).
- `packages/cli`: npx-Entrypoint, Hilfe, Exit-Code 2 (issue #11).
- `packages/evidence`: Provenienz und Source Candidates (issue #8).
- `packages/rule-engine` + `rules-web`: deterministische evaluate() (issue #7).
- `packages/analysis`: Quantile, Hitches, Datenqualität (issue #6).
- `packages/artifact-store`: atomares Schreiben unter `.potato` (issue #5).
- `packages/schemas`: Zod + committed JSON Schema für run-artifact (issue #4).
- TypeScript-Workspace-Gates: `pnpm checks` (issue #2).

## Unvollständig

- Doctor, Dashboard und Three.js-Fixture-Runner fehlen noch.

## Risiken

- Living-Docs-Claims sind needs-review.
- Offene PRD-Entscheidungen Q-001 bis Q-007.
- Node-Ziel ist 24 LTS; die lokale Maschine kann älter sein.

## Nächster Schritt

GitHub-Issues #15 (CLI-Weiterbau) bzw. #17 (Fixture).
