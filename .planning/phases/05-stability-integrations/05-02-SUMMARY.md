---
phase: "05"
plan: "02"
subsystem: web-ui
tags: [settings, localStorage, useSettings, i18n, nav]
dependency_graph:
  requires: []
  provides: [useSettings, AppSettings, settings-page, nav-settings-link]
  affects:
    - web-ui/src/hooks/useSettings.ts
    - web-ui/src/app/settings/page.tsx
    - web-ui/src/components/NavSettingsLink.tsx
    - web-ui/src/app/layout.tsx
    - web-ui/src/lib/i18n.ts
tech_stack:
  added: []
  patterns:
    - useSettings hook con useState + useEffect per localStorage (SSR-safe)
    - autosave on blur con badge temporaneo (2s setTimeout)
    - RSC + Client Component split per nav i18n (NavSettingsLink)
key_files:
  created:
    - web-ui/src/hooks/useSettings.ts
    - web-ui/src/app/settings/page.tsx
    - web-ui/src/components/NavSettingsLink.tsx
  modified:
    - web-ui/src/app/layout.tsx
    - web-ui/src/lib/i18n.ts
decisions:
  - "NavSettingsLink come Client Component separato: layout.tsx e' RSC, useLanguage richiede context — unico pattern corretto per i18n nel nav senza errore build"
  - "STORAGE_KEY esportato (non solo const locale): permette ai futuri hook/API di leggere lo stesso valore senza magic string"
metrics:
  duration_minutes: 10
  completed_date: "2026-06-10"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 2
  files_created: 3
---

# Phase 05 Plan 02: Settings Page — useSettings hook, /settings page, nav link

**One-liner:** Hook useSettings con persistenza localStorage SSR-safe + pagina /settings con 6 campi autosave-on-blur e badge "Salvato", token nascosti con type="password", nav link i18n tramite NavSettingsLink Client Component.

---

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Hook useSettings + chiavi i18n settings.* | 316c82d | useSettings.ts (new), i18n.ts |
| 2 | Pagina /settings + voce nav | 9b60645 | settings/page.tsx (new), NavSettingsLink.tsx (new), layout.tsx |

---

## What Was Built

### Hook useSettings

`web-ui/src/hooks/useSettings.ts` — hook React con `AppSettings` interface (6 campi: githubToken, githubOwner, githubRepo, githubBranch, jiraBaseUrl, jiraToken). Persistenza in `localStorage` alla chiave `'bdd-scaffold-settings'`. SSR-safe con guard `typeof window !== 'undefined'`. JSON.parse in try/catch con fallback ai DEFAULTS. Nessun `console.log` dei valori. Default `githubBranch: 'main'`, tutti gli altri campi stringa vuota.

### Pagina /settings

`web-ui/src/app/settings/page.tsx` — Client Component. Sezione GitHub (4 campi) e sezione Jira (2 campi). I campi `githubToken` e `jiraToken` hanno `type="password"`. Autosave al blur tramite `handleBlur → update()`. Badge inline "Salvato" (verde emerald) visibile 2 secondi dopo ogni save. Zero `console.log`.

### NavSettingsLink

`web-ui/src/components/NavSettingsLink.tsx` — Client Component con icona `Settings` da lucide-react e testo i18n `t.settings.nav`. Stile coerente con gli altri link nav (teal-100/white). Importato e montato in layout.tsx immediatamente dopo il link Features.

### i18n

`web-ui/src/lib/i18n.ts` aggiornato con oggetto `settings` in entrambe le lingue (14 chiavi ciascuna): title, nav, github, githubToken, githubTokenHint, githubOwner, githubRepo, githubBranch, jira, jiraBaseUrl, jiraBaseUrlHint, jiraToken, jiraTokenHint, saved.

---

## Decisions Made

1. **NavSettingsLink come Client Component separato**: `layout.tsx` è un RSC (Next.js 15 App Router) — non può usare `useContext`/`useLanguage`. Estrarre un piccolo Client Component è il pattern RSC-corretto; un RSC può importare Client Components senza problemi.

2. **STORAGE_KEY esportato**: Esportare `STORAGE_KEY` (invece di lasciarlo privato) permette ai futuri hook di Wave 2 (GitHub/Jira API routes) di referenziare la stessa chiave senza duplicare la magic string.

---

## Deviations from Plan

Nessuna — piano eseguito esattamente come scritto. Il piano già anticipava il pattern NavSettingsLink come alternativa consigliata al link statico.

---

## Verification Results

```
cd web-ui && npx tsc --noEmit          → exit 0 (nessun errore)
cd web-ui && npx vitest run            → 6 test file, 28 test, tutti passati
grep STORAGE_KEY useSettings.ts        → 'bdd-scaffold-settings' (3 occorrenze)
grep githubBranch useSettings.ts       → default 'main'
grep typeof window useSettings.ts      → 2 occorrenze (guard SSR)
grep console.log useSettings/page.tsx  → 0 occorrenze
grep settings: i18n.ts                 → 2 occorrenze (en + it)
grep /settings NavSettingsLink.tsx     → href="/settings"
```

---

## Known Stubs

Nessuno — tutti i campi sono collegati al hook useSettings con persistenza reale in localStorage.

---

## Threat Flags

Nessuna nuova superficie di attacco oltre quanto già modellato nel threat model del piano:
- T-05-02-01 (localStorage non cifrato): accettato per uso localhost
- T-05-02-02 (JSON.parse): mitigato con try/catch + fallback DEFAULTS
- T-05-02-03 (token nel DOM): mitigato con type="password"
- T-05-02-04 (console.log token): mitigato — verificato 0 occorrenze

---

## Self-Check: PASSED

- [x] `web-ui/src/hooks/useSettings.ts` — esiste, esporta `useSettings` e `AppSettings`
- [x] `STORAGE_KEY = 'bdd-scaffold-settings'` — presente
- [x] `githubBranch: 'main'` nei DEFAULTS — presente
- [x] `typeof window` guard SSR — 2 occorrenze
- [x] Zero `console.log` in useSettings.ts e settings/page.tsx
- [x] `web-ui/src/app/settings/page.tsx` — esiste come Client Component
- [x] `web-ui/src/components/NavSettingsLink.tsx` — esiste
- [x] `web-ui/src/app/layout.tsx` — importa NavSettingsLink e lo monta nel nav
- [x] `web-ui/src/lib/i18n.ts` — settings.* in en e it (14 chiavi ciascuna)
- [x] Commit 316c82d — esiste
- [x] Commit 9b60645 — esiste
