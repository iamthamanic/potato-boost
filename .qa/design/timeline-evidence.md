# Design: Timeline evidence

Issue #25. Tokens from `docs/UI_STYLEGUIDE.md`.

## Intent
One time axis for scenario markers and samples. Keyboard zoom presets. Evidence is raw / derived / source.

## Layout
```
[ Run detail tabs ] Overview | Timeline | Findings | Raw
Timeline: markers (setup/warmup/measure/cleanup) + selected sample range
  Desktop: sparkline + marker ticks; keyboard [ / ] or preset buttons (all, measure)
  <768px: sample table
Evidence: three labeled lists — Raw, Derived, Source
```

`prefers-reduced-motion`: no transitions over 150ms.

## API
`GET /api/v1/runs/:id/samples` — golden id returns 40 synthetic `frame_time` samples (timestampNs 0..39, value 40ms).

## Out
Video replay, 1M-sample virtualization, GPU debugger.
