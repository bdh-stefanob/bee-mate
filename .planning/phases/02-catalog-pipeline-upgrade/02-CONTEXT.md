# Phase 2: Catalog Pipeline Upgrade - Context

**Gathered:** 2026-06-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Estendere `scripts/extract-steps.ts` per derivare `app`, `area`, `status` da ogni
step definition e produrre un `step-catalog.json` con schema allargato. Aggiornare
`scripts/render-markdown.ts` per mostrare status e domain aggiornato nel STEP_CATALOG.md.
Allineare i tipi in `vscode-extension/src/catalog/types.ts` al nuovo schema in modo
retrocompatibile.

Nessuna nuova UI. Nessun cambiamento al comportamento dei test.
L'unico output visibile è il catalog arricchito (JSON + Markdown) e l'estensione
che non crasha su catalog vecchi.

</domain>

<decisions>
## Implementation Decisions

### Schema CatalogStep (extract-steps.ts + types.ts)

- **D-01:** Campi nuovi top-level su `CatalogStep` (coerente con `page` che è già top-level):
  - `app` — primo segmento dopo `steps/` nel path (es. `"app-a"`)
  - `area` — secondo segmento dopo `steps/<app>/` (es. `"auth"`)
  - `domain` — formato composto `"app-a/auth"` (era solo `"app-a"` in Phase 1)
  - `status` — `"implemented" | "wanted" | "deprecated"` (default `"implemented"`)
  - `replacedBy?` — espressione del sostituto (solo se `@deprecated`)
  - `requester?` — ID richiedente (solo se `@wanted`)
  - `assignee?` — SDET incaricato (solo se `@wanted`)

- **D-02:** Regole di inferenza status:
  - Ha `@wanted` → `status: "wanted"` (anche se ha `@intent`)
  - Ha `@deprecated` → `status: "deprecated"`
  - Nessuno dei due → `status: "implemented"` (default implicito)
  - `@wanted` + `@deprecated` in conflitto → `@wanted` vince (step non implementato)

- **D-03:** `StepDoc` in `extract-steps.ts` si arricchisce di `wanted`, `deprecated`,
  `replacedBy`, `requester`, `assignee` per il parsing interno. Nel JSON finale
  i campi lifecycle vivono top-level su `CatalogStep`, non annidati in `doc`.

### Rendering STEP_CATALOG.md (render-markdown.ts)

- **D-04:** Status visibile tramite **badge emoji inline** davanti all'expression:
  - `implemented` — nessun badge (default silenzioso, 80% degli step)
  - `wanted` — prefisso `🔧`
  - `deprecated` — prefisso `⛔`

- **D-05:** Step `🔧 WANTED`: mostrare `@intent` (se presente) + riga
  `_Requester: X — Assignee: Y_` se i campi sono compilati.

- **D-06:** Step `⛔ DEPRECATED`: mostrare `@intent` originale (se presente) +
  riga `**Sostituito da:** \`<espressione>\`` per il campo `replacedBy`.

- **D-07:** Header aggiornato con breakdown per status:
  ```
  Total: 9 steps (7 implemented, 1 wanted, 1 deprecated)
  ```
  Utile per il team per monitorare step arretrati da implementare.

### Retrocompatibilità extension (types.ts)

- **D-08:** Tutti i nuovi campi in `CatalogStep` sono opzionali (`?`) in TypeScript.
  `status` usa `status?: 'implemented' | 'wanted' | 'deprecated'` — il consumer
  tratta `undefined` come `"implemented"`. Nessuna versione né migrazione: se il campo
  manca, il fallback è il comportamento attuale (nessun crash, nessun badge).

### Claude's Discretion

- **Demo @wanted step**: I success criteria richiedono almeno uno step `@wanted` nel
  catalog demo. Claude sceglie un'espressione plausibile in `app-a/orders` (es.
  `I search for the product {string}`) con `@wanted`, `@intent` descrittivo,
  `@requester DEMO-001`, `@assignee steve`. Stub con `throw new Error('NOT IMPLEMENTED')`.
  Steve è il gatekeeper e può rimuoverlo o modificarlo nella review della PR.

- Ordine delle operazioni durante il refactor di `extract-steps.ts`
- Gestione edge case path (es. `src/steps/common/` senza secondo segmento → `area: "common"`, `domain: "common"`)
- Struttura interna dei commit (uno o più commit atomici)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requisiti di fase
- `.planning/REQUIREMENTS.md` §INFRA-02 — `app`, `area`, `domain` derivati dal path
- `.planning/REQUIREMENTS.md` §INFRA-03 — parsing JSDoc tags lifecycle, campo `status`
- `.planning/REQUIREMENTS.md` §EXT-01 — tipi extension con nuovi campi, retrocompatibilità

### Architettura e convenzioni lifecycle
- `WORKFLOW.md` §2 — tabella completa tag JSDoc (`@wanted`, `@deprecated`, `@replacedBy`,
  `@requester`, `@assignee`) con esempi concreti di step wanted e deprecated
- `CONTRIBUTING.md` §Step documentation — regole `@intent`, piramide dei tag

### Codice da modificare
- `scripts/extract-steps.ts` — parser JSDoc e schema `CatalogStep` da estendere
- `scripts/render-markdown.ts` — renderer Markdown da aggiornare per status + domain
- `vscode-extension/src/catalog/types.ts` — interfacce `CatalogStep`, `StepDoc`, `Catalog`

### Contesto Phase 1 (già completata)
- `.planning/phases/01-multi-app-scaffold/01-CONTEXT.md` §D-04 — fix regex domain Phase 1
  (base da cui partire per la derivazione `app/area` completa)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `scripts/extract-steps.ts` `extractDoc()` — funzione esistente di parsing JSDoc;
  da estendere con nuovi tag (`@wanted`, `@deprecated`, `@replacedBy`, `@requester`, `@assignee`)
- `scripts/render-markdown.ts` — struttura `byDomain` Map esistente; il loop per dominio
  è il punto di iniezione per i badge status

### Established Patterns
- Tag JSDoc: già parsati con `line.match(/^@(\w+)\s+(.*)$/)` — lo stesso pattern
  funziona per i nuovi tag, basta aggiungere i case nell'handler
- `domain` derivation: `uri.match(/steps[/\\]([^/\\]+)[/\\]/)` (Phase 1 fix) →
  estendere a `steps[/\\]([^/\\]+)[/\\]([^/\\]+)[/\\]` per catturare `app` + `area`
- Campi top-level su `CatalogStep`: `page` è già top-level (estratto da `doc.page`);
  usare lo stesso pattern per `status`, `replacedBy`, `requester`, `assignee`

### Integration Points
- `step-catalog.json` — output di `extract-steps.ts`, input di `render-markdown.ts`
  e dell'extension. Aggiungere campi è backwards-compatible (JSON ignora campi sconosciuti).
- `vscode-extension/src/catalog/types.ts` — interfaccia condivisa; aggiornare qui
  aggiorna automaticamente i type-check di tutti i provider dell'extension.
- `src/steps/app-a/orders/orders.steps.ts` — file target per il demo `@wanted` step.

</code_context>

<specifics>
## Specific Ideas

- Il badge `🔧` per WANTED è deliberatamente diverso da `⚠️` (usato per step
  undocumented): non confondere "step richiesto" con "step mal documentato".
- Il breakdown nell'header (`7 implemented, 1 wanted, 1 deprecated`) serve come
  KPI di backlog per il team: a colpo d'occhio si vede quanti step sono in attesa.
- `area: "common"` è il fallback per path senza secondo segmento (`steps/common/...`).

</specifics>

<deferred>
## Deferred Ideas

- Filtraggio per status in `render-markdown.ts` (es. `--only=wanted`) — utile per
  SDET che vuole vedere solo i propri task; fuori scope per questa fase.
- Contatore per dominio con breakdown status (es. "app-a/auth: 3 implemented, 1 wanted")
  nell'header di sezione; rimandato a Phase 4 (Extension Diagnostics).
- Retrocompatibilità bidirezionale (extension nuova + catalog vecchio): coperta da D-08.
  Direzione inversa (extension vecchia + catalog nuovo) non è un requisito — le extension
  si aggiornano insieme al repo.

</deferred>

---

*Phase: 02-catalog-pipeline-upgrade*
*Context gathered: 2026-06-09*
