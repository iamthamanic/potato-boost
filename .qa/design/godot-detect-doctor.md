# Design: Godot detect and doctor

Issue #42. New package `packages/adapter-godot`. No required `packages/core` edits.

Detect: `project.godot`, `.gd`, `.csproj` → kind `godot` with evidence.
Doctor: locate Godot on env + PATH + well-known paths; missing binary is required/missing and blocks run.
