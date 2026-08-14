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

This is a pnpm workspace. `apps/dashboard` is the React + Vite shell (PRD routes; `/setup/detect`, `/setup/doctor`, `/runs/new`, `/runs/:id/live`, and `/runs/:id` overview/timeline/findings are live; remaining routes stay empty/error/loading). `packages/core` is a TypeScript smoke package. `packages/schemas` holds the canonical Zod + JSON Schema contracts. `packages/artifact-store` writes completed runs atomically under `.potato/`. `packages/analysis` computes quantiles, hitches, and data quality (never mean-only). `packages/rule-engine` evaluates versioned rule packs (no AI). `packages/evidence` binds provenance and ordered source candidates (never a confirmed cause). `packages/scenario-engine` runs phase-based scenarios (setup/warm-up/measure/cleanup) against an injected driver. `packages/collector-hub` ingests samples on a shared timeline. `packages/collector-os` samples CPU/RSS and the process tree. `packages/adapter-web` is the Web doctor and CDP collector (Node, Playwright Chromium, start argv, port). `packages/adapter-sdk` is the adapter manifest and contract harness, including an in-memory fake adapter for T-006. `packages/local-api` is the loopback Fastify REST/SSE server (127.0.0.1, random port, per-process run token, Origin/Host checks; detect/doctor/config confirm; golden run artifact GET). `packages/cli` is the `potato-boost` / `potato` npx entrypoint (Commander; `detect` is read-only discovery; `init` previews then writes `potato.config.yaml` only with `--confirm`; `--start` stores an argv override, not detect evidence; `doctor` prints capability checks; unknown repos are generic/static and do not require a browser; `run` executes a smoke Quick Scan and writes a run artifact without spawning unless an override was confirmed; `ci` gates a run with exit codes 0/1/2/3/4 and prints JSON/HTML report paths). `packages/schemas/fixtures/golden-v1.0.0.json` is the Slice-1 golden run artifact. Remaining `apps/` and `packages/` from the PRD are still unscaffolded.

There is no `.env` for the MVP. The tool is local-only and offline-capable.

## Development

```bash
pnpm dev
```

```bash
pnpm build
node packages/cli --help
```

`pnpm --filter dashboard dev` serves the shell at [http://127.0.0.1:5173](http://127.0.0.1:5173). Pass `?token=` and `?api=` on the query string; the run token stays in memory (not localStorage). The local API binds loopback only.

`potato compare --baseline a.json --candidate b.json` hard-compares two artifacts (exit 4 if non-comparable, exit 1 only on a compatible regression). `potato compare --set-baseline a.json --confirm` writes `.potato/baselines.json`; without `--confirm` it writes nothing.

`potato ci [path] [--baseline artifact.json] [--out dir]` runs doctor + Quick Scan, writes JSON/HTML reports, and exits 0 (pass), 1 (budget-fail), 2 (usage), 3 (infra, including missing browser), or 4 (inconclusive / non-comparable). Stdout is one JSON object `{exitCode,jsonPath,htmlPath,runId}`; stderr repeats `jsonPath` and `htmlPath` as tab-separated lines.

Keyboard path (core journeys, Tab then Enter; skip link is first):

1. **Setup confirm** — `/setup/detect`: select a target radio, then Confirm (writes config). Cancel does not write.
2. **Run start** — `/runs/new`: Start Quick Scan.
3. **Abort** — `/runs/:id/live`: Abort run. Status becomes `cancelled`; the run is not a baseline.
5. **Compare** — `/compare`: Compare, then Confirm baseline (writes only after Confirm).

## Checks (quality gate)

```bash
pnpm checks
```

Runs `scripts/run-checks.sh`. Until packages exist this is a documented placeholder. After scaffolding it should run lint, typecheck, tests, and `pnpm audit --audit-level=high`.

## Tests

```bash
pnpm test              # Vitest
pnpm test:e2e          # Playwright Chromium — fixture :5199 plus dashboard Axe on :5173
pnpm test:security     # T-009 origin/path/argv + T-013 offline fetch guard
```

Offline / T-013: packages must already be local (`pnpm install` done). The first `npx` download without a network may fail; that is expected. Product code does not phone home. Loopback (fixture, local API, CDP) is allowed.

First e2e run needs a browser: `pnpm exec playwright install chromium`. CI installs Chromium with OS deps automatically.

Planned additional gates: `pnpm test:contract`, `pnpm test:performance`.

## Project structure

```
potato-boost/
├── apps/dashboard/       # React + Vite UI (setup, live run, run detail + empty shells)
├── packages/             # core, schemas, artifact-store, analysis, rule-engine, rules-web, evidence, collector-hub, collector-os, adapter-web, cli
├── fixtures/             # web-threejs benchmark fixture (in workspace)
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

- **2026-08-14** — Generic/unsupported mode for unknown repos; start argv is an override after confirm (`issue/34-generic-unknown-mode`).
- **2026-08-14** — Fake adapter contract fixture for Detect/Doctor/Launch/Collect without a browser (`issue/33-fake-adapter-tests`).
- **2026-08-14** — `potato ci` exit codes 0/1/2/3/4 with machine-readable report paths (`issue/30-potato-ci-exit-codes`).
- **2026-08-14** — Compare: hard compare only when locks match; baseline only with confirm (`issue/28-compare-baseline`).
- **2026-08-14** — Dashboard a11y: skip link, reduced motion, Axe on core routes (`issue/26-dashboard-a11y`).
- **2026-08-14** — Timeline + Evidence Panel: markers, selected sample range, keyboard zoom presets (`issue/25-timeline-evidence`).
- **2026-08-14** — Run detail: overview (quality + budget categories, no score) and six finding blocks including ruleId and confidence (`issue/24-run-detail-findings`).
- **2026-08-14** — Live run UI: named phases, expandable logs, abort to cancelled (not baseline) (`issue/23-live-run-ui`).
- **2026-08-14** — Setup UI: DetectionCard (evidence + 0–1 confidence), start argv override, doctor capability table; confirm writes, cancel does not (`issue/22-setup-detect-ui`).
- **2026-08-14** — Dashboard shell: PRD routes as empty/error/loading screens; token stays in memory (`issue/21-dashboard-shell`).
- **2026-08-14** — Offline e2e: blocked network, 0 product requests, packages-already-local (`issue/39-offline-e2e`).
- **2026-08-14** — T-009 security e2e: foreign Origin, path traversal, and shell metacharacters fail closed (`issue/37-security-e2e-local-api`).
- **2026-08-14** — Local API: loopback Fastify, run token, Origin/Host checks, REST + SSE (`issue/20-local-api-loopback`).
- **2026-08-14** — Abort/crash cleanup: process groups die within 10 s; cancelled/failed are not baselines (`issue/40-run-cancel-cleanup`).
- **2026-08-14** — Secret redaction: Authorization, bodies, and canary tokens never land in artifacts (`issue/38-secret-redaction`).
- **2026-08-14** — `potato run` Quick Scan walks setup/warmup/measure×3/cleanup and writes a schema-valid artifact (`issue/18-runner-quick-scan`).
- **2026-08-14** — CDP and OS collectors share one timeline; missing CDP is `unsupported` (`issue/16-collectors-web-os`).
- **2026-08-14** — `potato doctor` checks Node, browser, port, and start argv; missing required capability makes `potato run` exit 3 (`issue/14-web-doctor`).
- **2026-08-14** — `potato init` previews planned paths and writes `potato.config.yaml` only with `--confirm` (`issue/13-config-write-confirm`).
- **2026-08-14** — Playwright e2e smoke for `fixtures/web-threejs` (`pnpm test:e2e`); fixture is a workspace package on 127.0.0.1:5199.
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
