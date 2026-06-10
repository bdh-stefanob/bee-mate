# Phase 04: web-ui — Research

**Researched:** 2026-06-10
**Domain:** Next.js 15 App Router + Shadcn/ui + Tailwind CSS — Gherkin authoring tool
**Confidence:** HIGH (stack verified via npm registry and official docs)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Framework: Next.js 14+ con App Router (TypeScript) — pinned a Next.js 15 in questo research
- Stile: Shadcn/ui + Tailwind CSS
- Collocazione: subdirectory `/web-ui/` nel repo esistente, `package.json` separato
- Node version: stessa del repo principale (v24.x)
- Struttura cartelle: app/, components/, lib/, app/api/ come da CONTEXT.md
- Pagina Catalog: tabella step, filtri, badge status, doppio click → editor
- Editor Gherkin: textarea controllata monospace, autocomplete prefix su keyword Gherkin
- Catalogo Feature files: legge src/features/**/*.feature dal filesystem
- API Routes: tutte leggono da filesystem relativo alla root repo (path `../`), /api/import chiama `npx ts-node ../scripts/import-scenarios.ts`, validazione path traversal su /api/download

### Claude's Discretion
- Scelta libreria autocomplete (react-cmdk, cmdk, custom dropdown)
- Layout esatto delle pagine (sidebar vs top nav)
- Gestione errori UI (toast vs inline message)
- Icone (lucide-react incluso con shadcn/ui)

### Deferred Ideas (OUT OF SCOPE)
- Export Jira
- Backend collaborativo / condivisione real-time
- Drag-and-drop step nell'editor
- Autenticazione utente
- Packaging come exe Windows (pkg/Electron)
- Favoriti, pattern step ricorrenti, template flow
</user_constraints>

---

## Summary

La web-ui è una Next.js 15 App Router application in subdirectory `/web-ui/` del repo esistente, con `package.json` separato e nessuna workspace monorepo formale. Il pattern di lettura di file fuori dall'app directory (`process.cwd()` + `path.join('../', ...)`) funziona in dev perché `process.cwd()` punta alla root della subdirectory `web-ui/` — quindi `path.join(process.cwd(), '..', 'step-catalog.json')` risolve correttamente alla repo root. Questo è confermato dall'official Next.js guidance.

Il punto più critico per la demo è la chiamata `/api/import` che esegue `npx ts-node` via `execSync`. Su Windows questa chiamata **fallisce con ENOENT** se non si aggiunge `{ shell: true }` alle opzioni di `execSync`, perché `npx` è un `.cmd` batch file, non un binario ELF. Il `cwd` deve essere impostato alla repo root (un livello sopra `web-ui/`). L'import-scenarios.ts usa `process.cwd()` come base per i path, quindi il `cwd` dell'`execSync` è determinante.

Per l'autocomplete Gherkin, la raccomandazione è un dropdown custom leggero (niente libreria esterna): intercetta `onChange` della textarea, detecta il prefisso `Given |When |Then |And ` sull'ultima riga, filtra per prefix, mostra max 8 suggerimenti in un `<ul>` posizionato con `position: absolute`. Tab/Enter confermano il suggerimento scelto, Escape chiude. Questa soluzione è più semplice e affidabile di cmdk (pensato per command palette, non textarea inline) e non aggiunge dipendenze al bundle.

**Primary recommendation:** Creare web-ui con `npx create-next-app@latest web-ui --yes` dalla repo root, poi aggiungere i componenti shadcn necessari uno per uno. Il problema più alto rischio è il `execSync` su Windows — usare sempre `{ shell: true, cwd: repoRoot }`.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | 15.5.19 | Framework App Router | Versione stabile più recente del branch 15.x |
| react | 19.2.7 | UI runtime | Peer dependency di Next.js 15 |
| react-dom | 19.2.7 | DOM rendering | Peer dependency di Next.js 15 |
| typescript | 5.9.x (via create-next-app) | Type safety | Stessa base del repo principale |
| tailwindcss | 4.3.0 | Utility CSS | Incluso automaticamente da create-next-app --yes |

### Supporting (shadcn/ui components da installare)
| Component | Install Command | Purpose |
|-----------|-----------------|---------|
| button | `npx shadcn@latest add button` | CTA e azioni |
| badge | `npx shadcn@latest add badge` | Status wanted/implemented/deprecated |
| input | `npx shadcn@latest add input` | Search box nel catalog |
| select | `npx shadcn@latest add select` | Filtri area/status |
| table | `npx shadcn@latest add table` | Tabella step catalog |
| card | `npx shadcn@latest add card` | Pannello anteprima feature |
| separator | `npx shadcn@latest add separator` | Divisori layout |
| toast | `npx shadcn@latest add toast` | Feedback import (N step nuovi) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom dropdown autocomplete | cmdk library | cmdk è pensato per command palette a schermo intero, non per inline dropdown in textarea; aggiunge dipendenza non necessaria |
| Custom dropdown autocomplete | react-textarea-autocomplete | Attivo ma raramente aggiornato; introduce complessità SSR con Next.js |
| execSync | spawn (async) | spawn non blocca il thread ma complica la gestione della risposta HTTP sincrona; per la demo execSync va bene |

**Installation (dalla repo root):**
```bash
npx create-next-app@latest web-ui --yes
cd web-ui
npx shadcn@latest init
npx shadcn@latest add button badge input select table card separator toast
```

**Version verification:** [VERIFIED: npm registry]
- `next`: 15.5.19 (ultimo patch del branch 15.x)
- `react` / `react-dom`: 19.2.7
- `tailwindcss`: 4.3.0
- `shadcn` CLI: 4.11.0

---

## Architecture Patterns

### Recommended Project Structure
```
web-ui/
  app/
    layout.tsx               # root layout con nav
    page.tsx                 # home: step catalog + filtri
    editor/
      page.tsx               # authoring: editor Gherkin
    features/
      page.tsx               # catalogo .feature esistenti
    api/
      catalog/route.ts       # GET → step-catalog.json
      features/route.ts      # GET → lista .feature files
      import/route.ts        # POST → esegue import-scenarios.ts
      download/route.ts      # GET ?file=... → contenuto .feature
  components/
    StepCatalog.tsx          # tabella step con filtri (Client Component)
    GherkinEditor.tsx        # textarea + autocomplete (Client Component)
    FeaturePreview.tsx       # anteprima .feature formattata
    ImportDropzone.tsx       # drag-drop .txt
  lib/
    catalog.ts               # legge step-catalog.json
    features.ts              # glob src/features/**/*.feature
    importer.ts              # chiama /api/import (lato client)
  next.config.ts
  tsconfig.json
  components.json            # shadcn config (generato da shadcn init)
```

### Pattern 1: Lettura file dalla repo root (API Route)
**What:** Le API route leggono file con `path.join(process.cwd(), '..', 'file')`.
**When to use:** In tutte le route che accedono a `step-catalog.json` e `src/features/`.
**Example:**
```typescript
// Source: Next.js official docs — process.cwd() usage
// app/api/catalog/route.ts
import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

const REPO_ROOT = path.join(process.cwd(), '..');

export async function GET() {
  const catalogPath = path.join(REPO_ROOT, 'step-catalog.json');
  const raw = fs.readFileSync(catalogPath, 'utf-8');
  return NextResponse.json(JSON.parse(raw));
}
```

### Pattern 2: File download via Web Streams API (App Router)
**What:** Servire un file .feature come download HTTP senza caricare tutto in RAM.
**When to use:** `/api/download?file=path/to/file.feature`
**Example:**
```typescript
// Source: ericburel.tech/blog/nextjs-stream-files (verified pattern)
// app/api/download/route.ts
import * as fs from 'fs';
import * as path from 'path';

const REPO_ROOT = path.join(process.cwd(), '..');

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const file = searchParams.get('file') ?? '';

  // Validazione path traversal (OBBLIGATORIA)
  const resolved = path.resolve(REPO_ROOT, 'src', 'features', file);
  const featuresDir = path.resolve(REPO_ROOT, 'src', 'features');
  if (!resolved.startsWith(featuresDir + path.sep) && resolved !== featuresDir) {
    return new Response('Forbidden', { status: 403 });
  }
  if (!resolved.endsWith('.feature')) {
    return new Response('Forbidden', { status: 403 });
  }
  if (!fs.existsSync(resolved)) {
    return new Response('Not found', { status: 404 });
  }

  const content = fs.readFileSync(resolved, 'utf-8');
  const filename = path.basename(resolved);
  return new Response(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
```

### Pattern 3: execSync su Windows con shell:true
**What:** Invocare `npx ts-node` da una API route su Windows. CRITICO: senza `shell: true` fallisce con ENOENT perché `npx` è `npx.cmd` su Windows.
**When to use:** `/api/import` — unica route che invoca child_process.
**Example:**
```typescript
// Source: Windows ENOENT fix — verified via multiple sources
// app/api/import/route.ts
import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

const REPO_ROOT = path.join(process.cwd(), '..');

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get('file') as File;
  
  // Scrivi il file in una temp dir
  const tmpPath = path.join(os.tmpdir(), `import-${Date.now()}.txt`);
  const buffer = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(tmpPath, buffer);

  try {
    const output = execSync(
      `npx ts-node scripts/import-scenarios.ts --input "${tmpPath}"`,
      {
        cwd: REPO_ROOT,
        shell: true,          // OBBLIGATORIO su Windows
        encoding: 'utf-8',
        timeout: 30000,       // 30s max
      }
    );
    fs.unlinkSync(tmpPath);
    return Response.json({ ok: true, output });
  } catch (err: any) {
    fs.unlinkSync(tmpPath);
    return Response.json({ ok: false, error: err.message }, { status: 500 });
  }
}
```

### Pattern 4: Autocomplete Gherkin custom (no librerie)
**What:** Dropdown di suggerimenti step che appare dopo che l'utente scrive un keyword Gherkin. Completamente custom, zero dipendenze aggiuntive.
**When to use:** GherkinEditor.tsx — textarea controllata.
**Example:**
```typescript
// Custom — nessuna libreria, pattern standard React
const GHERKIN_KEYWORDS = /^(Given|When|Then|And|But)\s+(.*)$/;

function getAutocompleteContext(text: string): string | null {
  const lastLine = text.split('\n').pop() ?? '';
  const m = lastLine.match(GHERKIN_KEYWORDS);
  if (!m) return null;
  return m[2]; // il prefisso dopo la keyword
}

// Nel componente:
const prefix = getAutocompleteContext(value);
const suggestions = prefix !== null
  ? steps
      .filter(s => s.expression.toLowerCase().startsWith(prefix.toLowerCase()))
      .slice(0, 8)
  : [];
```

### Anti-Patterns to Avoid
- **Selettori Playwright nella web-ui:** La regola 4-layer del repo principale non si applica alla web-ui, ma non importare NULLA da `src/` (steps, actions, pages).
- **import diretto di step-catalog.json con `import`:** Funziona solo a build time con `resolveJsonModule`; usare sempre la API route per avere dati freschi in dev.
- **execSync senza `shell: true` su Windows:** Causa ENOENT silenzioso, difficile da diagnosticare.
- **path.resolve senza validazione:** Qualsiasi parametro file passato a /api/download deve essere validato contro la directory base prima di leggere.
- **Client Component per le letture filesystem:** Le letture di file devono avvenire SOLO in API routes o Server Components, mai in Client Components (non hanno accesso a `fs`).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Componenti UI (button, badge, input) | CSS custom + HTML grezzo | Shadcn/ui | Accesibilità, dark mode, varianti già gestite |
| Glob dei .feature files | Loop ricorsivo manuale | `glob` package (già in node_modules via altre deps) o `fs.readdirSync` ricorsivo | Il pattern `src/features/**/*.feature` è semplice; `glob` è già nel repo (via @cucumber) |
| Slugify filename per download | Regex custom | `slugify` da import-scenarios.ts (copiare la funzione, 5 righe) | Stesso algoritmo usato dallo script — output identico |
| Toast/feedback UI | Stato React manuale | Shadcn `toast` component | Gestisce stacking, auto-dismiss, accessibilità |

**Key insight:** Per il glob dei .feature la dipendenza `glob` è già nel repo root `node_modules` ma non nella web-ui. La soluzione più semplice è un `fs.readdirSync` ricorsivo con 10 righe di TypeScript — evita aggiungere dipendenze alla web-ui.

---

## Common Pitfalls

### Pitfall 1: ENOENT su Windows con execSync/spawn
**What goes wrong:** `execSync('npx ts-node ...')` lancia `Error: spawnSync npx ENOENT` su Windows.
**Why it happens:** Su Windows, `npx` è `npx.cmd`, un batch file. Node.js non può eseguire batch file direttamente senza una shell.
**How to avoid:** Passare sempre `{ shell: true }` nelle opzioni di `execSync`. Alternativa: usare `'npx.cmd'` come comando esplicito (meno portabile).
**Warning signs:** L'errore avviene immediatamente, non dopo timeout.

### Pitfall 2: process.cwd() diverso tra dev e build
**What goes wrong:** In dev, `process.cwd()` è la directory da cui si lancia `npm run dev` (di solito `web-ui/`). In build/produzione su Vercel cambierebbe. Per la demo localhost non è un problema.
**Why it happens:** Il Next.js server process eredita la cwd del processo che lo lancia.
**How to avoid:** Lanciare sempre `npm run dev` **dalla directory `web-ui/`**, non dalla repo root. Documentarlo nel README della web-ui.
**Warning signs:** `ENOENT: step-catalog.json` nelle API routes.

### Pitfall 3: React 19 peer dependency con --legacy-peer-deps
**What goes wrong:** `npm install` fallisce con conflitti peer deps se si aggiungono pacchetti che dichiarano `react@^18` come peer.
**Why it happens:** create-next-app installa React 19; molti pacchetti non hanno ancora aggiornato il peerDependencies range.
**How to avoid:** Usare `--legacy-peer-deps` per i pacchetti che danno conflitto. Shadcn gestisce questo automaticamente. Non aggiungere dipendenze non necessarie.
**Warning signs:** `npm warn peer dep` durante install di componenti shadcn.

### Pitfall 4: import-scenarios.ts usa process.cwd() come repo root
**What goes wrong:** Lo script `import-scenarios.ts` risolve tutti i path (`step-catalog.json`, `src/features/`, `src/steps/`) relativi a `process.cwd()`. Se il `cwd` dell'execSync non è la repo root, lo script fallisce o scrive nei posti sbagliati.
**Why it happens:** Lo script è progettato per essere lanciato dalla repo root. La web-ui è una subdirectory.
**How to avoid:** Nel Pattern 3 sopra, il `cwd` dell'execSync è sempre `REPO_ROOT = path.join(process.cwd(), '..')`.
**Warning signs:** Lo script dà `File non trovato: step-catalog.json` o crea cartelle in `web-ui/src/`.

### Pitfall 5: Autocomplete che non si chiude / focus trap
**What goes wrong:** Il dropdown autocomplete rimane aperto quando l'utente clicca fuori dalla textarea o preme Escape.
**Why it happens:** Mancata gestione degli eventi `onBlur` e `keyDown` (Escape).
**How to avoid:** Gestire `onBlur` con un piccolo delay (50ms) per permettere al click sul suggerimento di registrarsi prima della chiusura. Chiudere su `Escape`. Aria attributes per accessibilità (role="listbox").

### Pitfall 6: Textarea e posizionamento dropdown
**What goes wrong:** Il dropdown autocomplete si sovrappone ad altri elementi o va fuori viewport su schermi piccoli.
**Why it happens:** `position: absolute` richiede che il parent abbia `position: relative`.
**How to avoid:** Wrappare la textarea in un `<div style={{ position: 'relative' }}>`. Il dropdown ha `position: absolute; top: auto; left: 0; z-index: 50`.

---

## Code Examples

Verified patterns from official sources and project codebase:

### Lettura step-catalog.json da API route
```typescript
// Source: process.cwd() pattern — Next.js official docs
import * as fs from 'fs';
import * as path from 'path';
import { NextResponse } from 'next/server';

const REPO_ROOT = path.resolve(process.cwd(), '..');

export async function GET() {
  const data = JSON.parse(
    fs.readFileSync(path.join(REPO_ROOT, 'step-catalog.json'), 'utf-8')
  );
  return NextResponse.json(data);
}
```

### Glob .feature files ricorsivo (senza dipendenze)
```typescript
// Custom — no deps, ricorsivo
import * as fs from 'fs';
import * as path from 'path';

function walkFeatures(dir: string, base: string): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkFeatures(full, base));
    } else if (entry.name.endsWith('.feature')) {
      results.push(path.relative(base, full).replace(/\\/g, '/'));
    }
  }
  return results;
}
```

### Badge status Boots-friendly
```typescript
// Source: CONTEXT.md colori Boots + shadcn Badge
const STATUS_STYLES = {
  wanted:      'bg-[#FF6B2C] text-white',
  implemented: 'bg-[#2ECC71] text-white',
  deprecated:  'bg-[#9CA3AF] text-white',
};

<Badge className={STATUS_STYLES[step.status]}>{step.status}</Badge>
```

### Filtro prefix autocomplete
```typescript
// Custom — prefix match case-insensitive su expression
const PREFIX_RE = /(?:^|\n)(Given|When|Then|And|But)\s+([^\n]*)$/;

function getSuggestions(text: string, steps: CatalogStep[]): CatalogStep[] {
  const m = text.match(PREFIX_RE);
  if (!m) return [];
  const prefix = m[2].toLowerCase();
  return steps
    .filter(s => s.expression.toLowerCase().startsWith(prefix))
    .slice(0, 8);
}
```

---

## Runtime State Inventory

> Step 2.5 SKIPPED — questa è una fase greenfield (nuova subdirectory web-ui). Nessuno stato runtime da migrare.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Next.js runtime | ✓ | v24.12.0 | — |
| npm / npx | install + execSync | ✓ | 11.6.2 | — |
| ts-node | /api/import execSync | ✓ (in repo node_modules) | ^10.9.2 (devDep root) | `npx ts-node` lo trova via repo root node_modules |
| TypeScript | web-ui compiler | ✓ | ^5.9.x via create-next-app | — |

**Note su ts-node:** `ts-node` non è in PATH globale (`ts-node: not in PATH` verificato), ma il comando `npx ts-node` lanciato con `cwd: REPO_ROOT` lo trova in `REPO_ROOT/node_modules/.bin/ts-node` tramite npx. Con `shell: true` su Windows, npx funziona correttamente. [VERIFIED: Bash probe]

**Missing dependencies with no fallback:** nessuno.

---

## Validation Architecture

`nyquist_validation: true` in config.json — questa sezione è obbligatoria.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | nessuno nella web-ui (greenfield) — Wave 0 deve scegliere |
| Config file | nessuno — da creare in Wave 0 |
| Quick run command | `npm run test` (da definire in web-ui/package.json) |
| Full suite command | `npm run test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| UI-01 | GET /api/catalog restituisce l'array di step da step-catalog.json | unit (API route) | `npm test -- catalog.test` | ❌ Wave 0 |
| UI-02 | GET /api/features restituisce lista .feature files esistenti | unit (API route) | `npm test -- features.test` | ❌ Wave 0 |
| UI-03 | POST /api/import con file .txt valido esegue import-scenarios.ts | integration (manual-only) | manual — richiede scrittura su filesystem repo | manual-only |
| UI-04 | GET /api/download?file= risponde 403 su path traversal | unit (API route) | `npm test -- download.test` | ❌ Wave 0 |
| UI-05 | getSuggestions() filtra per prefix case-insensitive | unit (lib) | `npm test -- autocomplete.test` | ❌ Wave 0 |
| UI-06 | walkFeatures() ritorna solo file .feature | unit (lib) | `npm test -- features.test` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm test` in `web-ui/`
- **Per wave merge:** `npm test` full suite
- **Phase gate:** Suite verde + smoke visivo su localhost:3000 prima di `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `web-ui/` — directory da creare con `create-next-app`
- [ ] Framework test: raccomandato **Vitest** (integrazione nativa con TypeScript, no config aggiuntiva per Next.js API routes in unit test)
  - Install: `npm install -D vitest @vitest/ui`
  - Config: `vitest.config.ts` con `environment: 'node'` per testare le API routes
- [ ] `web-ui/__tests__/api/catalog.test.ts`
- [ ] `web-ui/__tests__/api/features.test.ts`
- [ ] `web-ui/__tests__/api/download.test.ts`
- [ ] `web-ui/__tests__/lib/autocomplete.test.ts`

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | fuori scope (M2) |
| V3 Session Management | no | fuori scope (M2) |
| V4 Access Control | no | localhost-only per la demo |
| V5 Input Validation | **yes** | validazione path traversal su /api/download; validazione file name su /api/import |
| V6 Cryptography | no | nessun dato sensibile |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Path traversal via `?file=../../etc/passwd` | Tampering | `path.resolve` + confronto con `featuresDir` prefix |
| Command injection via `--input` con path contenente `;` o `&&` | Tampering | scrivere sempre in tmpdir con nome generato (nessun input utente nel nome), non passare user input direttamente come argomento shell |
| SSRF via file upload di un .txt con path reference | Spoofing | N/A — il file viene scritto su tmpdir locale, non fetchato da URL |

**Note su command injection:** Il Pattern 3 (execSync) scrive il file in `os.tmpdir()` con nome generato (`import-${Date.now()}.txt`). Il comando shell non contiene input utente non sanitizzato — solo il path del file temporaneo, che è costruito internamente. Questo mitiga il rischio di injection.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Next.js Pages Router API routes (`pages/api/`) | App Router Route Handlers (`app/api/route.ts`) | Next.js 13+ | `NextRequest`/`Response` Web API, no `req`/`res` Node.js style |
| `res.pipe(stream)` per download | `new Response(ReadableStream)` | Next.js 13+ App Router | Non si può usare Node.js ReadStream direttamente — serve conversione Web Stream |
| `shadcn-ui` (vecchio package) | `shadcn` (nuovo CLI package) | 2024 | Il comando è `npx shadcn@latest`, non `npx shadcn-ui` |
| `tailwindcss@3` con `tailwind.config.js` | `tailwindcss@4` con CSS-first config | 2025 | Niente `tailwind.config.js` — la config è in `globals.css` con `@theme`. create-next-app --yes usa già TW4 |

**Deprecated/outdated:**
- `npx shadcn-ui`: Il vecchio package name. Usare `npx shadcn@latest`.
- `pages/api/` directory: Pattern Pages Router. La web-ui usa App Router con `app/api/route.ts`.
- `tailwind.config.js`: Non più necessario con Tailwind CSS v4.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `process.cwd()` dalla web-ui in dev punta a `web-ui/` (non alla repo root) | Pattern 1, Pitfall 2 | Se puntasse alla repo root, i path `../` andrebbero una directory troppo su — file non trovati |
| A2 | `npx ts-node` con `cwd: REPO_ROOT` trova ts-node in `REPO_ROOT/node_modules/.bin/` | Pattern 3, Environment | Se npx non cercasse in cwd/node_modules, il comando fallirebbe — fallback: usare path assoluto `node_modules/.bin/ts-node` |
| A3 | Tailwind CSS v4 non richiede `tailwind.config.js` — la config è in CSS | State of the Art | Se create-next-app 15.x usasse ancora TW3, la struttura config sarebbe diversa |

---

## Open Questions

1. **Versione Next.js da usare: 15.x o latest (16.x)?**
   - What we know: CONTEXT.md dice "Next.js 14+" ma la ricerca mostra che Next.js 16.x esiste già (latest npm). Next.js 15.5.19 è l'ultimo patch stabile del branch 15.
   - What's unclear: CONTEXT.md dice "14+", non "exactamente 14". Con la deadline di 3 giorni, testare N16 può introdurre rischi di breaking changes.
   - Recommendation: Usare `next@15` (pinned) per stabilità. `create-next-app@latest` installerebbe N16 — meglio usare `create-next-app@15` o specificare `next@15` nel package.json post-init.

2. **ts-node versione nel tsconfig della web-ui**
   - What we know: Il repo root usa `ts-node@^10.9.2` con `target: ES2022, module: CommonJS`.
   - What's unclear: La web-ui avrà `module: ESNext` (App Router standard). Il `execSync` chiama `ts-node` sul codice del repo root (non sulla web-ui), quindi il tsconfig del root viene usato — nessun conflitto.
   - Recommendation: La web-ui non dipende da ts-node come devDependency; ts-node resta solo nel repo root.

---

## Sources

### Primary (HIGH confidence)
- [VERIFIED: npm registry] — versioni next@15.5.19, react@19.2.7, tailwindcss@4.3.0, shadcn@4.11.0
- [CITED: nextjs.org/docs/app/getting-started/installation] — flags create-next-app, process.cwd() pattern
- [CITED: ericburel.tech/blog/nextjs-stream-files] — streaming file download con Web Streams API in App Router
- [CITED: ui.shadcn.com/docs/installation/next] — comandi init e add shadcn/ui

### Secondary (MEDIUM confidence)
- [CITED: fransiscuss.com/2025/04/22/fix-spawn-npx-enoent-windows11-mcp-server] — shell:true fix su Windows per spawn ENOENT
- [CITED: github.com/vercel/next.js/discussions/36031] — process.cwd() comportamento in dev vs build

### Tertiary (LOW confidence)
- Nessuna.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — versioni verificate via npm registry
- Architecture patterns: HIGH — basati su documentazione ufficiale + codebase esistente
- Windows execSync pitfall: HIGH — verificato da fonti multiple e probe ambiente locale
- Pitfalls autocomplete: MEDIUM — pattern standard React, nessun caso edge verificato con test

**Research date:** 2026-06-10
**Valid until:** 2026-07-10 (stack stabile; unico rischio è Next.js 16 che potrebbe cambiare API)
