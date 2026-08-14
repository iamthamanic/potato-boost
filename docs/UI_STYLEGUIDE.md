# UI Styleguide — Potato Boost

<!-- Style tree: tokens → components → patterns. Scaffolded by /project-setup from docs/PRD.md §10 -->

Reference for humans and agents. `@verify-ui` uses this for visual/UX sanity checks.

Dashboard UI copy is **English** (PRD Q-006). Product docs remain German-primary.

## Principles

- Desktop-first, dense developer UI — not a marketing site
- Every interactive control: default, hover, focus, disabled, loading, error
- Pass / Fail / Inconclusive always use icon **and** text, never color alone
- No single pseudo-precise “Performance Score”
- Monospace only for IDs, paths, values, and code
- Motion 100–150 ms; disable when `prefers-reduced-motion`
- No hover-only actions; pointer, keyboard, and touch expose the same operations

## Design tokens

Define in CSS/Tailwind config — no hardcoded magic numbers in components without token.

| Token | Value | Usage |
|-------|-------|-------|
| Color | Neutral light + dark themes; semantic colors meet WCAG contrast | Status, charts, surfaces |
| `--space-*` | 4 px base; 8 / 12 / 16 / 24 / 32 | Layout gaps |
| `--radius-md` | 4–8 px; no pill default containers | Panels, inputs |
| Typography | 14 px UI base, 12 px metadata, 20–28 px page titles | Dense Dev-UI |
| Motion | 100–150 ms; no decorative looping animation | State changes |
| Grid | 12 columns ≥1280 px; 8 columns to 1279 px; 4 columns <768 px | Page and panel layout |
| Border | 1 px semantic neutral; status not via border color alone | Panels, tables, focus |
| Elevation | Max two layers; drawer/modal over a clear overlay | Evidence drawer, dialogs |
| Icons | One consistent SVG set; icon + text or accessible name | Status and actions |
| Theme | light, dark, system; chart pairs verified in both | Whole app |

## Typography

| Role | Font | Size | Weight |
|------|------|------|--------|
| Page title | Sans-serif | 20–28 px | Semibold |
| Body / UI | Sans-serif | 14 px | Regular |
| Metadata | Sans-serif | 12 px | Regular |
| IDs, paths, values, code | Monospace | 12–13 px | Regular |

## Components

Document project primitives (not every third-party widget). Planned from PRD:

| Component | Location | Notes |
|-----------|----------|-------|
| DetectionCard | `apps/dashboard/src/detection-card.tsx` | confirmed / ambiguous / unsupported; radio semantics |
| RunPhaseStepper | `apps/dashboard/src/run-phase-stepper.tsx` | queued → completed/failed; named operation text |
| MetricBudgetCard | `apps/dashboard/src/run-overview.tsx` | pass / fail / inconclusive / unsupported; icon+text |
| Timeline | planned | zoom, markers, selected range; keyboard + data table fallback |
| FindingRow | `apps/dashboard/src/run-detail.tsx` | severity, confidence; semantic table |
| FindingDetail | `apps/dashboard/src/finding-detail.tsx` | six PRD §10 blocks; ruleId + confidence |
| EvidencePanel | planned | raw / derived / source; heading structure |
| CompareTable | planned | improved / regressed / neutral / incomparable |

## Layout

- Max content width: full workspace; Run Detail is a two-column analysis + evidence layout from 1280 px
- 768–1279 px: evidence panel as a drawer; all functions remain
- <768 px: reading + setup, run start, abort, finding review must work; complex timeline may fall back to a data table and preset zooms
- Tables stay tables; at narrow widths selectable columns or horizontal scroll — not unlabeled cards
- Breakpoints: mobile 390 px, tablet 768 px, desktop 1280 px

## States (required)

| State | Pattern |
|-------|---------|
| Loading | Named phase + concrete operation, not only a spinner; `aria-busy` |
| Empty | Next required action and why, e.g. “No validated scenario yet” |
| Error | Error class, command, truncated log, path to full log, retry |
| Inconclusive | Measurement visible, no pass/fail claim |
| Offline | Fully usable locally; external integrations disabled |
| Disabled | Reason shown on the control |

## Accessibility

- Target: WCAG 2.2 AA (W3C Rec 2024-12-12)
- Focus visible on all interactive elements
- Form fields: associated labels
- Status not by color alone
- Tables and charts need text alternatives
- Keyboard completion of core journeys; 200% zoom and reflow

## Content design

- “Measurement” / “observation” for raw data
- “Finding” only when evidence requirements are met
- “Estimated” for budget runs, “Emulated” for supported throttling, “Hardware-validated” only for a real runner
- Recommendations must not use certainty language such as “will fix”

## Do / Don't

**Do**

- Reuse tokens and planned primitives
- Show run quality, budgets, regressions, findings, and test context on the home view
- Keep Finding Detail as six blocks: observed, budget/baseline, when in scenario, supporting signals, plausible change class, how to verify

**Don't**

- Introduce one-off colors outside tokens
- Claim hardware proof from throttling
- Ship features without empty/error/inconclusive states
- Copy Playwright Trace Viewer terminology as the product model

## Design quality refs (pipeline — do not run during project-setup)

- Create: `@frontend-design` (general UI); `@design-taste-frontend` (landing/portfolio — not this product); `@imagegen-frontend-mobile` (mobile screens — not primary here)
- Audit: `@web-design-guidelines`; browser proof via `@verify-ui`

UX references (adapt, do not copy brand): Playwright Trace Viewer (synced timeline), shadscan (deterministic audit + CI handoff), mindwalk (local server + embedded dashboard).
