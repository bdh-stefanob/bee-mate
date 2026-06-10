---
phase: "05"
plan: "04"
subsystem: web-ui
tags: [jira, integration, api-route, settings, adf, i18n, security]
dependency_graph:
  requires: [05-02]
  provides: [POST /api/jira/sync, settings-jira-sync-button]
  affects:
    - web-ui/src/app/api/jira/sync/route.ts
    - web-ui/src/app/settings/page.tsx
    - web-ui/src/lib/i18n.ts
tech_stack:
  added: []
  patterns:
    - "Jira Cloud REST API v3 via fetch server-side — POST /rest/api/3/issue/{key}/comment"
    - "ADF (Atlassian Document Format) minimo: doc > codeBlock language=gherkin"
    - "Token in header x-jira-token (mai nel body) — pattern sicurezza T-05-04-01"
    - "walkFeatureFiles ricorsivo su FEATURES_DIR (da @/lib/repo)"
    - "extractScenariosWithTicket: regex /@ticket:([A-Z]+-\\d+)/ per blocchi scenario"
    - "Bottone condizionale React: visibile solo se settings.jiraBaseUrl && settings.jiraToken"
    - "i18n parametrico con .replace('{synced}', ...) compatibile con as const"
key_files:
  created:
    - web-ui/src/app/api/jira/sync/route.ts
  modified:
    - web-ui/src/app/settings/page.tsx
    - web-ui/src/lib/i18n.ts
decisions:
  - "i18n con segnaposto stringa {synced}/{errors} invece di lambda: as const TypeScript non accetta funzioni come valori — sostituzione manuale nel componente con .replace()"
  - "toast.success mostra il testo jiraSyncResult interpolato; toast.error stringa diretta per gli errori — doppio canale con feedback UI syncResult persistente"
  - "skipped conta file senza @ticket (non errori): permette al frontend di distinguere file saltati da errori di rete/auth Jira"
metrics:
  duration_minutes: 15
  completed_date: "2026-06-10"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 2
  files_created: 1
---

# Phase 05 Plan 04: Jira Integration — POST /api/jira/sync + bottone Settings

**One-liner:** API route POST /api/jira/sync con walkFeatureFiles ricorsivo + ADF codeBlock gherkin verso Jira Cloud REST v3, bottone "Sincronizza" condizionale in Settings che invia token solo come header.

---

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | API route POST /api/jira/sync | d44ba4d | web-ui/src/app/api/jira/sync/route.ts (new) |
| 2 | Sezione Jira Sync in Settings + i18n | 1c76b49 | web-ui/src/app/settings/page.tsx, web-ui/src/lib/i18n.ts |

---

## What Was Built

### API route POST /api/jira/sync

`web-ui/src/app/api/jira/sync/route.ts` — Route Next.js App Router che:

1. Legge `x-jira-url` e `x-jira-token` dagli **header** della richiesta (mai dal body). Restituisce 400 se mancanti.
2. Normalizza l'URL base rimuovendo il trailing slash (`jiraUrl.replace(/\/$/, '')`).
3. Chiama `walkFeatureFiles(FEATURES_DIR)` per raccogliere tutti i `.feature` in modo ricorsivo — `FEATURES_DIR` importato da `@/lib/repo`.
4. Per ogni file chiama `extractScenariosWithTicket()` che scansiona linea per linea cercando `@ticket:([A-Z]+-\d+)` e raccoglie il blocco scenario fino al prossimo `@ticket:` o `Feature:`.
5. Per ogni `(ticketKey, scenarioText)` posta un commento ADF a `{baseUrl}/rest/api/3/issue/{ticketKey}/comment` con `Authorization: Bearer {jiraToken}`.
6. Il corpo ADF usa il formato minimo: `doc > codeBlock[language=gherkin] > text`.
7. Errori per singola issue (rete o HTTP non-200) non bloccano le altre — raccolti in `errors[]`.
8. Risponde con `{ synced: number, skipped: number, errors: string[] }`.

### Sezione Jira Sync in Settings

`web-ui/src/app/settings/page.tsx` aggiornato con:

- Import `toast` da `sonner`.
- State `isSyncing: boolean` e `syncResult: { synced, errors } | null`.
- Handler `handleJiraSync`: guard su `settings.jiraBaseUrl && settings.jiraToken`, fetch POST con token negli **header** `x-jira-url` / `x-jira-token`, body `{}`.
- Sezione JSX "Jira Sync" con bottone condizionale: visibile solo se entrambi i campi Jira sono configurati; mostra messaggio `jiraSyncNotConfigured` altrimenti.
- Bottone disabilitato durante `isSyncing` (stato loading).
- Feedback risultato: contatore scenari + lista errori (font-mono destructive).
- Toast success con testo interpolato da `jiraSyncResult`; toast error su errori HTTP o di rete.

### i18n

`web-ui/src/lib/i18n.ts` aggiornato con 5 nuove chiavi in `settings` per EN e IT:
- `jiraSyncTitle`, `jiraSyncButton`, `jiraSyncLoading`, `jiraSyncResult`, `jiraSyncNotConfigured`

---

## Decisions Made

1. **i18n parametrico con `.replace()`**: La struttura `as const` di i18n.ts non accetta funzioni come valori. Per `jiraSyncResult` con segnaposto `{synced}` e `{errors}` si usa sostituzione manuale nel componente — pattern identico a quello già adottato in 05-03 per i messaggi GitHub.

2. **toast.success mostra `jiraSyncResult` interpolato**: Quando la sync ha 0 errori il toast mostra il conteggio preciso (es. "3 scenarios synced, 0 errors"). Per gli errori si usa una stringa diretta italiana — il toast è notifica rapida, la lista errori dettagliata è nel `syncResult` persistente sotto il bottone.

3. **`skipped` per file senza `@ticket`**: Un file `.feature` senza tag `@ticket` non è un errore — è saltato intenzionalmente. Questa distinzione permette al frontend (se necessario in futuro) di mostrare il breakdown completo: file sincronizzati / saltati / errori.

---

## Deviations from Plan

Nessuna — piano eseguito esattamente come scritto. Il pattern `.replace('{synced}', ...)` era già indicato nel piano come soluzione obbligatoria per la compatibilità con `as const`.

---

## Verification Results

```
cd web-ui && npx tsc --noEmit       → exit 0 (nessun errore)
cd web-ui && npx vitest run         → 6 test file, 28 test, tutti passati

grep "x-jira-token" route.ts        → riga 75 (header get) + riga 79 (messaggio errore)
grep "FEATURES_DIR" route.ts        → riga 4 (import) + riga 88 (uso)
grep "rest/api/3/issue" route.ts    → riga 112 (commentUrl)
grep "codeBlock" route.ts           → riga 63 (ADF format)
grep "language.*gherkin" route.ts   → riga 64 (attrs)
grep "synced" route.ts              → riga 90 (init), 129 (increment), 138 (return)

grep "x-jira-token" settings/page.tsx → riga 32 (header fetch)
grep "jiraToken" settings/page.tsx    → 5 occorrenze (guard, header, useCallback deps, 2 field)
grep "handleJiraSync" settings/page.tsx → righe 22 (def), 116 (bottone)
grep "jiraSyncTitle" i18n.ts          → righe 69 (en) + 143 (it)
grep "body.*JSON.stringify" page.tsx  → riga 34: JSON.stringify({}) senza token
```

---

## Known Stubs

Nessuno — la route chiama direttamente Jira Cloud REST API v3. Il bottone legge settings reali da `useSettings` (localStorage). Il token viaggia solo nell'header. Nessun mock o placeholder.

---

## Threat Flags

Nessuna nuova superficie rispetto al threat model del piano. Tutte le minacce STRIDE registrate sono mitigate o accettate:

| Threat ID | Disposizione | Mitigazione applicata |
|-----------|-------------|-----------------------|
| T-05-04-01 | mitigate | `request.headers.get('x-jira-token')` — non esposto in log, non nel body |
| T-05-04-02 | accept | jiraBaseUrl non validato contro allowlist (uso localhost/dev accettabile) |
| T-05-04-03 | mitigate | Errori mostrano solo ticketKey + messaggio Jira — mai il token |
| T-05-04-04 | accept | Route posta solo commenti, non modifica la issue principale |
| T-05-04-05 | accept | `walkFeatureFiles` filtra solo `.feature` da FEATURES_DIR fisso — nessun path da input utente |

---

## Self-Check: PASSED

- [x] `web-ui/src/app/api/jira/sync/route.ts` — esiste, esporta `POST`
- [x] `request.headers.get('x-jira-token')` — token letto dall'header
- [x] `FEATURES_DIR` importato da `@/lib/repo` e usato in `walkFeatureFiles`
- [x] `buildAdfComment` — codeBlock con `language: 'gherkin'`
- [x] `return NextResponse.json({ synced, skipped, errors })` — risposta corretta
- [x] `web-ui/src/app/settings/page.tsx` — importa toast, ha handleJiraSync, sezione Jira Sync
- [x] Bottone condizionale `settings.jiraBaseUrl && settings.jiraToken` — presente
- [x] Token nell'header fetch, body è `JSON.stringify({})` — verificato
- [x] `web-ui/src/lib/i18n.ts` — 5 nuove chiavi jiraSync* in EN e IT
- [x] Commit d44ba4d — esiste
- [x] Commit 1c76b49 — esiste
