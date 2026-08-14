# Design: Setup detect UI

Issue #22. Tokens from `docs/UI_STYLEGUIDE.md`. Desktop-first dense lab UI.

## Intent
Honest detection, not a confidence theater. Ambiguous targets sit side by side as radio cards. Confirm is the only write.

## Aesthetic
Reuse shell tokens (paper/stone/teal, IBM Plex). Signature: DetectionCard as a lab sheet — left radio, evidence ticks, confidence as a 0.00–1.00 fraction in metadata type. No percent, no fake 96%.

## Layout
```
[ nav ]  Setup detect
         Ambiguous banner (if ≥2 supported)
         [ Card A ] [ Card B ]
         Start argv override (program + args as argv)
         [ Cancel ] [ Confirm ]
         Preview YAML (after preview/confirm)
```

Doctor route: capability table (icon+text status, path, detail). Missing required checks name the install/path.

## States
- Loading: “Detecting project candidates” / “Running doctor”
- Empty: no API / no candidates — next action named
- Error: status + retry
- Disabled Confirm: visible reason (“Select a target first”)

## API
- `GET /api/v1/detect` read-only
- `POST /api/v1/config/preview|cancel|confirm`
- `POST /api/v1/doctor`
- Root bound at server start. Loopback CORS for `http://127.0.0.1:*` / `http://localhost:*` only.

## Out
Scenario recorder, Compare, rule-pack editor, DaisyUI/Next.js, token persistence.
