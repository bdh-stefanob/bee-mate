# Phase 2: Catalog Pipeline Upgrade - Research

**Researched:** 2026-06-09
**Domain:** TypeScript script pipeline — JSDoc parsing, schema evolution, type alignment
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**D-01 — Schema CatalogStep (nuovi campi top-level):**
- `app` — primo segmento dopo `steps/` nel path (es. `"app-a"`)
- `area` — secondo segmento dopo `steps/<app>/` (es. `"auth"`)
- `domain` — formato composto `"app-a/auth"` (era solo `"app-a"` in Phase 1)
- `status` — `"implemented" | "wanted" | "deprecated"` (default `"implemented"`)
- `replacedBy?` — espressione del sostituto (solo se `@deprecated`)
- `requester?` — ID richiedente (solo se `@wanted`)
- `assignee?` — SDET incaricato (solo se `@wanted`)

**D-02 — Regole di inferenza status:**
- Ha `@wanted` → `status: "wanted"` (anche se ha `@intent`)
- Ha `@deprecated` → `status: "deprecated"`
- Nessuno dei due → `status: "implemented"` (default implicito)
- `@wanted` + `@deprecated` in conflitto → `@wanted` vince

**D-03 — StepDoc arricchito internamente:** `wanted`, `deprecated`, `replacedBy`, `requester`, `assignee` nel tipo interno `StepDoc`; nel JSON finale i campi lifecycle vivono top-level su `CatalogStep`, non annidati in `doc`.

**D-04 — Badge emoji inline in STEP_CATALOG.md:**
- `implemented` — nessun badge
- `wanted` — prefisso `🔧`
- `deprecated` — prefisso `⛔`

**D-05 — Step WANTED in Markdown:** mostrare `@intent` (se presente) + riga `_Requester: X — Assignee: Y_` se compilati.

**D-06 — Step DEPRECATED in Markdown:** mostrare `@intent` + riga `**Sostituito da:** \`<espressione>\``.

**D-07 — Header breakdown per status:**
```
Total: 9 steps (7 implemented, 1 wanted, 1 deprecated)
```

**D-08 — Retrocompatibilità extension:** tutti i nuovi campi in `CatalogStep` sono opzionali (`?`). `status` usa `status?: 'implemented' | 'wanted' | 'deprecated'`. Consumer tratta `undefined` come `"implemented"`.

### Claude's Discretion

- **Demo @wanted step**: step plausibile in `app-a/orders` (es. `I search for the product {string}`) con `@wanted`, `@intent` descrittivo, `@requester DEMO-001`, `@assignee steve`. Stub con `throw new Error('NOT IMPLEMENTED')`.
- Ordine delle operazioni durante il refactor di `extract-steps.ts`
- Gestione edge case path (es. `src/steps/common/` senza secondo segmento → `area: "common"`, `domain: "common"`)
- Struttura interna dei commit (uno o più commit atomici)

### Deferred Ideas (OUT OF SCOPE)

- Filtraggio per status in `render-markdown.ts` (es. `--only=wanted`)
- Contatore per dominio con breakdown status nell'header di sezione
- Retrocompatibilità bidirezionale (extension vecchia + catalog nuovo)
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| INFRA-02 | `extract-steps.ts` deriva `app` e `area` dal path del file step (`steps/<app>/<area>/`), produce catalog con campi `app`, `area`, `domain` come `<app>/<area>` | Regex esistente in `extract-steps.ts:133` già cattura il primo segmento; estensione a due segmenti è un one-liner verificato [VERIFIED: codebase] |
| INFRA-03 | `extract-steps.ts` riconosce JSDoc tags `@wanted`, `@deprecated`, `@replacedBy`, `@requester`, `@assignee` e produce catalog con campo `status` (implemented|wanted|deprecated) | Il parser `extractDoc()` usa già `line.match(/^@(\w+)\s+(.*)$/)` — aggiungere i nuovi case nella stessa struttura switch [VERIFIED: codebase] |
| EXT-01 | Il tipo `CatalogStep` nell'extension include `status`, `replacedBy`, `requester`, `assignee`, `app`, `area` (retrocompatibile con catalog senza questi campi) | `vscode-extension/src/catalog/types.ts` espone `CatalogStep` come interfaccia TypeScript; aggiungere campi opzionali non rompe i consumer esistenti [VERIFIED: codebase] |
</phase_requirements>

---

## Summary

Questa fase riguarda esclusivamente TypeScript interno al repository: nessuna dipendenza esterna da aggiungere, nessuna UI, nessun cambiamento al comportamento dei test. Il lavoro è chirurgico su tre file sorgente (`extract-steps.ts`, `render-markdown.ts`, `vscode-extension/src/catalog/types.ts`) e un file dimostrativo (`src/steps/app-a/orders/orders.steps.ts`).

Il catalogo corrente (`step-catalog.json`, generato il 2026-06-09) contiene 10 step, tutti con `domain` pari solo all'app (`"app-a"` o `"common"`), nessun campo `app`/`area`/`status`. Il refactor consiste nell'estendere il parser JSDoc con 5 nuovi tag, aggiornare la derivazione del `domain` da 1 a 2 segmenti di path, e propagare i nuovi campi nel JSON di output e nel rendering Markdown.

La retrocompatibilità dell'extension è garantita dalla regola TypeScript: i nuovi campi sono tutti opzionali. I provider VS Code esistenti (CompletionProvider, FsLoader) non toccano `status`/`app`/`area`, quindi continuano a funzionare su catalog vecchi senza modifiche.

**Primary recommendation:** Procedere nell'ordine — `extract-steps.ts` → demo step `@wanted` → `render-markdown.ts` → `types.ts`. Ogni file è indipendente; il JSON è il contratto di integrazione.

---

## Standard Stack

### Core (invariato, nessuna dipendenza da aggiungere)

| Componente | Versione | Ruolo in questa fase |
|------------|---------|----------------------|
| `ts-node` | 10.9.2 [VERIFIED: npm registry] | Esegue gli script a runtime — nessuna modifica |
| `typescript` | 5.5.x [VERIFIED: package.json] | Compila `extract-steps.ts`, `render-markdown.ts`, `types.ts` |
| `@cucumber/cucumber` | ^10.8.0 [VERIFIED: package.json] | Produce `cucumber-messages.ndjson` via dry-run — nessuna modifica |
| Node.js `fs` | built-in | Lettura/scrittura file — già in uso |

**Nessun `npm install` richiesto per questa fase.** [VERIFIED: codebase — tutti i tag JSDoc necessari sono stringhe parsate manualmente, nessuna libreria di parsing JSDoc esterna]

### Supporting (nessuno di nuovo)

Il rendering Markdown usa concatenazione stringa nativa. Non si introduce `marked`, `remark` né alcun engine esterno. [VERIFIED: codebase — `render-markdown.ts` usa solo `fs` e string template]

---

## Architecture Patterns

### Struttura file esistente (invariata)

```
scripts/
├── extract-steps.ts     ← MODIFICA: parser JSDoc + schema
├── render-markdown.ts   ← MODIFICA: badge status + breakdown header
└── (altri script invariati)

src/steps/
├── app-a/
│   ├── auth/auth.steps.ts          (invariato)
│   └── orders/orders.steps.ts      ← AGGIUNTA: step @wanted demo
└── common/
    └── common.steps.ts             (invariato — edge case path)

vscode-extension/src/catalog/
└── types.ts             ← MODIFICA: nuovi campi opzionali

step-catalog.json        ← OUTPUT rigenerato da npm run catalog
STEP_CATALOG.md          ← OUTPUT rigenerato da npm run catalog
```

### Pattern 1: Estensione regex path per `app` + `area`

**Cosa:** La regex che cattura `domain` da Phase 1 cattura solo il primo segmento. Estenderla a catturare due segmenti per `app` e `area`.

**Codice corrente** [VERIFIED: codebase — `extract-steps.ts:133`]:
```typescript
const domainMatch = uri.match(/steps[/\\]([^/\\]+)[/\\]/);
const domain = domainMatch ? domainMatch[1] : "common";
```

**Codice aggiornato** [ASSUMED — pattern regex derivato dall'analisi del codice esistente]:
```typescript
const appMatch   = uri.match(/steps[/\\]([^/\\]+)[/\\]/);
const areaMatch  = uri.match(/steps[/\\][^/\\]+[/\\]([^/\\]+)[/\\]/);

const app    = appMatch  ? appMatch[1]  : "common";
const area   = areaMatch ? areaMatch[1] : app;      // fallback: area = app per path a 1 livello
const domain = areaMatch ? `${app}/${area}` : app;  // "app-a/auth" oppure "common"
```

**Edge case `src/steps/common/common.steps.ts`:** path ha solo un segmento dopo `steps/` → `app = "common"`, `areaMatch` fallisce → `area = "common"`, `domain = "common"`.
[VERIFIED: codebase — struttura directory confermata da Glob `src/steps/**/*.ts`]

**Edge case `src/steps/app-a/auth/auth.steps.ts`:** `app = "app-a"`, `area = "auth"`, `domain = "app-a/auth"`.

### Pattern 2: Estensione `extractDoc()` per tag lifecycle

**Cosa:** Aggiungere 5 nuovi tag al parser già esistente. Il parser usa già esattamente il pattern `line.match(/^@(\w+)\s+(.*)$/)`.

**Codice corrente** [VERIFIED: codebase — `extract-steps.ts:89-103`]:
```typescript
for (const line of clean) {
  const m = line.match(/^@(\w+)\s+(.*)$/);
  if (!m) continue;
  const tag = m[1];
  const rest = m[2].trim();
  if (tag === "intent") doc.intent = rest;
  else if (tag === "pre") doc.pre = rest;
  else if (tag === "post") doc.post = rest;
  else if (tag === "page") doc.page = rest;
  else if (tag === "param") { ... }
}
```

**Nota tecnica:** `@wanted` e `@deprecated` non hanno argomento (sono flag). La regex `^@(\w+)\s+(.*)$` richiede almeno un carattere dopo lo spazio — il tag bare `@wanted` non fa match. Occorre gestire anche i tag bare. [VERIFIED: analisi codebase + WORKFLOW.md esempi]

**Pattern corretto** [ASSUMED — soluzione al problema dei tag bare]:
```typescript
// Gestisce sia "@tag valore" che "@tag" (flag senza argomento)
const m = line.match(/^@(\w+)(?:\s+(.*))?$/);
if (!m) continue;
const tag  = m[1];
const rest = (m[2] ?? "").trim();

if (tag === "wanted")     doc.wanted = true;
else if (tag === "deprecated") doc.deprecated = true;
else if (tag === "replacedBy") doc.replacedBy = rest;
else if (tag === "requester")  doc.requester = rest;
else if (tag === "assignee")   doc.assignee = rest;
// ... tag esistenti invariati
```

**Alternativa verificabile:** usare `line.match(/^@wanted\b/)` per i tag flag; entrambe le soluzioni sono corrette. [ASSUMED]

### Pattern 3: Promozione campi lifecycle top-level su `CatalogStep`

**Pattern stabilito** [VERIFIED: codebase — `extract-steps.ts:141`]:
```typescript
// Già fatto per `page`:
steps.push({ expression, parameters, domain, page: doc.page, sourceRef, doc, documented });
```

**Estensione analoga** [ASSUMED — derivato direttamente dal pattern esistente]:
```typescript
const status: 'implemented' | 'wanted' | 'deprecated' =
  doc.wanted     ? 'wanted'     :
  doc.deprecated ? 'deprecated' :
                   'implemented';

steps.push({
  expression, parameters,
  app, area, domain,       // nuovi
  status,                  // nuovo
  ...(doc.replacedBy  ? { replacedBy: doc.replacedBy }   : {}),
  ...(doc.requester   ? { requester:  doc.requester }     : {}),
  ...(doc.assignee    ? { assignee:   doc.assignee }      : {}),
  page: doc.page,
  sourceRef, doc, documented,
});
```

### Pattern 4: Rendering badge in `render-markdown.ts`

**Dove inserire** [VERIFIED: codebase — `render-markdown.ts:55-70`]: il loop `for (const s of list)` costruisce ogni voce di step. Il badge va davanti all'expression nell'intestazione `###`.

```typescript
// Attuale:
const flag = s.documented ? "" : " ⚠️ _undocumented_";
md += `### \`${s.expression}\`${flag}\n\n`;

// Nuovo — badge status + flag undocumented (non in conflitto):
const statusBadge = s.status === 'wanted'     ? '🔧 '  :
                    s.status === 'deprecated'  ? '⛔ '  : '';
const undocFlag   = s.documented ? "" : " ⚠️ _undocumented_";
md += `### ${statusBadge}\`${s.expression}\`${undocFlag}\n\n`;
```

**Header breakdown** [ASSUMED — struttura derivata da D-07]:
```typescript
const impl = steps.filter(s => !s.status || s.status === 'implemented').length;
const want = steps.filter(s => s.status === 'wanted').length;
const depr = steps.filter(s => s.status === 'deprecated').length;
md += `Total: **${catalog.totalSteps}** steps `;
md += `(${impl} implemented, ${want} wanted, ${depr} deprecated)\n\n`;
```

**Nota retrocompatibilità nel renderer:** `s.status` può essere `undefined` su catalog vecchi — il filtro `!s.status || s.status === 'implemented'` gestisce entrambi i casi. [ASSUMED]

### Pattern 5: Aggiornamento `types.ts` (extension)

**File da modificare** [VERIFIED: codebase — `vscode-extension/src/catalog/types.ts`]:

```typescript
// Attuale CatalogStep:
export interface CatalogStep {
  expression: string;
  parameters: string[];
  domain: string;
  page?: string;
  sourceRef: string;
  doc: StepDoc;
  documented: boolean;
}

// Aggiornato (tutti i nuovi campi opzionali — D-08):
export interface CatalogStep {
  expression: string;
  parameters: string[];
  domain: string;
  app?: string;                                           // nuovo
  area?: string;                                          // nuovo
  status?: 'implemented' | 'wanted' | 'deprecated';      // nuovo
  replacedBy?: string;                                    // nuovo (solo se deprecated)
  requester?: string;                                     // nuovo (solo se wanted)
  assignee?: string;                                      // nuovo (solo se wanted)
  page?: string;
  sourceRef: string;
  doc: StepDoc;
  documented: boolean;
}
```

**Nessuna modifica ai consumer** (CompletionProvider, FsLoader, DiagnosticProvider): non leggono `status`/`app`/`area`; TypeScript compila senza errori perché i campi sono opzionali. [VERIFIED: codebase — grep su `vscode-extension/src/` non mostra accessi a questi campi]

### Anti-Pattern: modificare `StepDoc` nel JSON di output

**Non fare:** esporre `wanted: true`, `deprecated: true`, `replacedBy`, `requester`, `assignee` dentro l'oggetto `doc` nel JSON finale. Il CONTEXT.md D-03 stabilisce che `doc` conserva il suo schema attuale e i campi lifecycle vivono top-level. Questa separazione è intenzionale: `doc` è documentazione, i campi lifecycle sono metadati operativi. [VERIFIED: CONTEXT.md D-03]

---

## Don't Hand-Roll

| Problema | Non costruire | Usare invece | Perché |
|----------|--------------|--------------|--------|
| Parsing JSDoc tag | Parser JSDoc custom | Il parser esistente in `extractDoc()` (già funzionante) | Il pattern regex `^@(\w+)(?:\s+(.*))?$` copre tutti i tag necessari |
| Rilevamento status | Logica di inferenza complessa | Semplice priorità: `wanted` > `deprecated` > `implemented` (3 righe) | I tag sono mutuamente esclusivi per design (D-02) |
| Tipo union per status | Enum TypeScript o costanti | `'implemented' \| 'wanted' \| 'deprecated'` literal union type | I literal type TypeScript sono sufficienti e più leggibili |
| Rendering condizionale MD | Template engine | String concatenation condizionale (pattern già in uso) | `render-markdown.ts` usa già questo approccio; aggiungere un template engine è overkill |

---

## Common Pitfalls

### Pitfall 1: Tag bare `@wanted` senza spazio — non matchato dalla regex esistente

**Cosa va storto:** La regex `^@(\w+)\s+(.*)$` richiede `\s+` (uno o più spazi) e poi almeno un carattere. Il tag `@wanted` scritto senza argomento non produce match → viene silenziosamente ignorato → lo step appare come `implemented`.

**Perché succede:** Il parser esistente è stato progettato per tag con valore (`@intent testo`, `@param name desc`). I tag flag (`@wanted`, `@deprecated`) sono nuovi in questa fase. [VERIFIED: analisi codebase]

**Come evitare:** Usare `^@(\w+)(?:\s+(.*))?$` — il gruppo valore diventa opzionale. Coprire con test dry-run dopo la modifica.

**Segnali di allarme:** `npm run catalog` non mostra warning su step con `@wanted` ma nel JSON `status` è `"implemented"`.

### Pitfall 2: `render-markdown.ts` ha la propria interfaccia `CatalogStep` locale

**Cosa va storto:** `render-markdown.ts:14-27` dichiara una propria interfaccia `CatalogStep` locale (diversa da quella in `types.ts` e da quella interna a `extract-steps.ts`). Se si aggiungono campi a `step-catalog.json` ma non si aggiorna questa interfaccia locale, TypeScript compila comunque (i campi extra nel JSON sono ignorati), ma i badge non vengono emessi.

**Perché succede:** I due script sono indipendenti e condividono lo schema solo tramite il file JSON, non tramite un tipo condiviso. [VERIFIED: codebase — `render-markdown.ts:14-27` confermato]

**Come evitare:** Aggiornare anche l'interfaccia locale `CatalogStep` in `render-markdown.ts` con i campi `status?`, `app?`, `area?`.

**Segnali di allarme:** TypeScript compila, ma STEP_CATALOG.md non mostra badge `🔧` né `⛔`.

### Pitfall 3: Tipo `StepDoc` locale in `extract-steps.ts` non allineato con `types.ts`

**Cosa va storto:** Anche `extract-steps.ts` ha la propria interfaccia `StepDoc` locale (righe 23-29). Se si aggiungono i campi lifecycle solo a `StepDoc` in `types.ts` ma non nel file dello script, il compilatore emette errori di tipo durante il parsing.

**Come evitare:** L'interfaccia `StepDoc` locale in `extract-steps.ts` deve essere arricchita con `wanted?: boolean`, `deprecated?: boolean`, `replacedBy?: string`, `requester?: string`, `assignee?: string`. [VERIFIED: codebase]

### Pitfall 4: Ordinamento step rotto dopo cambio `domain`

**Cosa va storto:** L'ordinamento in `extract-steps.ts:144-148` ordina per `domain` poi per `expression`. Prima di Phase 2, `domain` era `"app-a"`. Dopo, sarà `"app-a/auth"`. Il sort alfabetico continua a funzionare (`"app-a/auth" < "app-a/orders" < "common"`), ma i test che assumono un ordine specifico potrebbero rompersi se basati sull'indice di posizione.

**Come evitare:** Verificare dopo `npm run catalog` che il JSON sia ordinato correttamente. Nessun test dipende dall'ordine nel progetto attuale. [VERIFIED: codebase — nessun test unitario sullo script]

### Pitfall 5: Demo step `@wanted` che fa fail in `npm test` (non solo dry-run)

**Cosa va storto:** Lo stub `@wanted` ha `throw new Error('NOT IMPLEMENTED')`. Se qualche `.feature` referenzia questo step, il run vero (`npm test`) fallisce. Il dry-run (`npm run test:dry`) passa.

**Come evitare:** Non aggiungere il demo step a nessun `.feature` esistente. Lo step è solo in `orders.steps.ts` ma nessun `.feature` lo invoca. [VERIFIED: codebase — confermato da analisi WORKFLOW.md §1]

---

## Code Examples

Tutti i pattern rilevanti sono documentati in "Architecture Patterns" con riferimento al sorgente verificato. Riepilogo dei punti di modifica precisi:

### Punto di modifica 1 — `extract-steps.ts` riga 23 (interfaccia `StepDoc` locale)
Aggiungere: `wanted?: boolean; deprecated?: boolean; replacedBy?: string; requester?: string; assignee?: string;`

### Punto di modifica 2 — `extract-steps.ts` riga 31 (interfaccia `CatalogStep` locale)
Aggiungere: `app: string; area: string; status: 'implemented' | 'wanted' | 'deprecated'; replacedBy?: string; requester?: string; assignee?: string;`

### Punto di modifica 3 — `extract-steps.ts` riga 89 (loop tag in `extractDoc()`)
Modificare regex + aggiungere 5 case per i nuovi tag.

### Punto di modifica 4 — `extract-steps.ts` riga 133 (derivazione domain)
Estendere regex per catturare `app` + `area`, aggiornare derivazione `domain`.

### Punto di modifica 5 — `extract-steps.ts` riga 141 (push step)
Aggiungere `app`, `area`, `status`, `replacedBy?`, `requester?`, `assignee?`.

### Punto di modifica 6 — `extract-steps.ts` riga 150 (contatori catalog)
Aggiungere contatori `wantedSteps`, `deprecatedSteps` nel catalog JSON.

### Punto di modifica 7 — `render-markdown.ts` riga 14 (interfaccia locale)
Aggiungere `status?`, `app?`, `area?` all'interfaccia `CatalogStep` locale.

### Punto di modifica 8 — `render-markdown.ts` riga 43 (header Total)
Sostituire la riga `Total steps` con breakdown per status.

### Punto di modifica 9 — `render-markdown.ts` riga 55 (loop step)
Aggiungere badge `statusBadge` e righe condizionali per WANTED/DEPRECATED.

### Punto di modifica 10 — `vscode-extension/src/catalog/types.ts` riga 16
Aggiungere i 6 nuovi campi opzionali a `CatalogStep`.

### Punto di modifica 11 — `src/steps/app-a/orders/orders.steps.ts` (fine file)
Aggiungere lo step demo `@wanted`.

---

## State of the Art

| Prima (Phase 1) | Dopo (Phase 2) | Impatto |
|-----------------|----------------|---------|
| `domain: "app-a"` | `domain: "app-a/orders"`, `app: "app-a"`, `area: "orders"` | Granularità aumentata; sort alfabetico invariato |
| Nessun campo `status` | `status: "implemented" \| "wanted" \| "deprecated"` | Lifecycle step visibile nel catalog |
| Tag JSDoc: `@intent`, `@param`, `@pre`, `@post`, `@page` | Aggiunta: `@wanted`, `@deprecated`, `@replacedBy`, `@requester`, `@assignee` | Parser esteso con 5 nuovi case |
| `CatalogStep` in `types.ts` ha 7 campi | Aggiunta di 6 campi opzionali | Retrocompatibile (tutti opzionali) |
| Header MD: `Total steps: N (X documented, Y undocumented)` | Header MD: `Total: N steps (X implemented, Y wanted, Z deprecated)` | KPI backlog immediato |

---

## Assumptions Log

| # | Claim | Sezione | Rischio se sbagliato |
|---|-------|---------|----------------------|
| A1 | La regex `^@(\w+)(?:\s+(.*))?$` è la soluzione corretta per tag bare | Pattern 2 | Il tag `@wanted` non viene rilevato → status sempre `implemented`. Verificabile con test manuale su step di esempio. |
| A2 | `area = app` come fallback per path a 1 livello (es. `steps/common/common.steps.ts`) | Pattern 1 | `area` sarebbe `undefined` o stringa vuota. Fallback esplicito evita NullPointerException. |
| A3 | Contatore `wantedSteps`/`deprecatedSteps` aggiunto al JSON catalog radice | Pattern 4 | Il renderer deve contare autonomamente dallo `steps[]` array. Impatto basso, due approcci equivalenti. |
| A4 | Lo spread condizionale `...(doc.replacedBy ? { replacedBy: ... } : {})` è il pattern preferito per campi opzionali | Pattern 3 | Alternativa: emettere sempre i campi con `undefined`. Entrambe valide; il JSON.stringify omette le `undefined` in ogni caso. |

---

## Open Questions

1. **`npm run catalog` scrive `cucumber-messages.ndjson` nella root — questo file va in `.gitignore`?**
   - Cosa sappiamo: il file è già usato oggi e non è nel `.gitignore` standard del progetto (non verificato)
   - Cosa non è chiaro: se è già escluso o se va aggiunto nella fase
   - Raccomandazione: verificare durante Wave 0; se non escluso, aggiungerlo è un micro-task da includere nel piano

2. **Il campo `domain` nel JSON cambia da `"app-a"` a `"app-a/auth"` — impatto sui consumer esistenti?**
   - Cosa sappiamo: `CompletionProvider` e `validate-steps.ts` leggono `domain` per raggruppamento; il cambio di formato altera come vengono raggruppati gli step nell'extension
   - Cosa non è chiaro: se i provider Phase 1 dell'extension dipendono dal formato `"app-a"` (senza area) per qualche match string
   - Raccomandazione: verificare `vscode-extension/src/` — se c'è un match `domain === "app-a"` hardcoded, va aggiornato. Basso rischio dato che l'extension attuale usa `domain` solo per raggruppamento display.

---

## Environment Availability

Step 2.6: SKIPPED (fase di sola modifica codice/script TypeScript — nessuna dipendenza esterna da installare. `ts-node` 10.9.2 [VERIFIED: npm registry] e `typescript` 5.5.x [VERIFIED: package.json] sono già disponibili).

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | `@cucumber/cucumber` ^10.8.0 + `npm run test:dry` come smoke test degli script |
| Config file | `cucumber.js` (root) |
| Quick run command | `npm run test:dry` |
| Full suite command | `npm run catalog && npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Esiste? |
|--------|----------|-----------|-------------------|-------------|
| INFRA-02 | `extract-steps.ts` produce `app`, `area`, `domain` corretti nel JSON | integration (output JSON check) | `npm run catalog && node -e "const c=require('./step-catalog.json'); const s=c.steps.find(x=>x.sourceRef.includes('orders')); console.assert(s.app==='app-a'); console.assert(s.area==='orders'); console.assert(s.domain==='app-a/orders')"` | ❌ Wave 0 (script inline) |
| INFRA-03 | Uno step con `@wanted` produce `status: "wanted"` nel JSON | integration (output JSON check) | `npm run catalog && node -e "const c=require('./step-catalog.json'); const s=c.steps.find(x=>x.status==='wanted'); console.assert(s, 'nessuno step wanted trovato')"` | ❌ Wave 0 (demo step + inline) |
| EXT-01 | `types.ts` aggiornato compila senza errori con i nuovi campi | type check | `cd vscode-extension && npx tsc --noEmit` | ✅ (infrastruttura tsc già presente) |

### Sampling Rate

- **Per task commit:** `npm run test:dry`
- **Per wave merge:** `npm run catalog && npm run test:dry`
- **Phase gate:** `npm run catalog` produce JSON con step `@wanted` demo + `npm test` verde

### Wave 0 Gaps

- [ ] Script di verifica JSON inline per INFRA-02 e INFRA-03 (eseguibili come one-liner node dopo `npm run catalog`)
- [ ] Demo step `@wanted` in `src/steps/app-a/orders/orders.steps.ts` — richiesto prima di poter validare INFRA-03

*(Nessun framework di test unitario da installare — i test di questa fase sono verifiche di output JSON tramite node inline.)*

---

## Security Domain

Questa fase non introduce surface di attacco: nessun endpoint HTTP, nessuna autenticazione, nessun input utente a runtime. I file prodotti (`step-catalog.json`, `STEP_CATALOG.md`) sono artifact di build, non dati operativi.

| ASVS Category | Applies | Note |
|---------------|---------|------|
| V2 Authentication | no | Nessun sistema auth coinvolto |
| V3 Session Management | no | — |
| V4 Access Control | no | — |
| V5 Input Validation | no | Input = file sorgente TypeScript del repo; non input utente |
| V6 Cryptography | no | — |

---

## Project Constraints (from CLAUDE.md)

| Direttiva | Impatto su questa fase |
|-----------|------------------------|
| Architettura 4 layer: steps non importano pages | Il demo step `@wanted` deve seguire il pattern stub — `throw new Error('NOT IMPLEMENTED')` senza import di pages |
| `STEP_CATALOG.md` non si scrive a mano; solo `npm run catalog` | Tutte le modifiche al Markdown devono passare per `render-markdown.ts` |
| `step-catalog.json` va committato | Il JSON aggiornato è parte del deliverable |
| Conventional Commits | `feat:`, `fix:`, `chore:` per i commit di questa fase |
| Niente credenziali nel codice | Non rilevante per questa fase |
| Naming: `app-a`/`app-b` come placeholder | Il campo `app` avrà valore `"app-a"` nel demo — corretto |
| Risposte in italiano | Rispettato nel presente documento |

---

## Sources

### Primary (HIGH confidence)
- Codebase verificata direttamente: `scripts/extract-steps.ts`, `scripts/render-markdown.ts`, `vscode-extension/src/catalog/types.ts`, `src/steps/**/*.ts`, `step-catalog.json` [VERIFIED: Read tool]
- `WORKFLOW.md` §2 — tabella tag JSDoc con esempi concreti [VERIFIED: Read tool]
- `CONTRIBUTING.md` §Step status — tabella lifecycle [VERIFIED: Read tool]
- `.planning/phases/02-catalog-pipeline-upgrade/02-CONTEXT.md` — decisioni D-01..D-08 [VERIFIED: Read tool]

### Secondary (MEDIUM confidence)
- `npm view ts-node version` → 10.9.2 [VERIFIED: bash]
- Node.js version locale: 24.12.0 [VERIFIED: bash]

### Tertiary (LOW confidence)
- Nessuna fonte LOW utilizzata

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — nessuna dipendenza da aggiungere, tutto verificato da codebase
- Architecture patterns: HIGH — derivati direttamente dal codice esistente con punti di modifica precisi
- Pitfalls: HIGH — identificati da analisi diretta del codice (regex esistente, interfacce locali duplicate)
- Regex per tag bare: MEDIUM — pattern corretto ma non verificato con unit test

**Research date:** 2026-06-09
**Valid until:** Stabile (il dominio è TypeScript script interno, nessuna dipendenza esterna volatile)
