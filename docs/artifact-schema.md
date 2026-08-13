# Artifact Schema — VisoDev Import

This document describes the stable import contract between Potato Boost and VisoDev.

## Version

Schema version: **1.0.0**

## What this is

A documented subset of the Potato Boost run artifact that VisoDev can import. IDs are identical to the run artifact (`runId`, `evidenceId`, `findingId`). No VisoDev code is required in Potato Boost.

## What this is not

- Not an upload mechanism
- Not a dependency on VisoDev internals
- Not a replacement for the full run artifact schema

## Import contract

VisoDev reads a JSON file that validates against `packages/schemas/visodev-export.schema.json`.

Required fields:

| Field | Source | Note |
|-------|--------|------|
| `schemaVersion` | run artifact | Must be `1.0.0` |
| `runId` | `run.runId` | Identical to run artifact |
| `findings` | `findings[]` | Each finding keeps `findingId`, `ruleId`, `severity`, `confidence` |
| `evidence` | `evidence[]` | Each evidence keeps `evidenceId`, `confidence` |

Optional fields:

| Field | Source | Note |
|-------|--------|------|
| `startedAt` | `run.startedAt` | RFC 3339 UTC |
| `metrics` | `metrics[]` | Name, value, unit |

## Roundtrip

A local roundtrip test validates the golden artifact against this schema. No network calls are made.

## Optional

VisoDev import is **optional**. Potato Boost works fully offline without VisoDev.
