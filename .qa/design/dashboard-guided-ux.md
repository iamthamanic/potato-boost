# Dashboard Guided UX

## Intent
Reshape the existing dashboard around the user journey `set up → scan → understand → change → verify` without changing Local API or run-artifact contracts.

## Product model
Default experience: Overview → Scan → Findings → Verify.
Advanced controls remain available through Scenarios, Target profiles, Rules, Project setup, and technical details.

## Information architecture
Primary destinations are Overview, Runs, Compare, and Scenarios. Test setup groups Target profiles, Rules, and Project setup. Settings remains global. Live Run and Run Detail are contextual run states, not permanent navigation destinations.

## Visual direction
Keep the existing warm neutral + teal palette and IBM Plex typography. Treat the dashboard as a precision instrument on a technical workbench: dense, calm, explicit state, no single score, no decorative dashboard chrome.

Signature element: a reusable horizontal **Run Tape** for Prepare → Warm up → Measure → Analyze → Report. It carries current operation text, status icon + text, keyboard-readable ordered semantics, and reduced-motion-safe styling.

## Layout
- Setup/settings: narrow reading column.
- Overview, run result, timeline, compare: full workspace.
- >=1280px: analysis + evidence may use two columns.
- 768–1279px: evidence stacks/discloses instead of a cramped sidebar.
- <768px: single-column reading order with tables allowed to scroll/fallback.

## Progressive disclosure
Human-facing copy leads with observation, measurement, budget/baseline, timing, confidence, and next action. Run IDs, rule IDs, argv details, YAML, raw artifacts, and debug helpers move to `details`/technical areas.

## Constraints
- No new dependency.
- No `packages/**` changes.
- Preserve loopback-only/session-token behavior and explicit write confirmations.
- Do not turn source candidates or plausible change classes into confirmed causes.
