# web-threejs fixture

Minimal Vite + React + Three.js app used by read-only discovery tests.

## Purpose

This fixture is a deterministic benchmark for potato-boost detection and quick scan. It can produce known performance problems on demand.

## Usage

```bash
# From repo root
pnpm --filter web-threejs-fixture dev
# or
cd fixtures/web-threejs && npx vite
```

Open http://localhost:5173 (or the port Vite prints).

## Toggleable problems

Append `?problem=<name>` to the URL:

| Problem | Effect |
|---------|--------|
| `none` | Baseline single cube |
| `drawcalls` | 200 extra rotating cubes (draw-call pressure) |
| `longtask` | 50 ms busy loop every frame |
| `alloc` | Large array allocation every frame |

Example: `http://localhost:5173/?problem=longtask`

The active problem is shown in a small overlay at the top-left.

## Offline

The fixture uses no external assets and no network requests. It starts offline.
