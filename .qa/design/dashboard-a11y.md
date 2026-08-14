# Design: Dashboard a11y

Issue #26. Tokens from `docs/UI_STYLEGUIDE.md`.

## Intent
Keyboard-first core journeys. Axe is the CI gate for critical/serious. Reduced motion is global.

## Layout
- Skip link before nav; `main#main` is the target
- Sidebar wraps under 768 px so 200% zoom keeps Confirm / Start / Abort on screen

## Tests
Playwright + `@axe-core/playwright` on detect, new run, live, findings.

## Out
External audit certification, Settings deep a11y.
