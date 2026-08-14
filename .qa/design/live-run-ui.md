# Design: Live run UI

Issue #23. Tokens from `docs/UI_STYLEGUIDE.md`.

## Intent
Watch a run’s named phases and abort it. No timeline zoom.

## Layout
```
[ nav ]  Live run
         RunPhaseStepper: setup → warmup → measure → analyze → report
         Current operation text + status (icon+text)
         [ Abort run ]
         <details> Logs
```

aria-live="polite" only on the current phase line.

## API
- `POST /api/v1/runs/:id/abort` → `{ status: "cancelled", baselineEligible: false }`
- GET run includes `baselineEligible`
- SSE via fetch + Last-Event-ID reconnect; poll GET as fallback

## Out
Compare, finding detail, timeline zoom.
