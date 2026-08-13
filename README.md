# Potato Boost

Local CLI + dashboard that turns performance measurement into reproducible findings: scenario, target profile, evidence, rule, and confidence.

See [docs/PRD.md](docs/PRD.md) for product scope and [docs/ROADMAP.md](docs/ROADMAP.md) for the build order (epics).

Repository: [iamthamanic/potato-boost](https://github.com/iamthamanic/potato-boost)

## Prerequisites

- Node.js 24 LTS (project target; local machines may still be on 22)
- pnpm 10+
- A browser binary for Web runs (Playwright manages a compatible version once the web adapter exists)

## Setup

```bash
# From repository root
pnpm install
```

This is a pnpm workspace. `packages/core` is a TypeScript smoke package. `packages/schemas` holds the canonical Zod + JSON Schema contracts. `packages/artifact-store` writes completed runs atomically under `.potato/`. `packages/analysis` computes quantiles, hitches, and data quality (never mean-only). `packages/rule-engine` evaluates versioned rule packs (no AI). `packages/evidence` binds provenance and ordered source candidates (never a confirmed cause). `packages/scenario-engine` runs phase-based scenarios (setup/warm-up/measure/cleanup) against an injected driver. `packages/cli` is the `potato-boost` / `potato` npx entrypoint (Commander; `init`/`doctor`/`run`/`ci` are stubs; `detect` runs read-only discovery). `packages/schemas/fixtures/golden-v1.0.0.json` is the Slice-1 golden run artifact. Remaining `apps/` and `packages/` from the PRD are still unscaffolded.

There is no `.env` for the MVP. The tool is local-only and offline-capable.

## Development

```bash
pnpm dev
```

```bash
pnpm build
node packages/cli --help
```

Once `apps/dashboard` exists, the local dashboard is expected at [http://localhost:5173](http://localhost:5173). The production local API binds loopback only (random port + run token).

## Checks (quality gate)

```bash
pnpm checks
```

Runs `scripts/run-checks.sh`. Until packages exist this is a documented placeholder. After scaffolding it should run lint, typecheck, tests, and `pnpm audit --audit-level=high`.

## Tests

```bash
pnpm test              # Vitest — when packages exist
pnpm test:e2e          # Playwright — bootstrap via @verify-ui skill
```

Planned additional gates: `pnpm test:contract`, `pnpm test:security`, `pnpm test:performance`.

## Project structure

```
potato-boost/
├── apps/dashboard/       # planned React + Vite UI
├── packages/             # core, schemas, artifact-store, analysis, rule-engine, rules-web, evidence, cli
├── fixtures/             # planned benchmark fixtures
├── docs/
│   ├── PRD.md
│   ├── UI_STYLEGUIDE.md
│   ├── PROJECT-STATUS.md
│   └── memory-live-doc/viewer/
├── .qa/                  # design, acceptance, verify-ui config
├── .project-memory/      # living documentation source
├── scripts/run-checks.sh
└── AGENTS.md
```

## Environment variables

No required env vars in the MVP. Secrets for recorded scenarios must stay in the user’s environment or secret store and appear in Potato Boost only as reference names — never as values.

| Variable | Purpose |
|----------|---------|
| — | none for MVP |

## Agent workflow

For AI-assisted development:

1. `@project-setup` — bootstrap (once)
2. `@pingpong-solution` — design before features
3. `@implement` — code + acceptance artifact
4. `@verify-ui` — browser verification

See [AGENTS.md](AGENTS.md).

## Recent changes

- **2026-08-13** — CLI entrypoint `potato-boost` / `potato` with help and exit code 2 (`issue/11-cli-entrypoint`).
- **2026-08-13** — Golden v1.0.0 run artifact + schema compatibility tests (`issue/9-golden-artifact-tests`).
- **2026-08-13** — Evidence graph: provenance and ordered source candidates (`issue/8-evidence-graph`).
- **2026-08-13** — Deterministic rule engine + `rules-web` pack (`issue/7-rule-engine`).
- **2026-08-13** — Analysis engine: p95/p99, hitches, data quality (`issue/6-analysis-engine`).
- **2026-08-13** — Atomic local artifact store under `.potato/` (`issue/5-artifact-store`).
- **2026-08-13** — Canonical run-artifact Zod + JSON schemas in `packages/schemas` (`issue/4-schemas-core`).
- **2026-08-13** — TypeScript workspace gates are real: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm checks` (`issue/2-ts-workspace-bootstrap`).
- **2026-08-13** — Project setup: PRD, QA scaffolding, living docs, epic roadmap (`docs/ROADMAP.md`).
- Project setup: QA scaffolding, PRD import, living docs bootstrap (needs-review).

## License

TBD
