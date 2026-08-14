# Design: potato ci exit codes

Issue #30. CLI-only.

## Intent
One command, five documented exits, machine-readable report paths.

## Flow
detect → doctor → quick scan → export report → optional baseline compare → emit `{exitCode,jsonPath,htmlPath,runId}` → exit.

## Out
SaaS CI dashboard, Marketplace Action.
