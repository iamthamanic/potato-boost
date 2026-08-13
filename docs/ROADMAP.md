# Roadmap — Potato Boost

Warum diese Datei existiert: Damit jemand, der das Projekt in zwei Jahren zum ersten Mal sieht, versteht, **welches Problem** Potato Boost löst, **in welcher Reihenfolge** gebaut wird und **wann das Werkzeug einsatzbereit** ist.

Produktquelle: [PRD.md](PRD.md) (v0.2, READY WITH ASSUMPTIONS).  
GitHub: [iamthamanic/potato-boost](https://github.com/iamthamanic/potato-boost)

## Was „einsatzbereit“ bedeutet

**MVP (Web/Three.js):** Ein Entwickler kann in einem unterstützten Repo `npx` starten, Discovery bestätigen, einen Quick Scan fahren, Findings mit Evidenz lesen, einen Fix gegen eine Baseline vergleichen und in CI denselben Report bekommen — lokal, offline, ohne Cloudkonto. Release-Gate: PRD T-001 bis T-013.

**Nicht MVP:** Godot, Tauri, .NET, autonome Patches, SaaS, echte Hardware-Farm, VisoDev als Abhängigkeit.

## Lesereihenfolge für Neueinsteiger

1. Problem und Nicht-Ziele: PRD §2–§3
2. Nutzerreisen: PRD §6 (J-001 bis J-005)
3. Diese Roadmap (Epics)
4. Offene GitHub-Issues im passenden Milestone
5. Living Docs: [Projektstatus](PROJECT-STATUS.md) und Viewer unter `docs/memory-live-doc/viewer/`

## Epics (Reihenfolge ist die Bau-Reihenfolge)

| Epic | Label | Warum zuerst / später | MVP? |
|------|-------|------------------------|------|
| 0 Foundation | `epic:0-foundation` | Ohne TS-Workspace, Lint und Tests kann nichts reproduzierbar gebaut werden | ja |
| 1 Artifact Spine | `epic:1-artifact-spine` | Ein Run muss schema-valid und unveränderlich speicherbar sein, bevor CLI oder UI existieren | ja |
| 2 Web CLI | `epic:2-web-cli` | Erster Nutzerwert: erkennen, Doctor, Quick Scan auf Web/Three.js | ja |
| 3 Dashboard | `epic:3-dashboard` | Diagnose braucht Timeline und Findings, nicht nur Terminaltext | ja |
| 4 Compare & CI | `epic:4-compare-ci` | Vorher/Nachher und PR-Gates; ohne das ist der Fix nicht verifizierbar | ja |
| 5 Adapter SDK | `epic:5-adapter-sdk` | Vertrag, damit der nächste Stack den Core nicht forkt | ja (Vertrag), Adapter später |
| 8 Quality & Security | `epic:8-quality-security` | Offline, Secret-Redaktion, Loopback-Härte — parallel zu 2–4, blockt Release | ja |
| 6 Godot | `epic:6-godot` | Zweiter vertikaler Stack nach stabilem SDK | nein |
| 7 Desktop-Runtimes | `epic:7-desktop-runtimes` | Tauri und .NET als getrennte Adapter | nein |

Epic-Tracking-Issues auf GitHub tragen `[human-only]` und `needs-human`: sie sind Landkarten, keine Implementierungsaufträge. Der Runner arbeitet nur die Kinder-Issues ab.

## Abhängigkeiten

```text
0 Foundation
  → 1 Artifact Spine
    → 2 Web CLI ──┬→ 3 Dashboard ─→ 4 Compare & CI
                  └→ 8 Quality & Security (kann sobald Local API existiert)
    → 5 Adapter SDK (nach Spine; vor Godot/Tauri/.NET)
      → 6 Godot
      → 7 Tauri / .NET
```

## Slice-IDs aus dem PRD

Siehe PRD §19. Issues verweisen auf FR-IDs, SCN-IDs und Test-IDs, damit die Traceability nicht verloren geht.
