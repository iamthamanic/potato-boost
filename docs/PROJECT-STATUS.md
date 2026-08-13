# Projektstatus

Stand: 2026-08-13 · Quelle: `.project-memory/` · Alle Claims **needs-review**.

## Fokus

- Artifact Spine: Schema, Store, Analysis und Rules stehen; als Nächstes CLI-Entrypoint und Three.js-Fixture.

## Zuletzt erledigt

- `packages/rule-engine` + `rules-web`: deterministische evaluate() (issue #7).
- `packages/analysis`: Quantile, Hitches, Datenqualität (issue #6).
- `packages/artifact-store`: atomares Schreiben unter `.potato` (issue #5).
- `packages/schemas`: Zod + committed JSON Schema für run-artifact (issue #4).
- TypeScript-Workspace-Gates: `pnpm checks` (issue #2).

## Unvollständig

- evidence-graph, CLI, Dashboard und Fixtures fehlen noch.

## Risiken

- Living-Docs-Claims sind needs-review.
- Offene PRD-Entscheidungen Q-001 bis Q-007.
- Node-Ziel ist 24 LTS; die lokale Maschine kann älter sein.

## Nächster Schritt

GitHub-Issues #8 (evidence-graph) bzw. #11 (CLI) und #17 (Fixture).
