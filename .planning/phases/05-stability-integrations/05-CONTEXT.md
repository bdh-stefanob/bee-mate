# Phase 05: stability-integrations — Context

**Gathered:** 2026-06-10
**Status:** Ready for planning
**Source:** User discussion — post-demo M1, integrations + stability

<domain>
## Phase Boundary

Estendere `web-ui/` con:
1. **Stability layer** — React Error Boundary globale, toast notifications per errori API, loading states coerenti su tutte le pagine
2. **Settings page** — `/settings` con storage sicuro di token (GitHub PAT, Jira token) in `localStorage` (mai nel codice/commit)
3. **GitHub integration** — bottone "Commit & Push" nell'editor che usa il token delle settings per creare/aggiornare il file `.feature` sul repo via GitHub REST API
4. **Jira sync** — API route che legge i `.feature` con `@ticket:BOOT-xxx` e posta lo scenario come commento sulla issue Jira via REST API
5. **UI responsive per desktop app** — audit e fix del layout per finestre 1280–1920px (uso da desktop, non mobile), sidebar stabile, nessun overflow/troncamento, colonne proporzionate

**Target utente:** QA team Boots — usano la web app da browser desktop (Windows laptop 1080p–1440p).
**Deploy target:** `localhost:3000` (npm run dev), non hosting pubblico.

**OUT OF SCOPE per questa fase:**
- Autenticazione OAuth (GitHub OAuth app, SSO aziendale)
- Mobile/tablet responsiveness (non è il caso d'uso)
- Collaborative features, real-time sync
- Packaging exe Windows
- Import Jira → .feature (solo push, non pull)

</domain>

<decisions>
## Implementation Decisions

### Stability — Error Boundary (LOCKED)
- Creare `web-ui/src/components/ErrorBoundary.tsx` — React class component (Error Boundaries devono essere class)
- Wrappare tutta l'app in `Providers.tsx` con `<ErrorBoundary fallback={<ErrorFallback />}>`
- `ErrorFallback`: messaggio "Qualcosa è andato storto" + pulsante "Ricarica pagina"
- Separato da `TooltipProvider` (che rimane dentro ErrorBoundary)

### Stability — Toast notifications (LOCKED)
- Libreria: `sonner` (già inclusa in shadcn/ui base-nova) — se non presente, installare con `npx shadcn@latest add sonner`
- Aggiungere `<Toaster />` in `Providers.tsx`
- Hook `useToast` / `toast()` per: errori fetch, errori import, successo commit GitHub, successo Jira sync
- Sostituire tutti i `console.error` / `.catch(() => {})` silenziosi con `toast.error(...)`

### Stability — Loading states (LOCKED)
- Pagina Catalog: skeleton loader durante fetch `/api/catalog` (usa `Skeleton` da shadcn se disponibile, altrimenti div animate-pulse)
- Pagina Features: stesso pattern
- StepBrowser: già ha il messaggio "Caricamento..." — migliorare con skeleton 3 righe
- ImportDropzone: spinner durante l'import (già parzialmente presente, completare)

### Settings page (LOCKED)
- Route: `web-ui/src/app/settings/page.tsx`
- Voce "Settings" nel nav (header) accanto a Language toggle
- Campi:
  - GitHub: `githubToken` (PAT), `githubOwner`, `githubRepo`, `githubBranch` (default: `main`)
  - Jira: `jiraBaseUrl`, `jiraToken` (Bearer token)
- Storage: `localStorage` via hook `useSettings()` in `web-ui/src/hooks/useSettings.ts`
- I token NON vengono mai loggati, mai inviati al server in chiaro nel body — solo come header `Authorization: Bearer ...` nelle API route
- UI: form con `Input` shadcn, salvataggio automatico al blur (no submit button), badge "Salvato" inline

### Settings — `useSettings` hook (LOCKED)
```typescript
// web-ui/src/hooks/useSettings.ts
export interface AppSettings {
  githubToken: string;
  githubOwner: string;
  githubRepo: string;
  githubBranch: string;
  jiraBaseUrl: string;
  jiraToken: string;
}
const STORAGE_KEY = 'bdd-scaffold-settings';
export function useSettings(): { settings: AppSettings; update: (patch: Partial<AppSettings>) => void }
// legge da localStorage, scrive al cambio, default stringhe vuote
```

### GitHub Integration (LOCKED)
- API route: `POST /api/github/push`
- Payload (client → server): `{ content: string, filePath: string }` + headers `x-github-token`, `x-github-owner`, `x-github-repo`, `x-github-branch`
- Server usa GitHub REST API: `PUT https://api.github.com/repos/{owner}/{repo}/contents/{path}`
- Se file esiste: include `sha` nel payload (read prima con GET, poi PUT con sha)
- Bottone nell'editor: "Commit su GitHub" → visibile solo se `githubToken` è configurato nelle settings
- Label bottone: `t.editor.commitGitHub` (aggiungere a i18n: EN "Commit to GitHub", IT "Commit su GitHub")
- Toast: successo "File committato su GitHub", errore "Commit fallito: {message}"

### Jira Sync (LOCKED)
- API route: `POST /api/jira/sync`
- Payload: `{}` + headers `x-jira-url`, `x-jira-token`
- Server logica:
  1. Legge tutti i `.feature` in `src/features/**/*.feature`
  2. Estrae scenari con tag `@ticket:BOOT-XXX` (o `@ticket:XXXX-NNN` — pattern `@ticket:[A-Z]+-\d+`)
  3. Per ogni scenario: `POST {jiraBaseUrl}/rest/api/3/issue/{key}/comment` con body `{ body: { type: "doc", content: [...] } }` (Jira Cloud API v3 ADF format)
  4. Ritorna `{ synced: N, skipped: M, errors: [] }`
- Pagina dedicata o sezione in Settings: bottone "Sincronizza con Jira" + feedback (N scenari sincronizzati)
- Visibile solo se `jiraBaseUrl` + `jiraToken` configurati

### UI Responsiveness — Desktop (LOCKED)
- Target: finestre 1280px–1920px larghezza, altezza 768px–1080px
- Fare un audit completo di tutte le pagine: editor, catalog, features, settings
- Editor (pagina principale): il layout 2/3+1/3 deve funzionare da 1280px in su senza overflow
- StepBrowser: la lista step non deve traboccare dal pannello laterale
- Nessuna scrollbar orizzontale su nessuna pagina a 1280px+
- Testo non troncato: verificare `truncate` vs `break-words` nei punti critici
- Max-width container: `max-w-screen-xl` (1280px) — verificare che sia applicato ovunque
- Nav header: non collassa a hamburger (non è mobile) — rimane orizzontale sempre
- GherkinEditor: CodeMirror deve avere `height: auto` con `min-height: 400px` (non `100vh` che causa overflow)

### Claude's Discretion
- Esatta formattazione del commento Jira (ADF vs markdown — usare ADF per Jira Cloud)
- Gestione `sha` per update file GitHub (ottimistico vs pessimistico)
- Skeleton loader specifico (libreria vs animate-pulse)
- Posizione del bottone "Commit su GitHub" nell'editor (accanto a Download o in toolbar)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning o implementing.**

### Codebase esistente (Phase 04)
- `web-ui/src/app/editor/page.tsx` — pagina editor (aggiungere bottone GitHub)
- `web-ui/src/components/StepBrowser.tsx` — già usa toast? No — aggiungere
- `web-ui/src/providers/Providers.tsx` — aggiungere ErrorBoundary + Toaster
- `web-ui/src/lib/i18n.ts` — aggiungere chiavi `editor.commitGitHub`, `settings.*`
- `web-ui/src/lib/types.ts` — tipi catalogo
- `web-ui/src/app/api/catalog/route.ts` — pattern API route esistente da replicare
- `web-ui/src/app/api/import/route.ts` — pattern sicurezza header/token da replicare

### Step catalog
- `step-catalog.json` — schema dati
- `step-enums.json` — enum valori parametrici (NON sovrascrivere con npm run catalog)

### Feature files
- `src/features/` — root per la lettura dei .feature in Jira sync

### Configurazione
- `web-ui/package.json` — dipendenze installate (verificare se sonner è già presente)
- `web-ui/next.config.ts` — configurazione Next.js

### ROADMAP sezione 5.8
- `ROADMAP.md` sezione 5.8 — spec Jira plain integration (tag convention, direzione push)

</canonical_refs>

<specifics>
## Specific Ideas

- **Jira ADF format** (per commento): usare formato minimo compatibile Jira Cloud v3:
  ```json
  {
    "body": {
      "type": "doc",
      "version": 1,
      "content": [{ "type": "codeBlock", "attrs": { "language": "gherkin" }, "content": [{ "type": "text", "text": "<scenario gherkin>" }] }]
    }
  }
  ```
- **GitHub PUT API**: endpoint `PUT /repos/{owner}/{repo}/contents/{path}` richiede `content` base64-encoded e `message` (commit message); se il file esiste serve `sha` (prendere da GET prima)
- **Settings icon**: icona `Settings` da lucide-react nel nav header
- **Responsive fix prioritari**: GherkinEditor overflow, StepBrowser maxHeight, tabelle catalog con horizontal scroll su container ristretto

</specifics>

<deferred>
## Deferred Ideas (M2+)

- GitHub OAuth app (autenticazione browser invece di PAT)
- Jira → .feature pull (coperto da skill anthropic-skills:regression-scenario)
- Jira webhook per aggiornamenti automatici
- Packaging exe Windows
- Dark mode per Settings page (già coperto dalla struttura generale)
- Rate limiting / throttling per le API GitHub/Jira (non necessario per uso locale)

</deferred>

---

*Phase: 05-stability-integrations*
*Context gathered: 2026-06-10 — post-demo M1, stability + GitHub + Jira + desktop responsive*
