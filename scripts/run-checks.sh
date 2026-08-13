#!/usr/bin/env bash
# Root quality gate for @test-gate / @ecc-check.
# Until apps/ and packages/ exist this is a documented placeholder (P-01 audit when a lockfile appears).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

has_app_code=0
if compgen -G "apps/*/package.json" > /dev/null || compgen -G "packages/*/package.json" > /dev/null; then
  has_app_code=1
fi

if [[ "$has_app_code" -eq 0 ]]; then
  echo "run-checks: no workspace packages yet — skipping lint/typecheck/test"
  echo "planned: pnpm lint && pnpm typecheck && pnpm test && pnpm audit --audit-level=high"
  exit 0
fi

pnpm lint
pnpm typecheck
pnpm test

if [[ -f pnpm-lock.yaml ]]; then
  pnpm audit --audit-level=high
fi
