<!-- generated-by: gsd-doc-writer -->
# Step Lifecycle Guide

_Guida per Steve (QA lead/gatekeeper) e analisti tecnici sul ciclo di vita degli step BDD._

---

## Cos'è uno step in questo sistema

Uno **step** è la connessione tra una frase in linguaggio naturale scritta in Gherkin (es. `Given I am logged in as a "standard" user`) e il codice TypeScript che esegue quell'azione tramite Playwright.

Il percorso completo di uno step attraversa quattro layer:

```
features/     (.feature)     "Given I am logged in as a 'standard' user"
    ↓
steps/        (glue TypeScript)    associa la regex alla action call
    ↓
actions/      (intenzione business)  loginAs(role) — niente selettori
    ↓
pages/        (Page Object)    selettori CSS/XPath, locators Playwright
```

**Regola fondamentale:** ogni layer parla solo a quello immediatamente sotto. Gli step non contengono mai selettori; le action non contengono mai logica di routing. Se la UI cambia, si modifica solo il Page Object.

Il **catalogo** (`step-catalog.json`) è la fonte di verità di tutti gli step: contiene l'espressione, lo stato, la documentazione e i metadati. Viene generato automaticamente dal codice (`npm run catalog`) e non va mai modificato a mano.

---

## I tre stati del ciclo di vita

### `implemented` — pronto all'uso

```json
{
  "expression": "I am logged in as a {string} user",
  "status": "implemented",
  "page": "LoginPage",
  "doc": {
    "intent": "Logs in as a user of the given role in one declarative step.",
    "post": "An authenticated session is active for that role."
  }
}
```

Lo step ha un'implementazione TypeScript funzionante in `src/steps/`, documentazione `@intent`, e si può usare nei `.feature` senza restrizioni. Appare **verde** nel portale web.

### `wanted` — richiesto, in attesa di implementazione

```json
{
  "expression": "I search for the product {string}",
  "status": "wanted",
  "requester": "DEMO-001",
  "assignee": "steve",
  "doc": {
    "intent": "Searches the catalog for a product by name.",
    "wanted": true
  }
}
```

Lo step è stato approvato come canonico da Steve, esiste nella codebase come stub (o nel catalog come richiesta), ma **non ha ancora un'automazione Playwright dietro**. I QA possono includerlo nei loro scenari; i test che lo usano falliranno o saranno saltati in CI finché non viene implementato. Appare **arancione** nel portale.

### `deprecated` — obsoleto

```json
{
  "expression": "I click the login button",
  "status": "deprecated",
  "replacedBy": "I log in with valid credentials"
}
```

Lo step non deve essere usato in nuovi scenari. Il campo `replacedBy` indica lo step sostitutivo. I `.feature` esistenti che lo usano devono essere migrati. Appare **rosso** nel portale.

---

## Diagramma del ciclo di vita

```
QA ha bisogno di un nuovo step
         |
         v
  Richiesta a Steve
  (Jira ticket, chat, riunione)
         |
         v
  Steve valuta:
    ├─ esiste già? → suggerisce lo step corretto al QA
    ├─ near-duplicate? → consolida con lo step esistente
    └─ genuinamente nuovo → aggiunge a step-catalog.json
                            con status: "wanted"
                            e i campi requester / assignee
         |
         v
  QA usa lo step @wanted nei propri .feature
  (i test falliranno in CI finché non implementato)
         |
         v
  Dev implementa in src/steps/<app>/<area>/<name>.steps.ts
  con @intent, @pre, @post documentati nel JSDoc
         |
         v
  Dev esegue: npm run catalog
  → step-catalog.json aggiornato con status: "implemented"
  → STEP_CATALOG.md rigenerato
         |
         v
  Step implementato e documentato — pronto all'uso
         |
         v
  (nel tempo) Step diventa obsoleto
         |
         v
  Steve aggiorna step-catalog.json manualmente:
    status: "deprecated"
    replacedBy: "<espressione dello step sostitutivo>"
         |
         v
  I QA migrano i .feature che usano lo step deprecato
```

---

## Come funzionano gli step parametrici

### Placeholder `{string}` e `{int}`

Un'espressione con parametri usa i placeholder Cucumber:

```gherkin
Given I am logged in as a "standard" user
                            ^^^^^^^^
                            valore del parametro {string}
```

Nella step definition TypeScript il placeholder diventa un argomento della funzione:

```typescript
/**
 * @intent  Logs in as a user of the given role in one declarative step.
 * @param   role The role to log in as: "admin" | "standard".
 * @post    An authenticated session is active for that role.
 */
Given('I am logged in as a {string} user', async (role: string) => {
  await loginAs(role);
});
```

- **`{string}`** — valore tra virgolette singole o doppie nel Gherkin
- **`{int}`** — valore intero senza virgolette (es. `the order total should be 42`)

### Valori enum in `step-enums.json`

Il file `step-enums.json` arricchisce gli step parametrici con **valori noti** (enum). È l'unico file di configurazione che **non viene sovrascritto** da `npm run catalog`: va editato manualmente.

Struttura di una voce enum:

```json
{
  "expression": "I add {string} to the basket",
  "paramEnums": [
    {
      "token": "{string}",
      "label": "Product name",
      "values": ["Aspirin 500mg", "Ibuprofen 400mg", "Vitamin C 1000mg"]
    }
  ]
}
```

Quando il portale web mostra questo step nel pannello Step Browser, il campo `{string}` appare come **menu a tendina** con i valori della lista invece di una casella di testo libero. Questo riduce gli errori di digitazione e garantisce che i valori dei parametri siano coerenti tra scenari diversi.

Se `values` è un array vuoto (`[]`), il campo compare come **testo libero** nel picker.

### Come aggiungere nuovi valori enum

1. Aprite `step-enums.json` nella root del progetto
2. Trovate la voce corrispondente all'espressione dello step (o createla se mancante)
3. Aggiungete il valore all'array `values`

Esempio — aggiungere "Melatonin 3mg" ai prodotti noti:

```json
{
  "expression": "I add {string} to the basket",
  "paramEnums": [
    {
      "token": "{string}",
      "label": "Product name",
      "values": [
        "Aspirin 500mg",
        "Ibuprofen 400mg",
        "Vitamin C 1000mg",
        "Paracetamol 500mg",
        "Cetirizine 10mg",
        "Melatonin 3mg"
      ]
    }
  ]
}
```

4. Salvate il file — le modifiche sono attive immediatamente al riavvio del portale web; non è necessario eseguire `npm run catalog`.

> **Attenzione:** `npm run catalog` non tocca `step-enums.json`. Le vostre modifiche agli enum sono al sicuro.

---

## Area e App: cosa significano

### `app` — l'applicazione di riferimento

Il campo `app` identifica l'applicazione web che lo step automatizza:

```json
{ "app": "auth", ... }       // modulo di autenticazione
{ "app": "orders", ... }     // modulo ordini
{ "app": "common", ... }     // step condivisi tra applicazioni
{ "app": "app-a", ... }      // placeholder demo (da rinominare con il nome reale)
```

### `area` — il dominio funzionale

Il campo `area` identifica il sottodominio funzionale all'interno dell'applicazione:

```json
{ "app": "auth",   "area": "auth" }          // login, registrazione
{ "app": "orders", "area": "orders" }        // carrello, checkout, conferma
{ "app": "app-a",  "area": "imported" }      // step importati da scenari legacy
```

### `domain` — la chiave composta

Il campo `domain` è la concatenazione `app/area` e identifica univocamente il percorso del file di implementazione:

```
domain: "orders"  →  src/steps/orders/orders.steps.ts
domain: "auth"    →  src/steps/auth/auth.steps.ts
domain: "app-a/orders"  →  src/steps/app-a/orders/orders.steps.ts
```

---

## Il gate CI/PR

Il gate CI impedisce che step non approvati entrino nel repository principale.

### Come funziona

Ad ogni PR, la pipeline esegue una validazione degli step usati nei `.feature` modificati contro `step-catalog.json`:

1. Ogni riga `Given/When/Then` viene estratta dal `.feature`
2. L'espressione viene matchata contro le regex del catalog
3. **Match esatto** → OK
4. **Match fuzzy >80%** → warning con suggerimento dello step canonico esistente
5. **Nessun match** → PR bloccato

### Cosa significa per i QA

- I QA **non possono committare step inventati** senza approvazione: il gate li blocca
- Se uno step non esiste nel catalog, bisogna richiedere a Steve di aggiungerlo come `wanted` prima di committare il `.feature`
- Steve può bypassare il gate con `--no-verify` per commit di manutenzione straordinaria, ma è una pratica da usare raramente

---

## Come richiedere un nuovo step (ruolo: QA)

1. Verificate nel catalogo (pagina Catalog del portale) che lo step non esista già con una formulazione diversa
2. Controllate i near-duplicate: se esiste uno step simile al 90%, usate quello
3. Se siete certi che lo step non esiste, **contattate Steve** (Jira, chat o direttamente) con:
   - La frase esatta che vorreste usare (`Given I open the prescription page`)
   - Il contesto: quale feature, quale flusso
   - Il valore di business: perché non va bene uno step esistente
4. Steve valuterà e — se approvato — aggiungerà la voce al catalog come `wanted`
5. A quel punto potete usare lo step nei vostri `.feature`: i test saranno marcati come "step not implemented" in CI finché il team di sviluppo non completa l'implementazione

> **Non inventate mai la frase da soli e non fate PR senza che lo step sia nel catalog.** Il gate CI bloccherà la PR.

---

## Come approvare un nuovo step (ruolo: Steve/gatekeeper)

Quando ricevete una richiesta di nuovo step da un QA:

### 1. Verificare che non esista già

```bash
# Cerca nel catalog via grep
grep -i "prescription" step-catalog.json
```

Oppure cercate nel portale web (Catalog → barra di ricerca).

### 2. Verificare che non sia un near-duplicate

Confrontate la frase proposta con step simili già presenti. Se esiste uno step con >80% di somiglianza, rispondete al QA con lo step canonico da usare.

### 3. Aggiungere al catalog come `wanted`

Editate `step-catalog.json` aggiungendo la voce nella lista `steps`:

```json
{
  "expression": "I open the prescription page",
  "parameters": [],
  "app": "pharmacy",
  "area": "prescriptions",
  "domain": "pharmacy/prescriptions",
  "status": "wanted",
  "requester": "JIRA-456",
  "assignee": "dev-name",
  "sourceRef": "src/steps/pharmacy/prescriptions/prescriptions.steps.ts:1",
  "doc": {
    "intent": "Navigates to the prescription management page.",
    "wanted": true,
    "requester": "JIRA-456",
    "assignee": "dev-name"
  },
  "documented": true
}
```

Campi obbligatori:
- `expression` — testo esatto dello step
- `parameters` — array vuoto `[]` se nessun parametro, altrimenti `["{string}"]` ecc.
- `app` + `area` + `domain` — da decidere in base al dominio funzionale
- `status: "wanted"`
- `requester` — ticket Jira o nome del QA richiedente
- `sourceRef` — percorso dove la step definition sarà implementata (può non esistere ancora)

### 4. (Opzionale) Aggiungere enum values

Se lo step ha parametri con valori noti, aggiungeteli subito in `step-enums.json` (vedi sezione precedente).

### 5. Comunicare al QA

Avvisate il QA che lo step è nel catalog come `wanted` e può essere usato nei `.feature`. I test falliran con "pending" in CI finché la step definition non viene implementata.

---

## Come segnare uno step come deprecato

Quando un'azione cambia e uno step esistente non è più la forma canonica:

1. Identificate lo step sostitutivo (già implementato o da aggiungere)
2. Aggiornate `step-catalog.json` manualmente:

```json
{
  "expression": "I click the checkout button",
  "status": "deprecated",
  "doc": {
    "intent": "...",
    "replacedBy": "I proceed to checkout"
  }
}
```

> **Nota:** il campo `replacedBy` non è ancora un campo top-level ufficiale nel schema corrente, ma viene convenzionalmente messo dentro `doc`. Verificate la struttura del catalog al momento della modifica.

3. Eseguite `npm run catalog` per rigenerare `STEP_CATALOG.md` con il badge `⛔ deprecated`
4. Notificate il team QA: chi usa lo step deprecato deve migrare i propri `.feature`

---

## Riepilogo dei comandi rilevanti

```bash
# Rigenera STEP_CATALOG.md e aggiorna i metadati in step-catalog.json
npm run catalog

# Esegue i test (richiede browser installati)
npm test

# Dry-run: valida gli step senza eseguire Playwright
npm run test:dry

# Avvia il portale web di authoring
cd web-ui && npm run dev
```

---

## File chiave

| File | Chi lo modifica | Come |
|---|---|---|
| `step-catalog.json` | Generato da `npm run catalog`; voce `wanted`/`deprecated` da Steve manualmente | Editor di testo + `npm run catalog` |
| `step-enums.json` | Steve (o chi gestisce il catalog) | Editor di testo diretto — non viene toccato da `npm run catalog` |
| `STEP_CATALOG.md` | **Non modificare a mano** — generato da `npm run catalog` | Solo tramite `npm run catalog` |
| `src/steps/**/*.ts` | Dev team | Implementazione TypeScript + Playwright |
