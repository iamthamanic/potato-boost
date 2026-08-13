#!/usr/bin/env bash
# Root quality gate for @test-gate / @ecc-check (P-01 audit when a lockfile exists).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

pnpm lint
pnpm typecheck
pnpm test

if [[ -f pnpm-lock.yaml ]]; then
  pnpm audit --audit-level=high
fi
