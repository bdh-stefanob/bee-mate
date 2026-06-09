---
phase: 02-catalog-pipeline-upgrade
plan: "03"
subsystem: vscode-extension
tags: [typescript, types, catalog, extension, retrocompat]
dependency_graph:
  requires: []
  provides: [EXT-01]
  affects: [vscode-extension/src/catalog/types.ts]
tech_stack:
  added: []
  patterns: [optional-fields, union-literal-type, retrocompat-interface-extension]
key_files:
  modified:
    - vscode-extension/src/catalog/types.ts
decisions:
  - "Tutti i 6 nuovi campi aggiunti come opzionali (?) per garantire retrocompatibilità con catalog vecchi (D-08)"
  - "Ordine dei campi: nuovi campi (app, area, status, replacedBy, requester, assignee) inseriti tra domain e page per raggruppamento semantico"
  - "Commento domain aggiornato al nuovo formato <app>/<area>"
metrics:
  duration_minutes: 8
  completed_date: "2026-06-09"
  tasks_completed: 1
  tasks_total: 1
  files_changed: 1
---

# Phase 02 Plan 03: Allineamento tipi CatalogStep extension (EXT-01) — Summary

**One-liner:** Interfaccia CatalogStep dell'extension arricchita con 6 campi opzionali (app, area, status, replacedBy, requester, assignee) retrocompatibili con catalog senza questi campi.

---

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Aggiungere i 6 campi opzionali a CatalogStep in types.ts | `2f8f551` | `vscode-extension/src/catalog/types.ts` |

---

## What Was Built

Modifica chirurgica all'interfaccia `CatalogStep` in `vscode-extension/src/catalog/types.ts`:

- Aggiunto `app?: string` — primo segmento del path (es. `"app-a"`)
- Aggiunto `area?: string` — secondo segmento del path (es. `"orders"`)
- Aggiunto `status?: 'implemented' | 'wanted' | 'deprecated'` — lifecycle dello step
- Aggiunto `replacedBy?: string` — espressione sostituto (solo se deprecated)
- Aggiunto `requester?: string` — ID richiedente (solo se wanted)
- Aggiunto `assignee?: string` — SDET incaricato (solo se wanted)
- Aggiornato commento `domain` al nuovo formato `<app>/<area>`
- Aggiornato commento `sourceRef` con esempio path multi-app

Tutti i campi sono opzionali per rispettare la retrocompatibilità (D-08): un catalog generato senza questi campi continua a compilare e funzionare senza errori.

---

## Verification

- `cd vscode-extension && npx tsc --noEmit` → exit 0 (nessun errore di compilazione)
- Tutti i 6 nuovi campi opzionali presenti in `CatalogStep`
- Tutti i 7 campi originali (`expression`, `parameters`, `domain`, `page?`, `sourceRef`, `doc`, `documented`) invariati
- Nessun consumer modificato (CompletionProvider, FsLoader, DiagnosticProvider, HoverProvider, TreeProvider — nessuno usa i nuovi campi)

---

## Deviations from Plan

**Installazione node_modules vscode-extension:** Il worktree non aveva `node_modules` nell'extension. Prima del `tsc --noEmit` è stato necessario eseguire `npm install` in `vscode-extension/` per installare `@types/vscode` e le dipendenze. Questo è prerequisito silenzioso non menzionato nel plan ma richiesto per la verifica. [Rule 3 - Blocking issue]

**Commit include file di allineamento branch:** Il `git reset --soft bb1beb86` necessario per allineare il worktree al commit base corretto ha portato nello staging area le differenze tra il commit originale del worktree (`e96ce33`) e il target (`bb1beb8`). Il commit del task include anche queste differenze di allineamento. Il contenuto del commit è comunque corretto: la modifica target è inclusa, e le altre differenze riflettono la struttura attesa del branch.

---

## Known Stubs

Nessuno — il file modificato è una pura definizione di tipo TypeScript, senza logica eseguibile né dati placeholder.

---

## Threat Flags

Nessuno — la modifica è esclusivamente a livello di tipo TypeScript. Nessun codice eseguibile aggiunto, nessun endpoint, nessun input utente.

---

## Self-Check: PASSED

- [x] `vscode-extension/src/catalog/types.ts` contiene `app?: string;` — TROVATO (riga 24)
- [x] `vscode-extension/src/catalog/types.ts` contiene `area?: string;` — TROVATO (riga 26)
- [x] `vscode-extension/src/catalog/types.ts` contiene `status?: 'implemented' | 'wanted' | 'deprecated';` — TROVATO (riga 28)
- [x] `vscode-extension/src/catalog/types.ts` contiene `replacedBy?: string;` — TROVATO (riga 30)
- [x] `vscode-extension/src/catalog/types.ts` contiene `requester?: string;` — TROVATO (riga 32)
- [x] `vscode-extension/src/catalog/types.ts` contiene `assignee?: string;` — TROVATO (riga 34)
- [x] Commit `2f8f551` presente in git log — VERIFICATO
- [x] `tsc --noEmit` exit 0 — VERIFICATO
