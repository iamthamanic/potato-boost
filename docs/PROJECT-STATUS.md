# Projektstatus

Stand: 2026-08-13 · Quelle: `.project-memory/` · Alle Claims **needs-review**.

## Fokus

- Artifact Spine: Schema, Store, Analysis, Rules und Evidence stehen; als Nächstes Golden-Tests, CLI und Fixture.

## Zuletzt erledigt

- `packages/evidence`: Provenienz und Source Candidates (issue #8).
- `packages/rule-engine` + `rules-web`: deterministische evaluate() (issue #7).
- `packages/analysis`: Quantile, Hitches, Datenqualität (issue #6).
- `packages/artifact-store`: atomares Schreiben unter `.potato` (issue #5).
- `packages/schemas`: Zod + committed JSON Schema für run-artifact (issue #4).
- TypeScript-Workspace-Gates: `pnpm checks` (issue #2).

## Unvollständig

- Golden-Artifact-Tests, CLI, Dashboard und Fixtures fehlen noch.

## Risiken

- Living-Docs-Claims sind needs-review.
- Offene PRD-Entscheidungen Q-001 bis Q-007.
- Node-Ziel ist 24 LTS; die lokale Maschine kann älter sein.

## Nächster Schritt

GitHub-Issues #9 (golden-artifact) bzw. #11 (CLI) und #17 (Fixture).
