---
phase: 02-catalog-pipeline-upgrade
verified: 2026-06-09T22:30:00Z
status: human_needed
score: 11/11 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Eseguire `npm run test:dry` e `npm test` dalla root del progetto"
    expected: "Exit 0, 5 scenari, 18 step, 0 undefined; lo step @wanted 'I search for the product {string}' non viene invocato e non causa fallimenti"
    why_human: "Impossibile eseguire npm in questo contesto di verifica. La SUMMARY dichiara exit 0 ma non e' stato possibile rieseguire il comando."
  - test: "Eseguire `cd vscode-extension && npx tsc --noEmit`"
    expected: "Exit 0, nessun errore di tipo TypeScript nell'extension"
    why_human: "Impossibile eseguire tsc nell'extension directory da questo contesto. La SUMMARY-03 dichiara exit 0 ma non e' stato possibile rieseguire."
---

# Phase 02: Catalog Pipeline Upgrade — Verification Report

**Phase Goal:** Extend the BDD step catalog pipeline so that step-catalog.json contains app, area, status, replacedBy, requester, assignee fields per step; npm run catalog recognizes lifecycle JSDoc tags (@wanted, @deprecated, @replacedBy, @requester, @assignee); the VS Code extension type CatalogStep includes the new fields (retrocompatible); STEP_CATALOG.md renders status badges and a breakdown header.
**Verified:** 2026-06-09T22:30:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Note sui requirement IDs

`REQUIREMENTS.md` non esiste nella directory `.planning/` — il file risulta rimosso dal commit `2f8f551` (merge del worktree 02-03). I requirement ID INFRA-02, INFRA-03, EXT-01 sono tracciati solo nel frontmatter dei PLAN e in `STATE.md`. La copertura viene verificata direttamente contro le must_haves dei PLAN.

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Ogni step nel catalog JSON ha campi app, area, domain (formato `<app>/<area>`) e status | VERIFIED | step-catalog.json: 11/11 step hanno `app`, `area`, `domain`, `status`. Step in `src/steps/orders/` (1-livello): `app:"orders"`, `area:"orders"`, `domain:"orders"`. Step in `src/steps/app-a/orders/`: `app:"app-a"`, `area:"orders"`, `domain:"app-a/orders"`. |
| 2 | Uno step con @wanted produce status: 'wanted' nel JSON | VERIFIED | step-catalog.json riga 15: `"status": "wanted"` per `"I search for the product {string}"`. Presente `requester:"DEMO-001"`, `assignee:"steve"`. |
| 3 | Lo step demo @wanted esiste in app-a/orders ed e' censito nel catalog | VERIFIED | `src/steps/app-a/orders/orders.steps.ts` esiste, contiene `@wanted`, `@requester DEMO-001`, `@assignee  steve`, `"I search for the product {string}"`. Nessun `.feature` in `src/features/` lo referenzia. |
| 4 | npm run catalog riconosce i tag JSDoc lifecycle (@wanted, @deprecated, @replacedBy, @requester, @assignee) | VERIFIED | `scripts/extract-steps.ts` riga 101: regex `/^@(\w+)(?:\s+(.*))?$/` gestisce tag bare. Righe 109-113: case per `wanted`, `deprecated`, `replacedBy`, `requester`, `assignee`. |
| 5 | STEP_CATALOG.md mostra il badge 🔧 davanti agli step wanted | VERIFIED | `STEP_CATALOG.md` riga 20: `### 🔧 \`I search for the product {string}\`` (verificato via node indexOf). |
| 6 | STEP_CATALOG.md header mostra il breakdown 'Total: N steps (X implemented, Y wanted, Z deprecated)' | VERIFIED | `STEP_CATALOG.md` riga 8: `Total: **11** steps (10 implemented, 1 wanted, 0 deprecated)`. |
| 7 | Lo step wanted mostra riga Requester/Assignee | VERIFIED | `STEP_CATALOG.md` riga 24: `_Requester: DEMO-001 — Assignee: steve_`. |
| 8 | Il domain di sezione riflette il formato `<app>/<area>` per step multi-app | VERIFIED | `STEP_CATALOG.md` riga 18: `## Domain: \`app-a/orders\` (1 steps)`. |
| 9 | CatalogStep dell'extension include app, area, status, replacedBy, requester, assignee come campi opzionali | VERIFIED | `vscode-extension/src/catalog/types.ts` righe 24-34: `app?: string`, `area?: string`, `status?: 'implemented' \| 'wanted' \| 'deprecated'`, `replacedBy?: string`, `requester?: string`, `assignee?: string`. Tutti opzionali. Campi esistenti invariati. |
| 10 | I nuovi campi dell'extension sono retrocompatibili (catalog senza questi campi non produce errori) | VERIFIED | Tutti i 6 campi dichiarati con `?:` — TypeScript tratta l'assenza come `undefined`. Logica consumer in render-markdown.ts usa `!s.status \|\| s.status === 'implemented'` come fallback. |
| 11 | Gli step deprecated non hanno badge (default silenzioso per implemented) | VERIFIED | `scripts/render-markdown.ts` riga 65-67: `statusBadge` e' stringa vuota se `status` non e' `wanted` o `deprecated`. 10 step implemented non hanno badge in `STEP_CATALOG.md`. |

**Score:** 11/11 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `scripts/extract-steps.ts` | Parser JSDoc esteso con tag lifecycle + derivazione app/area/domain | VERIFIED | Esiste, 213 righe. Interfaccia `CatalogStep` con `app`, `area`, `status`. Regex lifecycle funzionante. `writeFileSync` a step-catalog.json con nuovi campi. |
| `src/steps/app-a/orders/orders.steps.ts` | Step demo @wanted con requester/assignee | VERIFIED | Esiste, 20 righe. Contiene `@wanted`, `@requester DEMO-001`, `@assignee  steve`, `throw new Error('NOT IMPLEMENTED')`. |
| `step-catalog.json` | Catalog rigenerato con schema arricchito | VERIFIED | Esiste, 216 righe. 11 step, tutti con `app`, `area`, `domain`, `status`. 1 step `wanted` con `requester`/`assignee`. |
| `scripts/render-markdown.ts` | Renderer Markdown con badge status, breakdown header, righe lifecycle | VERIFIED | Esiste, 92 righe. Contiene `statusBadge`, `🔧`, `⛔`, `Sostituito da`, `Requester`, breakdown `(N implemented, N wanted, N deprecated)`. |
| `STEP_CATALOG.md` | Catalog Markdown rigenerato con badge e breakdown | VERIFIED | Esiste, 126 righe. Contiene badge 🔧, breakdown header, sezione `app-a/orders`, riga Requester/Assignee. |
| `vscode-extension/src/catalog/types.ts` | Interfaccia CatalogStep allineata allo schema arricchito, retrocompatibile | VERIFIED | Esiste. Contiene i 6 campi opzionali richiesti. Campi originali invariati. |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `scripts/extract-steps.ts` | `step-catalog.json` | `fs.writeFileSync` con campi app/area/status | WIRED | Riga 197: `fs.writeFileSync("step-catalog.json", JSON.stringify(catalog, null, 2))`. Campi `app`, `area`, `status` presenti in ogni entry. |
| `src/steps/app-a/orders/orders.steps.ts` | `step-catalog.json` | dry-run cattura lo step @wanted | WIRED | step-catalog.json contiene entry `"status": "wanted"` con `"app": "app-a"`, `"area": "orders"`, `"domain": "app-a/orders"`. |
| `scripts/render-markdown.ts` | `STEP_CATALOG.md` | Badge emoji condizionali | WIRED | Riga 65-67 produce badge; riga 90: `fs.writeFileSync("STEP_CATALOG.md", md)`. STEP_CATALOG.md contiene 🔧 a riga 20. |
| `vscode-extension/src/catalog/types.ts` | Provider extension | Interfaccia condivisa CatalogStep | VERIFIED | Campi opzionali dichiarati. Nessun consumer modificato — retrocompatibilita' garantita da tipizzazione opzionale. |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `STEP_CATALOG.md` | `steps` (da `catalog.steps`) | `step-catalog.json` via `fs.readFileSync` | Si: 11 step reali dal dry-run | FLOWING |
| `step-catalog.json` | `steps[]` | `cucumber-messages.ndjson` (dry-run output) | Si: step estratti dal codice sorgente via Cucumber formatter | FLOWING |

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| step-catalog.json ha status su tutti i 11 step | `node -e "const c=require('./step-catalog.json'); console.log(c.steps.filter(s=>!('status' in s)).length)"` | `0` | PASS |
| step @wanted con requester/assignee nel catalog | `node -e "const w=require('./step-catalog.json').steps.find(s=>s.status==='wanted'); console.log(w.requester, w.assignee, w.domain)"` | `DEMO-001 steve app-a/orders` | PASS |
| STEP_CATALOG.md contiene badge 🔧 | `node -e "const c=require('fs').readFileSync('./STEP_CATALOG.md','utf-8'); console.log(c.indexOf('🔧'))"`  | `564` (trovato) | PASS |
| STEP_CATALOG.md contiene breakdown header | Pattern `(10 implemented, 1 wanted, 0 deprecated)` | Trovato a riga 8 | PASS |
| Step wanted non referenziato in .feature | grep su `src/features/` per `I search for the product` | Nessun match | PASS |
| Regex lifecycle parse tag bare | `extract-steps.ts` riga 101: `/^@(\w+)(?:\s+(.*))?$/` | Presente | PASS |
| Interfaccia extension ha 6 campi opzionali | `types.ts`: `app?`, `area?`, `status?`, `replacedBy?`, `requester?`, `assignee?` | Tutti presenti | PASS |

---

### Requirements Coverage

| Requirement | Source Plan | Descrizione | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| INFRA-02 | 02-01-PLAN.md | Derivare `app` e `area` dal path del file step, comporre `domain` come `<app>/<area>` | SATISFIED | `extract-steps.ts` righe 148-152: `appMatch`, `areaMatch`, `domain = areaMatch ? \`${app}/${area}\` : app`. Verificato nel JSON. |
| INFRA-03 | 02-01-PLAN.md, 02-02-PLAN.md | Riconoscere tag JSDoc lifecycle, produrre campo `status`, rendere visibile nel Markdown | SATISFIED | Parser con regex opzionale, status top-level nel JSON, badge in STEP_CATALOG.md, breakdown header, righe Requester/Assignee. |
| EXT-01 | 02-03-PLAN.md | `CatalogStep` extension include i nuovi campi, tutti opzionali, retrocompatibili | SATISFIED | `types.ts`: 6 campi opzionali con union literal type. Campi originali invariati. |

Nota: `REQUIREMENTS.md` e' stato rimosso dal commit `2f8f551` (worktree merge 02-03). I requirement ID esistono solo nei PLAN e in `STATE.md`. Non ci sono requirement orfani da segnalare.

---

### Anti-Patterns Found

| File | Riga | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/steps/app-a/orders/orders.steps.ts` | 18 | `throw new Error('NOT IMPLEMENTED')` nello step @wanted | Info | Intenzionale (step demo wanted). Nessun `.feature` lo invoca — non causa fallimenti. Segnalato anche in REVIEW.md come WR-03: in un futuro scenario che invochi questo step, Cucumber mostrera' FAILED invece di PENDING. Non blocca il goal della fase. |
| `scripts/render-markdown.ts` | 35 | `JSON.parse(fs.readFileSync(...))` senza try/catch | Warning | Se `step-catalog.json` manca o e' malformato, crash con stack trace grezzo. Segnalato in REVIEW.md come WR-01. Non blocca il goal della fase. |
| `scripts/extract-steps.ts` | 123 | `fs.readFileSync(inputPath)` senza catch (dopo `existsSync`) | Warning | Race condition teorica. Segnalato in REVIEW.md come WR-02. Non blocca il goal. |
| `vscode-extension/src/catalog/types.ts` | 9-14 | `StepDoc` omette `page`, `wanted`, `deprecated` rispetto al canonico | Info | Schema drift risk futuro. Segnalato in REVIEW.md come WR-04. Non blocca il goal della fase — i campi lifecycle sono top-level su `CatalogStep`, non dentro `doc`. |

Nessun anti-pattern bloccante per il goal della fase. I warning sono stati gia' identificati nel code review (02-REVIEW.md) e sono accettati per questa fase.

---

### Human Verification Required

#### 1. npm run catalog exit code

**Test:** Dalla root del progetto, eseguire `npm run catalog`
**Expected:** Exit 0; output console mostra "Catalogo estratto: 11 step (11 documentati, 0 senza @intent)"; `step-catalog.json` e `STEP_CATALOG.md` rigenerati con i contenuti attesi
**Why human:** Impossibile eseguire npm in questo contesto di verifica

#### 2. npm run test:dry e npm test

**Test:** Eseguire `npm run test:dry` poi `npm test`
**Expected:** test:dry exit 0 (5 scenari, 18 step, 0 undefined); npm test exit 0 (lo step @wanted non e' invocato da nessun .feature, non causa fallimenti)
**Why human:** Impossibile eseguire npm con Playwright in questo contesto

#### 3. tsc --noEmit dell'extension

**Test:** `cd vscode-extension && npx tsc --noEmit`
**Expected:** Exit 0, nessun errore di tipo. I consumer esistenti (CompletionProvider, FsLoader, DiagnosticProvider, HoverProvider, TreeProvider) compilano senza modifiche
**Why human:** Impossibile eseguire tsc nell'extension directory senza node_modules installati

---

### Gaps Summary

Nessun gap. Tutti gli 11 must-haves sono verificati a livello di codice sorgente e artifact.

I 3 item di human verification riguardano l'esecuzione runtime (npm, tsc) che non e' possibile effettuare in questo contesto — ma i sorgenti verificati sono coerenti con i comandi che producono exit 0 secondo le SUMMARY. La probabilita' di fallimento runtime e' bassa dato che il codice TypeScript e' sintatticamente corretto e strutturalmente integro.

---

_Verified: 2026-06-09T22:30:00Z_
_Verifier: Claude (gsd-verifier)_
