---
phase: "05"
plan: "01"
subsystem: web-ui
tags: [stability, error-boundary, toast, skeleton, sonner]
dependency_graph:
  requires: []
  provides: [ErrorBoundary, Toaster, skeleton-loaders]
  affects: [web-ui/src/providers/Providers.tsx, web-ui/src/components/StepBrowser.tsx, web-ui/src/components/StepCatalog.tsx, web-ui/src/app/features/page.tsx]
tech_stack:
  added: [sonner@2.0.7 (Toaster + toast già in package.json)]
  patterns: [React class ErrorBoundary, animate-pulse skeleton, toast.error su catch]
key_files:
  created:
    - web-ui/src/components/ErrorBoundary.tsx
  modified:
    - web-ui/src/providers/Providers.tsx
    - web-ui/src/lib/i18n.ts
    - web-ui/src/app/editor/page.tsx
    - web-ui/src/components/StepBrowser.tsx
    - web-ui/src/components/ImportDropzone.tsx
    - web-ui/src/components/StepCatalog.tsx
    - web-ui/src/app/features/page.tsx
decisions:
  - "ErrorBoundary come class component: obbligatorio — getDerivedStateFromError non funziona con function component"
  - "Skeleton con animate-pulse inline invece di shadcn Skeleton: skeleton.tsx non presente in ui/, evitato shadcn add per non introdurre dipendenze non pianificate"
  - "StepCatalog.tsx modificato invece di page.tsx: il loading state del Catalog risiede nel componente figlio, non nella page shell"
  - "ImportDropzone mantiene il feedback visivo inline + aggiunge toast.error: doppio canale intenzionale (toast per notifica immediata, UI inline per riferimento persistente)"
metrics:
  duration_minutes: 8
  completed_date: "2026-06-10"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 7
  files_created: 1
---

# Phase 05 Plan 01: Stability Layer — ErrorBoundary, Toast, Skeleton

**One-liner:** ErrorBoundary React class + Toaster sonner montati in Providers, toast.error su tutti i catch silenziosi, skeleton animate-pulse su StepBrowser/StepCatalog/Features.

---

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | ErrorBoundary + Toaster in Providers | aaa6c95 | ErrorBoundary.tsx (new), Providers.tsx, i18n.ts, editor/page.tsx, StepBrowser.tsx, ImportDropzone.tsx |
| 2 | Skeleton loaders su Catalog, Features e StepBrowser | 3cc0135 | StepBrowser.tsx, StepCatalog.tsx, features/page.tsx |

---

## What Was Built

### ErrorBoundary globale

`web-ui/src/components/ErrorBoundary.tsx` — React class component con `getDerivedStateFromError`. Esporta `ErrorBoundary` (wrapper) e `ErrorFallback` (UI bilingue italiano/inglese con bottone "Ricarica pagina"). Montato in `Providers.tsx` come wrapper esterno dell'intera app.

### Toaster sonner

`Toaster richColors closeButton position="bottom-right"` montato dentro `TooltipProvider` in `Providers.tsx`. Disponibile globalmente senza context aggiuntivo.

### Toast su catch silenziosi

Tre file aggiornati:
- `editor/page.tsx`: fetch `/api/catalog` → `toast.error('Catalog non disponibile: ...')`
- `StepBrowser.tsx`: fetch `/api/catalog` → `toast.error('Step catalog non disponibile: ...')`
- `ImportDropzone.tsx`: errori import (HTTP + network) → `toast.error('Importazione fallita: ...')` + mantiene UI inline

### Skeleton loaders

- `StepBrowser.tsx`: stato `isLoading` separato + `SkeletonRow` component locale (3 righe animate-pulse)
- `StepCatalog.tsx`: 5 righe skeleton al posto del testo "Loading step catalog…"
- `features/page.tsx`: 4 card skeleton al posto del testo "Caricamento…"

---

## Decisions Made

1. **ErrorBoundary come class component**: React richiede class component per `getDerivedStateFromError` — non esiste alternativa con function component senza librerie esterne.

2. **Skeleton con `animate-pulse` inline**: `web-ui/src/components/ui/skeleton.tsx` non era presente. Anziché eseguire `shadcn add skeleton` (non pianificato), usato pattern Tailwind `animate-pulse bg-muted` direttamente — stessa UX, zero dipendenze aggiuntive.

3. **`StepCatalog.tsx` modificato invece di `page.tsx`**: La Catalog page (`app/page.tsx`) è una shell statica che monta `<StepCatalog />`. Il loading state risiede in `StepCatalog.tsx` — la modifica corretta era lì.

4. **`ImportDropzone` mantiene doppio feedback**: Il componente aveva già UI inline per gli errori (usabile). Il `toast.error` è stato aggiunto in parallelo come notifica immediata, mantenendo entrambi i canali.

---

## Deviations from Plan

### Auto-fix applicati

**1. [Rule 2 - Missing] StepCatalog.tsx aggiunto agli skeleton**
- **Trovato durante:** Task 2 — la Catalog page non gestisce `loading` direttamente
- **Issue:** Il piano indicava `app/page.tsx` per gli skeleton del Catalog, ma il loading state è in `StepCatalog.tsx`
- **Fix:** Modificato `StepCatalog.tsx` invece di `app/page.tsx` — skeleton applicato al punto corretto
- **Files modified:** `web-ui/src/components/StepCatalog.tsx`
- **Commit:** 3cc0135

---

## Verification Results

```
cd web-ui && npx tsc --noEmit    → exit 0 (nessun errore)
cd web-ui && npx vitest run      → 6 test file, 28 test, tutti passati
grep "catch(() => {})" web-ui/src/ → 0 risultati
grep "ErrorBoundary" Providers.tsx  → 3 occorrenze (import + 2 JSX)
grep "Toaster" Providers.tsx        → 2 occorrenze (import + JSX)
grep "from 'sonner'" web-ui/src/    → 4 file
```

---

## Known Stubs

Nessuno — tutti i componenti sono collegati a dati reali.

---

## Threat Flags

Nessuna nuova superficie di attacco introdotta. I messaggi di errore nei toast mostrano HTTP status code e messaggi di rete già pubblici, mai stack trace o dettagli server interni (conforme a T-05-01-01 del threat model).

---

## Self-Check: PASSED

- [x] `web-ui/src/components/ErrorBoundary.tsx` — esiste
- [x] `web-ui/src/providers/Providers.tsx` — contiene ErrorBoundary e Toaster
- [x] `web-ui/src/components/StepBrowser.tsx` — contiene isLoading e animate-pulse
- [x] `web-ui/src/components/StepCatalog.tsx` — contiene animate-pulse
- [x] `web-ui/src/app/features/page.tsx` — contiene animate-pulse
- [x] Commit aaa6c95 — esiste
- [x] Commit 3cc0135 — esiste
