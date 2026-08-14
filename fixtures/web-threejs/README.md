# web-threejs fixture

Minimal Vite + React + Three.js app used by read-only discovery tests.

## Purpose

This fixture is a deterministic benchmark for potato-boost detection and quick scan. It can produce known performance problems on demand.

## Usage

```bash
# From repo root
pnpm --filter web-threejs-fixture dev
```

Open http://127.0.0.1:5199 (or the port Vite prints). Playwright e2e uses this same bind (`pnpm test:e2e`).

## Toggleable problems

Append `?problem=<name>` to the URL:

| Problem | Effect |
|---------|--------|
| `none` | Baseline single cube |
| `drawcalls` | 200 extra rotating cubes (draw-call pressure) |
| `longtask` | 50 ms busy loop every frame |
| `alloc` | Large array allocation every frame |

Example: `http://127.0.0.1:5199/?problem=longtask`

The active problem is shown in a small overlay at the top-left.

## Offline

The fixture uses no external assets and no network requests. It starts offline.
