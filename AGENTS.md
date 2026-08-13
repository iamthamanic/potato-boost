# AGENTS.md — Potato Boost

Dieses Dokument ist die **verbindliche Projektkarte** für Menschen und KI-Agenten.
Lies es zuerst, bevor du Code änderst.

## Was ist dieses Projekt?

Potato Boost ist ein lokal ausgeführtes Entwicklerwerkzeug (CLI + Browser-Dashboard). Es erkennt Projektarten, misst reproduzierbare Performance-Szenarien und erzeugt Findings mit Messwert, Budget, Evidenz, Regel-ID und Confidence. Der Messkern ist deterministisch; KI ist optionaler Enrichment-Layer, niemals Source of Truth für Messwerte.

**PRD:** [docs/PRD.md](docs/PRD.md)

### Was dieses Repo **ist**

- npm-/pnpm-CLI mit lokalem Loopback-Dashboard
- Capability-basierte Adapter (MVP: Web/Three.js; später Godot, Tauri, .NET)
- versionierte Run-Artefakte, Rule Packs, Compare und CI-Exit-Codes
- Greenfield-Monorepo (`apps/` + `packages/`)

### Was dieses Repo **nicht** ist

- kein Cloud-/SaaS-Backend, kein Account, kein VisoDev-Zwang
- kein automatischer Patch von Produktivcode (MVP)
- kein Ersatz für Engine-Profiler, APM, Sentry oder OpenTelemetry
- kein allgemeiner Multi-Language-Knowledge-Graph

---

## Tech Stack (verbindlich)

| Bereich | Technologie | Notiz |
|---------|-------------|-------|
| Runtime | Node.js 24 LTS | CLI, Local API, Orchestrierung |
| Sprache | TypeScript (strict) | gemeinsame Schemas |
| Package Manager | pnpm Workspaces | Root orchestriert `apps/*` und `packages/*` |
| Frontend | React + Vite | `apps/dashboard` — noch nicht scaffolded |
| Local API | Fastify + SSE | Loopback-only, Run-Token |
| Schemas | Zod + JSON Schema | `packages/schemas` ist die kanonische Schicht |
| Web Runner | Playwright + CDP | Web-Adapter |
| Tests | Vitest + Playwright | Unit, Contract, E2E |
| Styling | CSS/Tailwind tokens laut [docs/UI_STYLEGUIDE.md](docs/UI_STYLEGUIDE.md) | dichte Dev-UI, kein Marketing-Look |
| Deployment | lokal / CI Artefakte | kein Produktionsbackend im MVP |

**Nicht verwenden:** Cloud-Auth, SaaS-Datenbank, automatische Codemods, VisoDev als Kernabhängigkeit, Shell-String-Ausführung für erkannte Commands, Next.js/Supabase als Produktstack (User-Global-Rules gelten nicht gegen dieses PRD).

---

## Architektur

Geplante Struktur (noch nicht als Code vorhanden — nicht erfinden, bis `@pingpong-solution` / `@implement` sie anlegt):

```
potato-boost/
├── apps/dashboard/            # React + Vite Dashboard
├── packages/
│   ├── schemas/               # Zod + JSON Schema (keine fachlichen Deps)
│   ├── core/                  # Application Services, Run-State
│   ├── cli/                   # npx entrypoint
│   ├── local-api/             # loopback REST/SSE
│   ├── adapter-sdk/           # Capability Contracts
│   ├── adapter-web/           # Playwright, CDP, Web/Three.js
│   ├── analysis/              # Statistik, Noise, Compare
│   ├── rule-engine/           # deterministische Rules
│   ├── artifact-store/        # atomare lokale Dateien + Hashes
│   └── …
├── fixtures/                  # deterministische Benchmarks
├── docs/                      # PRD, Styleguide, Living Docs
└── .qa/                       # Pipeline-Config
```

### Schichtenregeln

1. Dependency-Richtung: Dashboard → Local API → Core → Domain-Pakete. Schemas hängen von keinem fachlichen Paket ab.
2. Konkrete Adapter implementieren das Adapter SDK und werden vom Core geladen; sie dürfen nicht auf Dashboard oder Rule-Engine-Internals zugreifen.
3. KI darf erklären/priorisieren, aber keine Messwerte erzeugen und keine Rule-Ergebnisse überschreiben.
4. Discovery ist read-only. Schreiben (Config, `.gitignore`, Addon) erst nach expliziter Nutzerbestätigung.
5. Budget/Drosselung darf nie als `hardware-validated` ausgegeben werden.

Handoff-Reihenfolge aus dem PRD: zuerst `schemas`, `artifact-store`, `adapter-sdk` und Three.js-Fixture; danach Web-Detector/Doctor/Runner/Collector; Dashboard erst auf stabilem Artifact- und Local-API-Vertrag.

---

## Sprache & Naming

| Bereich | Sprache |
|---------|---------|
| Dashboard-UI (Labels, Fehler) | Englisch (PRD Q-006 Default) |
| Produkt-Docs, AGENTS, Living Docs | Deutsch primär, EN-Spiegel unter `docs/en/` |
| Code, Commits, Schema-Felder | Englisch |
| Message Keys | lokalisierbar von Beginn an |

---

## Validation

- **Checks:** `pnpm checks` (Root; `scripts/run-checks.sh` → lint, typecheck, test, audit)
- **Dev (geplant):** `pnpm --filter dashboard dev` → http://localhost:5173
- **E2E:** `pnpm test:e2e` (Playwright via `@verify-ui` when ready)

Run checks before push. Do not bypass hooks.

Quality tools am Workspace-Root ausführen. Vor Push `pnpm checks`.

Root-Commands: `pnpm build`, `pnpm lint`, `pnpm typecheck`, `pnpm test`. Geplant: `pnpm test:contract`, `pnpm test:e2e`, `pnpm test:security`, `pnpm test:performance`.

---

## UI / Design

- Styleguide: [docs/UI_STYLEGUIDE.md](docs/UI_STYLEGUIDE.md)
- Desktop-first, dichte Entwickleroberfläche; kein Marketing-UI
- Kein einzelner „Performance Score“; Run-Qualität, Budgets, Findings, Testkontext
- Required states: loading (Phase + Operation), empty, error, inconclusive, offline, disabled
- WCAG 2.2 AA; keine hover-only Aktionen; Reduced Motion respektieren

---

## Issue Template (verbindlich)

Alle Issues folgen dem kanonischen Template aus **`@issue-contract`**
(global: `~/.claude/skills/issue-contract/references/issue-template.md`).
Projekt-Override (nur bei Bedarf): `.qa/issue-template.md` — ersetzt das globale Template vollständig.
Projekt-Werte (Labels, Runtime-Achsen, Locale): `.qa/project.yaml` → `issueContract`.

Pflicht-Sektionen in Reihenfolge: `Type → Intent → Goal → Non-Goals → Context → Scope → User Journey → Runtime → Security & Data → Edge Cases → Acceptance → Blockers → Runner`.

---

## Security Checklist (Secure by Default)

Diese Checkliste ist **techstack-agnostisch** und für alle Agents verbindlich. Vollständige Quelle mit Severity-Mapping und RG-Probes: `~/.claude/skills/security-review/references/secure-by-default-checklist.md` (Inhalte eingebettet, keine externe Links).

Jede Feature-Implementierung muss die zutreffenden Sektionen abhaken. `@implement` dokumentiert die Coverage in der Acceptance-Datei, `@audit-changes`/`@ecc-check` führen diff-scoped Probes aus, `@review-ticket` prüft die Coverage im Verdict.

**Projekt-Anpassung (local-only MVP):** Dashboard bindet ausschließlich Loopback, zufälligen Port und pro-Prozess Run-Token. Es gibt kein Benutzerkonto. **F-01 (HTTPS)** gilt nicht für Loopback-only; bei späterer Remote-Bindung sind TLS und ein neues Auth-Modell zwingend (PRD §12). **B-01/B-06/P-03/P-05** gelten analog: kein Cloud-Auth; Origin/Host/Token statt Session-Cookies. Threat-Modell: untrusted Repo, Path Traversal, Cross-Origin gegen localhost, Secret-Leak im Recorder.

### Frontend Security

| # | Maßnahme | Fail if |
|---|----------|---------|
| F-01 | HTTPS überall | App läuft ohne TLS oder mixed content |
| F-02 | Input-Validierung & Sanitization | Unvalidierter User-Input erreicht Render-/State-Schicht |
| F-03 | Keine sensiblen Daten im Browser | `localStorage.setItem('token'\|'secret'\|'password', …)` im Diff |
| F-04 | CSRF-Schutz | State-changing Request ohne CSRF-Token oder SameSite-Cookie |
| F-05 | API-Keys nie im Frontend | Secrets in Client-Bundle, `NEXT_PUBLIC_*` für Secrets |

### Backend Security

| # | Maßnahme | Fail if |
|---|----------|---------|
| B-01 | Authentication Fundamentals | Eigenbau-Auth, Plaintext- oder schwache/unsalted Hashes |
| B-02 | Authorization Checks | Sensitive Operation ohne Rollen-/Owner-Check |
| B-03 | API-Endpoint-Schutz | Unauthentifizierter Endpoint auf geschützter Ressource |
| B-04 | SQL-Injection-Prävention | String-Konkatenation in SQL-Statement mit User-Input |
| B-05 | Basis Security Headers | Headers fehlen oder `unsafe-inline`/`unsafe-eval` ohne Removal-Plan |
| B-06 | DDoS-Schutz | Rate-Limiting deaktiviert, kein Edge-Protection-Layer |
| B-07 | Least-privilege assignment | Bundles/Rollen nur Whitelist; Actor kann mehr vergeben als er hält |
| B-08 | Deny-by-default AuthZ map | Non-GET hinter `*.view`; unbekannter Pfad → Default-Read statt deny |
| B-09 | Trust-boundary identity | User-ID/Rollen aus Client-Headern |

### Practical Security Habits

| # | Maßnahme | Fail if |
|---|----------|---------|
| P-01 | Dependencies aktuell | `npm audit --audit-level=high` zeigt offene High/Critical |
| P-02 | Korrekte Fehlerbehandlung | Error-Response enthält Stack-Trace, interne Pfade oder Secrets |
| P-03 | Secure Cookies | Session-Cookie ohne HttpOnly oder ohne Secure in Prod |
| P-04 | File-Upload-Sicherheit | Upload ohne Type/Size-Validierung, Pfad-Traversal möglich |
| P-05 | Rate Limiting | Auth-Endpoint ohne Rate-Limit oder Limit deaktiviert |

Critical-Verstöße (F-03, B-01, B-04, B-07, B-08, B-09, P-04) blocken PR/READY. Important-Verstöße blocken ACCEPT/READY bis fix.

Potato-Boost-Pflichten zusätzlich: argv-Arrays statt Shell-Interpolation; kanonische Pfade + Root-Allowlist; keine Secrets in Scenario-Dateien, Logs oder Reports; Schema-Validierung aller Config-/Adapter-/Importdaten.

---

## QA Pipeline

```
@pingpong-solution  →  @implement  →  @verify-ui
```

- Design artifacts: `.qa/design/`
- Acceptance: `.qa/acceptance/` (auto-generated by @implement)
- Project config: `.qa/project.yaml`
- Issue template: `@issue-contract` (global canonical; project override via `.qa/issue-template.md`, values via `.qa/project.yaml` → `issueContract`)
- Living docs: `@memory-live-doc` (see below; also via `@ecc-check` / `@commit-push-safe`)

Erster Implementierungsschnitt laut PRD Slice 1: Artifact Spine (`schemas`, `artifact-store`, Analysis/Rules, Golden Artifact). Nicht das Dashboard zuerst bauen.

---

## Living documentation

After material changes, run `@memory-live-doc` (or rely on `@implement` / `@ecc-check` / `@commit-push-safe` / `@project-setup` integration).

- Do not invent features in docs without evidence.
- Storage: `.project-memory/` (bilingual DE+EN JSON; human docs under `docs/` + `docs/en/`).
- Interactive viewer: `docs/memory-live-doc/viewer/` (GitHub Pages).
- First setup: `@project-setup` Step 9 or `@memory-live-doc bootstrap`.

---

## README

Keep README in sync when adding features, scripts, or env vars.
