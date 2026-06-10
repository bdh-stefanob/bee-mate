---
phase: "05"
plan: "03"
subsystem: web-ui
tags: [github, integration, api-route, editor, i18n, security]
dependency_graph:
  requires: [05-02]
  provides: [POST /api/github/push, editor-commit-github-button]
  affects:
    - web-ui/src/app/api/github/push/route.ts
    - web-ui/src/app/editor/page.tsx
    - web-ui/src/lib/i18n.ts
tech_stack:
  added: []
  patterns:
    - "GitHub REST API via fetch server-side (GET SHA + PUT base64 content)"
    - "Token in header x-github-token (mai nel body) — pattern sicurezza T-05-03-03"
    - "filePath whitelist regex ^[\\w./-]+$ + blocco path traversal — T-05-03-01"
    - "Token rimosso dal messaggio di errore con replace — T-05-03-02"
    - "Bottone condizionale React: visibile solo se settings.githubToken non vuoto"
key_files:
  created:
    - web-ui/src/app/api/github/push/route.ts
  modified:
    - web-ui/src/app/editor/page.tsx
    - web-ui/src/lib/i18n.ts
decisions:
  - "slugify importato da @/lib/repo invece di funzione inline: il modulo e' gia' importato nell'editor, DRY rispettato"
  - "Bottone GitHub avvolto in div flex accanto a Download: mantiene il layout header a due elementi senza rompere justify-between"
  - "Buffer.from(content, 'utf-8').toString('base64') invece di btoa(unescape(encodeURIComponent(...))): API Node.js piu' leggibile e corretta per Unicode su tutti i contenuti"
metrics:
  duration_minutes: 12
  completed_date: "2026-06-10"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 2
  files_created: 1
---

# Phase 05 Plan 03: GitHub Integration — POST /api/github/push + bottone editor

**One-liner:** API route POST /api/github/push con GET-SHA-then-PUT-base64 verso GitHub REST API, bottone "Commit su GitHub" condizionale nell'editor che legge i token da useSettings e li invia solo come header.

---

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | API route POST /api/github/push | 5ff8bdc | web-ui/src/app/api/github/push/route.ts (new) |
| 2 | Bottone "Commit su GitHub" nell'editor + i18n | 6eccad5 | web-ui/src/app/editor/page.tsx, web-ui/src/lib/i18n.ts |

---

## What Was Built

### API route POST /api/github/push

`web-ui/src/app/api/github/push/route.ts` — Route Next.js App Router che:

1. Legge `x-github-token`, `x-github-owner`, `x-github-repo`, `x-github-branch` dagli **header** della richiesta (mai dal body).
2. Valida `filePath` con whitelist regex `^[\w./-]+$` + blocco esplicito di `..` (path traversal).
3. Fa GET a `api.github.com/repos/{owner}/{repo}/contents/{path}?ref={branch}` per leggere il SHA se il file esiste gia'.
4. Codifica il contenuto in base64 con `Buffer.from(content, 'utf-8').toString('base64')` (supporto completo Unicode).
5. Fa PUT con `{ message, content, branch, sha? }` per creare o aggiornare il file.
6. Rimuove il token dal messaggio di errore prima di restituirlo al client (`message.replace(githubToken, '[TOKEN]')`).

### Bottone "Commit su GitHub" nell'editor

`web-ui/src/app/editor/page.tsx` aggiornato con:

- Import `useSettings` da `@/hooks/useSettings`.
- State `isCommitting: boolean` per disabilitare il bottone durante la richiesta.
- Handler `handleCommitGitHub`: deriva `filePath` dal nome Feature nel contenuto (slug), invia fetch a `/api/github/push` con token negli header, mostra toast.success/error.
- Bottone condizionale `{settings.githubToken && (...)}` accanto al bottone Download: visibile solo se il token e' configurato nelle settings.
- Bottone disabilitato durante commit (`isCommitting`) e se il contenuto e' vuoto (`!content.trim()`).

### i18n

`web-ui/src/lib/i18n.ts` aggiornato con 4 nuove chiavi in `editor` per EN e IT:
- `commitGitHub`, `commitGitHubLoading`, `commitGitHubSuccess`, `commitGitHubError`

---

## Decisions Made

1. **`slugify` da `@/lib/repo` invece di funzione inline**: L'editor importava gia' `slugify` da `@/lib/repo`. Riusare la funzione esistente e' piu' pulito del duplicare la logica inline come indicato nel piano.

2. **Bottone GitHub in `div flex` accanto a Download**: Avvolgere entrambi i bottoni in un `div.flex.items-center.gap-2` mantiene il layout `justify-between` dell'header senza modificare la struttura esistente.

3. **`Buffer.from(content, 'utf-8').toString('base64')`**: Piu' leggibile e corretto su Node.js rispetto al pattern `btoa(unescape(encodeURIComponent(...)))` che e' legacy browser-only.

---

## Deviations from Plan

### Auto-fix applicati

Nessuno — piano eseguito esattamente come scritto, con una sola micro-variante documentata (slugify import vs inline) che non cambia il comportamento.

---

## Verification Results

```
cd web-ui && npx tsc --noEmit       → exit 0 (nessun errore)
cd web-ui && npx vitest run         → 6 test file, 28 test, tutti passati

grep "x-github-token" route.ts      → header get (riga 29) + messaggio errore (riga 36)
grep "request.headers.get" route.ts → 4 occorrenze (token, owner, repo, branch)
grep "api.github.com" route.ts      → 1 occorrenza (apiBase)
grep "Buffer.from" route.ts         → 1 occorrenza (base64 encoding)
grep "\.\." route.ts                → 1 occorrenza (controllo path traversal)
grep "sha" route.ts                 → 4 occorrenze (var, existing.sha, check, putBody.sha)

grep "useSettings" editor/page.tsx  → 2 occorrenze (import + uso)
grep "x-github-token" editor/page.tsx → 1 occorrenza nell'header fetch
grep "commitGitHub" editor/page.tsx → 4 occorrenze (handler, success, error, bottone)
grep "settings.githubToken" editor → 3 occorrenze (guard, header, condizione visibilita')
grep "githubToken" editor/page.tsx  → solo header, mai nel body JSON
grep "commitGitHub:" i18n.ts        → 2 occorrenze (en + it)
```

---

## Known Stubs

Nessuno — il bottone e' collegato a settings reali (useSettings + localStorage) e alla route reale (/api/github/push). Il filePath e' derivato dal contenuto dell'editor. La route chiama direttamente api.github.com.

---

## Threat Flags

Nessuna nuova superficie rispetto al threat model del piano. Tutte le minacce STRIDE registrate sono mitigate:

| Threat ID | Mitigazione applicata |
|-----------|----------------------|
| T-05-03-01 | filePath whitelist `^[\w./-]+$` + blocco `..` — riga 59 route.ts |
| T-05-03-02 | `message.replace(githubToken, '[TOKEN]')` — riga 122 route.ts |
| T-05-03-03 | Token letto da `request.headers.get('x-github-token')` — mai dal body |
| T-05-03-04 | Accept (uso localhost, nessun redirect malevolo realistico) |
| T-05-03-05 | Accept (bottone disabled durante isCommitting) |

---

## Self-Check: PASSED

- [x] `web-ui/src/app/api/github/push/route.ts` — esiste, esporta `POST`
- [x] `request.headers.get('x-github-token')` — token letto dall'header
- [x] Whitelist regex `^[\w./-]+$` + blocco `..` — presente
- [x] `Buffer.from(content, 'utf-8').toString('base64')` — presente
- [x] GET SHA prima del PUT — presente
- [x] `message.replace(githubToken, '[TOKEN]')` — presente
- [x] `web-ui/src/app/editor/page.tsx` — importa useSettings, ha handleCommitGitHub
- [x] Bottone condizionale `{settings.githubToken && ...}` — presente
- [x] Token nell'header fetch, non nel body — verificato
- [x] `web-ui/src/lib/i18n.ts` — 4 nuove chiavi in EN e IT
- [x] Commit 5ff8bdc — esiste
- [x] Commit 6eccad5 — esiste
