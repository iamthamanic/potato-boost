# Design: Godot addon confirm

Issue #44. Stay in `packages/adapter-godot` + CLI init. Do not change `packages/core`.

`potato init --godot` lists `addons/potato_boost` files. `--confirm` writes them only when they do not already exist. Cleanup: delete the folder.
