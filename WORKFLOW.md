# Workflow — QA manuale ↔ SDET

> Come QA manuali e SDET collaborano sulla stessa suite, evitando rumore e
> garantendo che ogni step richiesto venga implementato (o esplicitamente
> rifiutato). Per le regole architetturali → `CONTRIBUTING.md`. Per la mappa
> applicativi → `DOMAINS.md`.

---

## 1. Ciclo di vita di uno step

Ogni step nel catalog ha uno **status** dichiarato:

```
                wanted  ─────►  implemented  ─────►  deprecated
                  ▲                  │                    │
                  │                  └────► (replaced by) ┘
            (QA chiede)         (SDET implementa)   (Steve approva ritiro)
```

- **wanted**: il QA manuale ha chiesto questo step, lo stub esiste in codice
  con body che fa `throw 'NOT IMPLEMENTED'`. Visibile nel catalog. **Non
  eseguibile** (il dry-run e' OK, il run vero esplode di proposito).
- **implemented**: lo step funziona, ha actions/pages dietro, e' documentato
  con `@intent`. Usabile nei `.feature`.
- **deprecated**: lo step esiste ma e' scoraggiato. Esiste un sostituto
  canonico indicato in `@replacedBy`. Convive col sostituto per il tempo
  necessario alla migrazione dei `.feature` che lo usano.

---

## 2. Convenzioni dei tag JSDoc

I tag vivono nel commento `/** ... */` immediatamente **sopra** la step
definition. `extract-steps.ts` li parsa e popola il catalog.

| Tag | Obbligatorio | Esempio | Significato |
|---|---|---|---|
| `@intent` | Quando `implemented` | `Logs in as a user of the given role.` | Descrizione business-oriented dello step |
| `@param <name> <desc>` | Per ogni parametro | `@param role The role: "admin" \| "standard"` | Documentazione di un placeholder |
| `@pre` | No | `@pre A registered user exists.` | Precondizione assunta |
| `@post` | No | `@post An authenticated session is active.` | Postcondizione garantita |
| `@page` | Quando rilevante | `@page LoginPage` | Page Object associato (per multi-app) |
| `@wanted` | Solo se status wanted | `@wanted` | Lo step e' un placeholder, non implementato |
| `@requester <id>` | Con `@wanted` | `@requester JIRA-123` | Chi ha richiesto lo step (ticket o utente) |
| `@assignee <id>` | Con `@wanted` | `@assignee steve` | SDET che lo prendera' in carico |
| `@deprecated` | Solo se status deprecated | `@deprecated` | Lo step e' scoraggiato |
| `@replacedBy <expr>` | Con `@deprecated` | `@replacedBy "I am logged in as a {string} user"` | Step canonico sostitutivo |

Esempio di step `implemented`:

```ts
/**
 * @intent Logs in as a user of the given role in one declarative step.
 * @param role The role to log in as: "admin" | "standard".
 * @post An authenticated session is active for that role.
 * @page LoginPage
 */
Given('I am logged in as a {string} user', async function (role: string) {
  // ... vera implementazione via actions/pages
});
```

Esempio di step `wanted`:

```ts
/**
 * @wanted
 * @intent QA manuale richiede: cerca un prodotto per nome libero.
 * @param name Nome del prodotto da cercare.
 * @requester JIRA-123
 * @assignee steve
 */
When('I search for the product {string}', async function (_name: string) {
  throw new Error('NOT IMPLEMENTED — wanted by QA, awaiting SDET pickup');
});
```

Esempio di step `deprecated`:

```ts
/**
 * @deprecated
 * @intent (deprecated) Use the canonical step that includes the role.
 * @replacedBy "I am logged in as a {string} user"
 */
Given('I am logged in', async function () {
  // implementazione legacy, non rimossa per non rompere .feature in transizione
});
```

---

## 3. Flusso operativo (handoff QA manuale → SDET)

### Scenario A — Lo step esiste gia' nel catalog (caso normale, ~80% del tempo)

1. QA manuale apre un `.feature` in VS Code
2. Inizia a digitare `Given/When/Then` → l'estensione `bdd-step-catalog`
   suggerisce gli step esistenti via autocomplete deterministico
3. Tab attraverso i placeholder, valorizza i parametri, salva
4. Apre PR. La CI esegue il `.feature`. Verde → merge.

### Scenario B — Lo step NON esiste (caso da gestire bene)

1. QA manuale scrive il testo dello step desiderato (es.
   `When I search for the product "Aspirin"`).
2. L'estensione segnala con squiggle rosso: "step non nel catalog".
3. QA manuale invoca quickfix **"Request step implementation"** (ROADMAP §5.6
   punto 5): l'extension:
   - chiede a quale `<app>/<area>` appartiene
   - genera lo stub in `src/steps/<app>/<area>/<area>.steps.ts` con `@wanted`,
     `@requester` (Jira ticket se configurato, altrimenti username),
     `@assignee` (vuoto o Steve di default)
   - apre PR con label `step-wanted`
4. Steve (gatekeeper) **rivede la PR**: lo step e' davvero nuovo, o duplica
   uno esistente con altre parole?
   - Se duplicato: chiude PR, commenta il QA con lo step canonico da usare
   - Se nuovo legittimo: assegna SDET, merge PR (catalog ora include lo step
     con `status: wanted`)
5. SDET prende in carico:
   - implementa actions/pages necessari
   - rimuove `@wanted`, sostituisce il body con vera implementazione
   - aggiunge `@intent`, `@pre`, `@post`
   - apre PR `step-impl/<expression-slug>`
6. Steve approva, merge. Catalog si rigenera, lo step diventa `implemented`,
   il `.feature` del QA manuale ora gira verde.

### Scenario C — Ritiro di uno step (deprecation)

1. Steve identifica uno step duplicato/obsoleto
2. Lo marca con `@deprecated` + `@replacedBy "<canonico>"`
3. CI emette warning sui `.feature` che ancora usano lo step deprecato (vedi
   ROADMAP §5.2 — pre-commit hook)
4. Quando l'ultimo `.feature` ha migrato, Steve cancella lo step

---

## 4. Cosa fa l'estensione VS Code per supportare il flusso

| Bisogno | Feature extension | Stato |
|---|---|---|
| QA cerca uno step esistente | Autocomplete + comando `Find step…` | ✅ Implementato |
| QA vede gli step disponibili per dominio | Tree view sidebar | 🔧 In sviluppo |
| QA capisce se uno step e' wanted/implemented/deprecated | Badge nel TreeItem + decorator nel completion | 🔧 In sviluppo |
| QA segnala uno step mancante | Quickfix "Request step implementation" | ⏳ Pianificato (ROADMAP §5.6.5) |
| QA legge la doc di uno step | Hover provider | ⏳ Pianificato |
| SDET vede tutti i `wanted` da prendere | Filtro `status: wanted` nella tree view | ⏳ Pianificato |

---

## 5. Riassunto comportamentale

| Domanda | Risposta |
|---|---|
| Chi puo' aggiungere uno step `wanted`? | Chiunque, via quickfix dell'estensione |
| Chi puo' promuovere `wanted` → `implemented`? | SDET (con review di Steve) |
| Chi puo' marcare `deprecated`? | Steve (gatekeeper) |
| Chi puo' cancellare uno step? | Steve, solo quando nessun `.feature` lo usa |
| Step `wanted` blocca CI? | No (dry-run passa). Si solo se un `.feature` reale lo invoca in run vero |
| Step duplicato bloccato come? | Pre-commit hook (ROADMAP §5.2) + review umana di Steve |
| Catalog si rigenera quando? | A ogni merge su `main` (CI: `npm run catalog && commit step-catalog.json`) |
