# Phase 04: web-ui — Context

**Gathered:** 2026-06-10
**Status:** Ready for planning
**Source:** User discussion — manager demo 13/06/2026

<domain>
## Phase Boundary

Costruire `web-ui/` — una Next.js App Router web application che permette al team QA di
Boots di:
1. Esplorare il step catalog (cercabile, filtrato, con badge status)
2. Comporre scenari Gherkin in un editor con autocomplete step
3. Importare file .txt esistenti nell'editor
4. Vedere il catalog dei .feature file del repo
5. Scaricare i .feature file generati

Deploy target per demo: `localhost:3000` (npm run dev dalla root di web-ui).
Post-demo: packaging come exe Windows con pkg (M2).

**OUT OF SCOPE per questa fase:**
- Export Jira (M2)
- Backend collaborativo / condivisione real-time (M2)
- Drag-and-drop step nell'editor (M2)
- Autenticazione (M2)

</domain>

<decisions>
## Implementation Decisions

### Stack (LOCKED)
- Framework: Next.js 14+ con App Router (TypeScript)
- Stile: Shadcn/ui + Tailwind CSS
- Collocazione: subdirectory `/web-ui/` nel repo esistente, `package.json` separato
- Node version: stessa del repo principale (v24.x)

### Struttura cartelle (LOCKED)
```
web-ui/
  app/
    page.tsx              ← home: catalog step + ricerca
    editor/page.tsx       ← authoring: editor Gherkin + autocomplete
    features/page.tsx     ← catalogo .feature file del repo
  components/
    StepCatalog.tsx       ← tabella step con filtri
    GherkinEditor.tsx     ← textarea con autocomplete
    FeaturePreview.tsx    ← anteprima .feature formattata
    ImportDropzone.tsx    ← drag-drop file .txt
  lib/
    catalog.ts            ← legge step-catalog.json dal filesystem
    features.ts           ← legge src/features/**/*.feature dal filesystem
    importer.ts           ← chiama scripts/import-scenarios.ts via child_process
  app/api/
    catalog/route.ts      ← GET /api/catalog → step-catalog.json
    features/route.ts     ← GET /api/features → lista .feature files
    import/route.ts       ← POST /api/import → esegue import-scenarios.ts
    download/route.ts     ← GET /api/download?file=... → .feature content
```

### Pagina Catalog (LOCKED)
- Tabella step: colonne expression, area, status, app
- Filtri: testo libero (expression match), dropdown area, dropdown status
- Badge status: `wanted` = badge arancio, `implemented` = badge verde, `deprecated` = badge grigio
- Doppio click su riga step → apre editor con step inserito
- Nessuna paginazione per la demo (max ~50 step)

### Editor Gherkin (LOCKED)
- Textarea controllata con font monospace
- Autocomplete: al typing di `Given |When |Then |And ` mostra dropdown step dal catalog (match prefix sull'expression)
- Doppio click step dal catalog → appende step nell'editor nella posizione corrente
- Pulsante "Preview .feature" → mostra FeaturePreview in pannello laterale
- Pulsante "Download .feature" → scarica file via /api/download
- Import .txt: drag-drop o file picker → chiama /api/import → carica output nell'editor

### Catalogo Feature files (LOCKED)
- Legge tutti i `src/features/**/*.feature` dal filesystem via /api/features
- Mostra lista con: nome file, area (tag @), numero scenari
- Click → apre contenuto in FeaturePreview
- NO salvataggio centralizzato: i file .feature sono già nel repo, il "salvataggio" è lo script import-scenarios.ts che li scrive su disco

### API Routes (LOCKED)
- Tutte le API leggono da filesystem relativo alla root del repo (path: `../` rispetto a `web-ui/`)
- /api/import chiama `npx ts-node ../scripts/import-scenarios.ts` via execSync
- Sicurezza: validazione path (no path traversal) su tutti i file serviti da /api/download

### Claude's Discretion
- Scelta libreria autocomplete (react-cmdk, cmdk, custom dropdown)
- Layout esatto delle pagine (sidebar vs top nav)
- Gestione errori UI (toast vs inline message)
- Icone (lucide-react incluso con shadcn/ui)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning o implementing.**

### Step catalog (struttura dati fonte)
- `step-catalog.json` — schema: `{ steps: [{ expression, status, app, area, domain }] }`
- `scripts/extract-steps.ts` — pattern TypeScript usato in tutto il progetto

### Script da integrare
- `scripts/import-scenarios.ts` — CLI da invocare via /api/import

### Feature files esistenti
- `src/features/` — directory root dei .feature del repo
- `src/features/auth/login.feature` — esempio formato atteso

### Architettura progetto
- `CLAUDE.md` — regole 4 layer (non applicabili alla web-ui, ma importante non generare step/selettori)
- `CONTRIBUTING.md` — context architettura generale

### Dipendenze esistenti
- `package.json` (root) — Node version, TypeScript config di riferimento
- `tsconfig.json` (root) — base per il tsconfig della web-ui

</canonical_refs>

<specifics>
## Specific Ideas

- Per l'autocomplete, mostrare max 8 suggerimenti filtrati per prefix sull'intera expression
- Badge colori Boots-friendly: arancio `#FF6B2C`, verde `#2ECC71`, grigio `#9CA3AF`
- Il pannello editor deve essere usabile su schermo 1080p (minimo laptop QA standard)
- Il .feature download deve usare come nome file il Feature name slugificato (stesso algoritmo di import-scenarios.ts)
- L'import dalla UI deve mostrare il riepilogo (N step nuovi, M skippati) come nel CLI

</specifics>

<deferred>
## Deferred Ideas (M2)

- Export Jira: POST scenario → commento su ticket via token API
- Drag-and-drop step nell'editor (ordine libero)
- Collaborative catalog: backend con persistenza, "chi sta lavorando allo stesso file"
- Autenticazione utente
- Packaging come exe Windows (pkg/Electron)
- Favoriti, pattern step ricorrenti, template flow

</deferred>

---

*Phase: 04-web-ui*
*Context gathered: 2026-06-10 — manager demo scope*
