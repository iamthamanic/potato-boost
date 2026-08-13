# Potato Boost — project-specific edge cases for verify-ui

Extends the universal matrix in the verify-ui skill.
Add rows as features ship. Product edge cases: docs/PRD.md §9.

## Global

| ID | Case | Fail if |
|----|------|---------|
| G-01 | App loads | Blank screen, uncaught console errors |
| G-02 | Locale | Dashboard UI language is not English (AGENTS.md / Q-006) |

## Security (Secure-by-Default Seeds)

Seed-Edge-Cases aus der Secure-by-Default-Checkliste (siehe AGENTS.md §Security). Pro Feature ergänzen, sobald zutreffend.

| ID | Case | Fail if |
|----|------|---------|
| S-01 | Secret im Client | `localStorage`/Client-Bundle enthält Token/Secret/Password |
| S-02 | XSS über User-Input | Unvalidierter User-Input wird gerendert ( dangerouslySetInnerHTML o.ä.) |
| S-03 | IDOR / fehlende Authz | Sensitive Ressource ohne Owner-/Rollen-Check erreichbar |
| S-04 | SQL-Injection | Raw-SQL mit User-Input via String-Konkatenation |
| S-05 | Insecure Cookie | Session-Cookie ohne HttpOnly+Secure+SameSite in Prod |
| S-06 | Upload ohne Validierung | File-Upload akzeptiert beliebigen Typ/Größe |
| S-07 | Auth-Endpoint ohne Rate-Limit | Login/Register ohne Rate-Limiting |
| S-08 | Secrets in Logs | `console.log`/Error enthält Password/Token/API-Key |

## Discovery and setup

| ID | Case | Fail if |
|----|------|---------|
| EDGE-001 | Empty or unknown repository | Invents a stack instead of Generic Process/Static Mode |
| EDGE-002 | Multiple apps in a monorepo | Treats targets as one app or hides override |
| PB-SETUP | Discovery writes files | Any project file changes before explicit setup confirm |

## Run and measurement

| ID | Case | Fail if |
|----|------|---------|
| EDGE-003 | Dashboard port in use | Fails hard instead of picking a free loopback port and showing the URL |
| EDGE-004 | App spawns child processes | Process tree missing; wrong primary process assumed silently |
| EDGE-005 | Host background load | Hard pass/fail instead of `inconclusive` |
| EDGE-006 | App crashes in warm-up | Performance-fail; no partial trace/logs |
| EDGE-007 | Debug vs release | Hard compare across build types |
| EDGE-009 | Missing source map | Finding dropped or overstated source confidence |
| EDGE-010 | Collector unavailable | Dependent rules still fail instead of skip/`unsupported` |
| EDGE-012 | Newer artifact schema | Silent migration or crash without a readable compatibility error |

## Privacy and local API

| ID | Case | Fail if |
|----|------|---------|
| EDGE-008 | Secret typed in recorder | Value stored in scenario/run artifact |
| EDGE-011 | Foreign website calls localhost | Request allowed without Origin/Host/Run-Token check |
