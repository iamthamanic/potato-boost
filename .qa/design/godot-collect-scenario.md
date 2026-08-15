# Design: Godot collect and scenario

Issue #43. Stay in `packages/adapter-godot`.

Collector reads `potato.godot-performance.json` (Godot Performance monitors). Maps `time_process` / fps to `frame_time` ms. Missing snapshot → `godot.performance` unsupported (not required).

Driver walks Quick Scan phases without writing project files. Addon dump script is confirm-only and removable.
