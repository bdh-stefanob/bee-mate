---
phase: 04-web-ui
plan: "04"
subsystem: web-ui
tags: [next.js, features, download, path-traversal, vitest, tdd, shadcn]
dependency_graph:
  requires:
    - web-ui/src/lib/repo.ts (safeFeaturePath, FEATURES_DIR) — plan 04-01
    - web-ui/src/lib/types.ts (FeatureSummary) — plan 04-01
  provides:
    - web-ui/src/lib/features.ts (walkFeatures, parseFeatureSummary, listFeatures)
    - web-ui/src/app/api/download/route.ts (GET /api/download con guard T-04-10)
    - web-ui/src/components/FeaturePreview.tsx
    - web-ui/src/app/features/page.tsx (Feature Catalog)
  affects:
    - web-ui/src/app/api/features/route.ts (refactored per usare listFeatures)
tech_stack:
  added: []
  patterns:
    - TDD RED→GREEN per lib/features.ts e /api/download
    - Guard centralizzato safeFeaturePath riusato (DRY, non reimplementato)
    - Client Component con useEffect fetch per lista e preview
    - encodeURIComponent su file param lato client (T-04-12)
key_files:
  created:
    - web-ui/src/lib/features.ts
    - web-ui/src/components/FeaturePreview.tsx
    - web-ui/__tests__/lib/features.test.ts
    - web-ui/__tests__/api/download.test.ts
  modified:
    - web-ui/src/app/api/features/route.ts (refactored — usa listFeatures)
    - web-ui/src/app/api/download/route.ts (stub 501 → implementazione reale)
    - web-ui/src/app/features/page.tsx (stub → pagina completa)
decisions:
  - "lib/features.ts estratto come modulo puro testabile: walkFeatures + parseFeatureSummary + listFeatures"
  - "safeFeaturePath di plan 01 riusato senza reimplementazione (DRY) per /api/download"
  - "features/page.tsx come Client Component: semplice, sufficiente per demo"
metrics:
  duration: "~4 min"
  completed_date: "2026-06-10"
  tasks_completed: 3
  files_created: 4
  files_modified: 3
---

# Phase 04 Plan 04: Feature Catalog Summary

**One-liner:** Feature Catalog con walkFeatures+parseFeatureSummary puri (TDD), /api/download con guard path-traversal (safeFeaturePath), pagina /features lista+preview+download; 28/28 test verdi, tsc 0 errori.

---

## Tasks Completed

| # | Task | Commit | Files chiave |
|---|------|--------|-------------|
| 1 | lib/features.ts + refactor /api/features (TDD) | `23eb5cc` | src/lib/features.ts, api/features/route.ts, __tests__/lib/features.test.ts |
| 2 | /api/download con guard safeFeaturePath (TDD) | `d890092` | api/download/route.ts, __tests__/api/download.test.ts |
| 3 | FeaturePreview.tsx + features/page.tsx | `5bc3455` | src/components/FeaturePreview.tsx, src/app/features/page.tsx |

---

## Verification Results

- `cd web-ui && npx vitest run` → 6 file di test, 28 test, tutti verdi
  - features.test.ts: 6 test (walkFeatures: solo .feature, subdirs, slash /, parseFeatureSummary: name/area/count)
  - download.test.ts: 4 test (200 su file valido, 403 traversal, 403 estensione, 404 inesistente)
  - repo.test.ts: 4 test (pre-esistenti — nessuna regressione)
  - catalog.test.ts: 1 test (pre-esistente)
  - autocomplete.test.ts: pre-esistenti
  - catalog.test.ts (lib): pre-esistenti
- `cd web-ui && npx tsc --noEmit` → exit 0

---

## Deviations from Plan

Nessuna — piano eseguito esattamente come scritto.

I path del piano frontmatter indicano `web-ui/lib/features.ts` (senza `src/`), ma la deviazione `src/` era già documentata nel plan 04-01 SUMMARY. Tutti i file sono stati creati nei path corretti con `src/`.

---

## Known Stubs

Nessuno — tutti gli stub di questo piano sono stati implementati:
- `/api/download`: stub 501 → implementazione reale
- `/features/page.tsx`: stub placeholder → pagina Feature Catalog completa

Stubs residui da piani precedenti (non di questo piano):
- `/api/import/route.ts` — già implementato in plan 04-03

---

## Threat Flags

Nessun nuovo surface di sicurezza oltre a quanto nel threat model del piano.

- T-04-10 mitigato: `safeFeaturePath` in `/api/download` — testato con test 403 su `../../package.json` e `auth/login.txt`
- T-04-12 mitigato: `encodeURIComponent` applicato in `FeaturePreview.tsx` prima di costruire la query string

---

## Self-Check: PASSED

File verificati:

- `web-ui/src/lib/features.ts` — FOUND
- `web-ui/src/components/FeaturePreview.tsx` — FOUND
- `web-ui/__tests__/lib/features.test.ts` — FOUND
- `web-ui/__tests__/api/download.test.ts` — FOUND
- `web-ui/src/app/api/download/route.ts` — implementato (safeFeaturePath presente)
- `web-ui/src/app/features/page.tsx` — implementato (fetch /api/features, FeaturePreview montato)

Commit verificati:
- `23eb5cc` — FOUND (lib/features.ts + refactor /api/features)
- `d890092` — FOUND (/api/download implementato)
- `5bc3455` — FOUND (FeaturePreview + features/page.tsx)
