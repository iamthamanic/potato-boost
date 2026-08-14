# Design: Run detail findings

Issue #24. Tokens from `docs/UI_STYLEGUIDE.md`.

## Intent
Read a completed golden run without a fake overall score. Finding Detail is six labeled blocks.

## Layout
```
[ nav ]  Run detail
         Tabs: Overview | Findings | Raw (stub)
         Overview: quality (icon+text) + budget category cards + test context
         Findings: table/rows → selected finding
           1 Observed  2 Budget/baseline  3 When in scenario
           4 Signals/sources  5 Change class  6 How to verify
```

No Performance Score. Confidence band as written (low stays low).

## API
`GET /api/v1/runs/:id/artifact` returns a schema-valid run artifact (golden id served from the committed fixture).

## Out
Compare, chart library, timeline zoom.
