# Acceptance — dashboard-guided-ux

## Intent
Make the local dashboard understandable as one guided workflow: configure the project, pass the system check, run a scan, understand evidence-backed findings, and verify changes.

## Preconditions
- Local API remains the existing loopback service.
- Existing project detection, doctor, run creation/live status, artifact, compare, and baseline APIs remain unchanged.
- Existing warm-neutral/teal design tokens and accessibility conventions remain authoritative.

## Happy Path / Postconditions
1. Given a user opens Potato Boost, when they use primary navigation, then they see user destinations rather than implementation states.
2. Given a detected project, when setup is confirmed, then the next visible step is the system check; when checks pass, the next visible step is starting the recommended Quick Scan.
3. Given a scan is configured, when the user starts it, then the chosen scenario/target/profile context is visible and the live view communicates named phases through a reusable Run Tape.
4. Given a run completes, when the result opens, then run quality, budgets, findings, timing/context, and next action precede technical identifiers.
5. Given evidence or source candidates exist, when a finding is inspected, then the UI distinguishes observations/supporting evidence from plausible areas and never claims an unproven cause.
6. Given two runs are compared, when the user enters/selects before/after runs, then the UI explains compatibility and the result in user-facing terms before raw identifiers/debug controls.

## Edge Cases
- Loading states name the operation.
- Empty states provide the next useful action.
- API failures explain recovery without presenting them as performance results.
- Inconclusive/noisy/cancelled/unsupported states remain explicit.
- 390px and 200% zoom preserve primary actions and readable semantics.
- 768–1279px does not force analysis/evidence into a cramped two-column layout.
- Reduced motion disables decorative transitions; state changes do not rely on motion or color alone.

## Scope
### In
- Dashboard shell/navigation and route framing.
- Guided setup/system-check/scan copy and hierarchy.
- Overview, live run, result/findings/timeline/compare presentation.
- Responsive CSS and focused dashboard tests/E2E expectations.

### Out
- Local API, schemas, collectors, adapters, analysis/rule behavior, CLI semantics.
- Cloud state, auth, remote execution, automatic code changes.

## Security Coverage
- **F-02 — sensitive data:** no new persisted/client-stored sensitive data; existing session token handling remains unchanged.
- **F-03 — frontend is not an authority:** no authorization or validation rule moves into the dashboard; server responses remain authoritative.
- **F-05 — errors/logs:** user-facing failures remain bounded and do not add secret/token output.
- Backend B-xx: out of scope because no backend/API route or trust-boundary behavior changes.
- Practical P-xx: existing repo checks, typed-strict, and focused tests remain mandatory before merge.

## Verification
- `pnpm checks`
- dashboard unit tests affected by changed presentation
- `pnpm test:e2e` / focused dashboard a11y journey where environment permits
- typed-strict: zero escape hatches in touched TypeScript files

## Implementation Notes
_To be completed after implementation._
