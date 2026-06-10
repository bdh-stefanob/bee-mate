---
phase: 03-scenario-importer
verified: 2026-06-10T10:00:00Z
status: human_needed
score: 5/5
overrides_applied: 0
human_verification:
  - test: "Eseguire lo script su un nuovo file .txt con step misti (alcuni nel catalog, alcuni nuovi) da un terminale pulito senza artefatti pre-esistenti"
    expected: "Console stampa 'Import completato', indica N step nuovi e M step skippati, i file .feature e .steps.ts sono creati nella struttura corretta, npm run catalog completa senza errori"
    why_human: "I file generati (checkout-happy-path.feature, checkout.steps.ts) esistono già dal test e2e — lo script non sovrascrive .feature esistenti, quindi un nuovo run non è dimostrabile automaticamente senza cancellare i file prima. Verifica della demo del 13/06/2026 richiede esecuzione manuale da Steve."
  - test: "Verificare che il CLI sia usabile dal team QA Boots partendo da un file .txt Notepad con scenari Given/When/Then reali (non il fixture generico)"
    expected: "Lo script importa correttamente, genera .feature con tag @area, skeleton @wanted per step nuovi, e salta step già presenti nel catalog"
    why_human: "Il fixture test-fixtures/sample-import.txt usa dati placeholder generici. La validazione con dati QA Boots reali (che arrivano il 10/06/2026 secondo ROADMAP) richiede esecuzione umana per confermare che il parser gestisce correttamente i formati reali Boots."
---

# Phase 03: Scenario Importer — Verification Report

**Phase Goal:** Costruire `scripts/import-scenarios.ts` — CLI TypeScript che importa scenari BDD da .txt/.feature, produce file .feature validi e skeleton @wanted, rigenerazione catalog automatica. Pronto per demo manager 13/06/2026.
**Verified:** 2026-06-10T10:00:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Lo script accetta `--input <file>` e produce un file .feature in `src/features/<area>/` | VERIFIED | `scripts/import-scenarios.ts:195-305` — CLI parsing, `buildFeatureContent`, `fs.writeFileSync(featurePath, ...)`. Output confermato: `src/features/checkout/checkout-happy-path.feature` con `@checkout` tag e Feature/Scenario corretti. |
| 2 | Gli step non già nel catalog vengono estratti e scritti come skeleton @wanted in `src/steps/app-a/imported/` | VERIFIED | `scripts/import-scenarios.ts:308-330` — `buildStepSkeleton` produce blocco con `@wanted`, `@requester TBD`, `throw new Error('NOT IMPLEMENTED')`. Confermato in `checkout.steps.ts`: 7 step skeleton presenti. |
| 3 | Gli step già presenti nel catalog (match esatto su expression normalizzata) sono saltati senza duplicati | VERIFIED | `scripts/import-scenarios.ts:282-292` — `catalogExpressions` Set costruito da `catalog.steps.map(s => s.expression)`, confronto esatto. Confermato: "I am logged in as a {string} user" non appare in `checkout.steps.ts` (grep: nessun match). |
| 4 | Dopo l'import, `npm run catalog` viene chiamato e rigenera step-catalog.json | VERIFIED | `scripts/import-scenarios.ts:334-338` — `execSync('npm run catalog', { stdio: 'inherit' })`. Confermato: `step-catalog.json` mostra `generatedAt: 2026-06-10T07:27:40.433Z`, 18 step totali (era 11 prima della fase 3), 8 con `status: wanted`. |
| 5 | Il CLI emette un riepilogo: N step importati, M step skippati (già nel catalog), file creati | VERIFIED | `scripts/import-scenarios.ts:344-352` — Console.log con "Import completato", feature file path, skeleton path con count, step skippati count, catalog status. Output --help confermato funzionante (`npx ts-node scripts/import-scenarios.ts --help`). |

**Score:** 5/5 truths verified

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `scripts/import-scenarios.ts` | CLI import-scenarios completo e funzionante | VERIFIED | 447 righe, TypeScript valido (`tsc --noEmit` senza errori), contiene `main()`, `slugify()`, `normalizeStep()`, `parseScenarios()`, `buildFeatureContent()`, `buildStepsHeader()`, `buildStepSkeleton()`. |
| `src/features/checkout/checkout-happy-path.feature` | File .feature generato dall'input | VERIFIED | Esiste, inizia con `@checkout`, contiene `Feature: Checkout Happy Path`, 2 `Scenario:` con step indentati a 4 spazi. |
| `src/steps/app-a/imported/checkout.steps.ts` | Step skeleton @wanted per i nuovi step | VERIFIED | Esiste, 98 righe, contiene header imports, 7 blocchi `@wanted` + `@requester TBD` + `throw new Error('NOT IMPLEMENTED')`. |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `scripts/import-scenarios.ts` | `step-catalog.json` | `fs.readFileSync` — lettura catalog per deduplicazione | WIRED (pattern variant) | Il pattern PLAN richiedeva `readFileSync.*step-catalog\.json` su singola riga. L'implementazione usa `catalogPath = path.join(cwd, 'step-catalog.json')` (r. 273) e `fs.readFileSync(catalogPath, 'utf-8')` (r. 276). La funzionalità è identica: il catalog viene letto e usato per costruire il Set di deduplicazione. |
| `scripts/import-scenarios.ts` | `src/steps/app-a/imported/` | `fs.writeFileSync` — scrittura skeleton | WIRED (pattern variant) | Il pattern PLAN richiedeva `writeFileSync.*steps.*imported`. L'implementazione costruisce `stepsPath = path.join(cwd, 'src', 'steps', appArg, 'imported', ...)` (r. 310) e chiama `fs.writeFileSync(stepsPath, ...)` (r. 319). Path "imported" è nella variabile, non nell'argomento stringa letterale di writeFileSync. |
| `scripts/import-scenarios.ts` | `npm run catalog` | `child_process.execSync` | WIRED | Pattern `execSync.*npm run catalog` corrisponde esattamente alla riga 335. |

---

## Data-Flow Trace (Level 4)

Non applicabile — questo è un CLI tool, non un componente che renderizza dati dinamici. Il flusso dati è: file input → parser → catalog JSON → Set deduplicazione → file output. Tutti i passaggi sono verificati a livello 3 (wired).

---

## Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| CLI risponde a --help | `npx ts-node scripts/import-scenarios.ts --help` | Output documentazione con --input, --app, --area | PASS |
| TypeScript compila senza errori | `tsc --noEmit --skipLibCheck scripts/import-scenarios.ts` | Nessun output (exit 0) | PASS |
| Dry-run Cucumber — nessun step undefined | `npm run test:dry` | 7 scenarios (7 skipped), 28 steps (28 skipped), 0 undefined | PASS |
| Catalog contiene step @wanted generati | Node.js eval su step-catalog.json | 8 step wanted: 7 dal fixture checkout + 1 pre-esistente (I search for the product {string}) | PASS |
| Deduplicazione verificata | grep "I am logged in as" checkout.steps.ts | Nessun match — step skippato correttamente | PASS |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| IMP-01 | 03-01-PLAN.md | CLI accetta `--input <file>`, `--app`, `--area`; parsing args | SATISFIED | `scripts/import-scenarios.ts:195-225` — parsing `process.argv` con `--input` (obbligatorio), `--app` (default: app-a), `--area` (opzionale), `--help`. |
| IMP-02 | 03-01-PLAN.md | Produzione file .feature in `src/features/<area>/` con struttura Gherkin valida | SATISFIED | `buildFeatureContent` (r. 359-403) + `fs.writeFileSync(featurePath)` (r. 305). Output: `checkout-happy-path.feature` con `@checkout`, Feature, Scenario, step a 4 spazi. |
| IMP-03 | 03-01-PLAN.md | Normalizzazione placeholder ({string}/{int}/{float}) e deduplicazione esatta contro catalog | SATISFIED | `normalizeStep` (r. 69-82): float > string (singole/doppie) > int. Set `catalogExpressions` (r. 282) — confronto esatto. Confermato: {string} in "I add {string} to the basket", {int} in "the order total should be {int}". |
| IMP-04 | 03-01-PLAN.md | Skeleton @wanted con `throw new Error('NOT IMPLEMENTED')` in `src/steps/<app>/imported/` | SATISFIED | `buildStepSkeleton` (r. 425-440) + `buildStepsHeader` (r. 409-419). 7 step skeleton in `checkout.steps.ts` con @wanted, @requester TBD, throw. |
| IMP-05 | 03-01-PLAN.md | Dopo import, `npm run catalog` chiamato automaticamente | SATISFIED | `execSync('npm run catalog', { stdio: 'inherit' })` (r. 335). Catalog aggiornato confermato (18 step, 8 wanted). |
| IMP-06 | 03-01-PLAN.md | Riepilogo CLI con conteggio step nuovi, step skippati, file creati | SATISFIED | `console.log` blocco (r. 344-352): "Import completato", feature file path, skeleton path + count nuovi, step skippati count, catalog rigenerato. |

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `scripts/import-scenarios.ts` | 175-189 | Path-traversal guard bypassa path assoluti fuori dalla cwd (identificato in CR-01 del REVIEW.md) | Warning | Il check `normalized.includes('..')` non cattura path assoluti come `/etc/passwd`. Impatto basso per tool dev-only; nessun attore esterno accede al CLI. |
| `scripts/import-scenarios.ts` | 309 | `appArg` non sanitizzato prima di `path.join` (identificato in CR-02 del REVIEW.md) | Warning | `--app ../../etc` potrebbe risolvere fuori da `src/steps/`. Impatto basso — CLI dev-only. |
| `scripts/import-scenarios.ts` | 425-440 | `buildStepSkeleton` non genera parametri Cucumber nelle function signature (WR-01) | Warning | Skeleton generato con `async function (this: CustomWorld)` senza parametri anche per step con {string}/{int}. Non blocca la fase — è un debt noto al developer (riportato in REVIEW.md). |
| `scripts/import-scenarios.ts` | 334-338 | `execSync` failure swallowed con exit 0 (WR-02) | Warning | Se `npm run catalog` fallisce, lo script termina con successo apparente. Non blocca il goal M1 demo. |
| `src/steps/app-a/imported/checkout.steps.ts` | 2 | Header contiene path assoluto Windows locale (IN-01) | Info | `C:\Users\sbert\...\sample-import.txt` nel commento — non portable su altri OS/macchine. Non blocca funzionalità. |

Tutti gli anti-pattern sopra sono **Warning/Info** — nessuno blocca il goal di fase. Sono già documentati nel `03-REVIEW.md`. Non classificati come blocker perché: (1) il tool è dev-only senza attori ostili, (2) la demo del 13/06/2026 non richiede hardening security, (3) i skeleton @wanted funzionano correttamente anche senza parametri nelle signature (il corpo è sempre `throw new Error`).

---

## Human Verification Required

### 1. Demo end-to-end su file reale (non fixture)

**Test:** Eseguire `npx ts-node scripts/import-scenarios.ts --input <file-reale.txt> --app app-a --area <area>` con scenari Boots reali (non il fixture generico con Blue/Red Widget).

**Expected:** Lo script produce .feature con Gherkin valido, skeleton @wanted per step non nel catalog, salta step già presenti, rigenera il catalog. Console mostra conteggi corretti.

**Why human:** Il fixture `test-fixtures/sample-import.txt` usa dati placeholder generici. I file plain text reali del team QA Boots potrebbero avere varianti di formattazione (spazi, tab, encoding Windows CRLF, caratteri speciali nei nomi scenario) non coperte dal fixture. Verifica richiesta da Steve prima della demo del 13/06/2026.

### 2. Re-run idempotente su file già importato

**Test:** Eseguire lo script due volte sullo stesso `--input` (con i file .feature e .steps.ts già esistenti dal primo run).

**Expected:** Al secondo run, warning "file .feature già esistente, non sovrascritto", nessun nuovo step aggiunto al skeleton (già tutti nel catalog dopo il primo run + `npm run catalog`), catalog stabile.

**Why human:** Il comportamento idempotente è implementato (check `fs.existsSync`) ma non è stato verificato con `npm run test:dry` — il secondo run richiede che il catalog post-primo-run contenga già i nuovi step, il che dipende dal successo del `npm run catalog` del primo run. Verifica su macchina Steve confermata.

---

## Gaps Summary

Nessun gap blocca il goal di fase. Tutti i 5 must-have sono verified. Le 2 voci in human_verification riguardano la prontezza per la demo del 13/06/2026 con dati reali — non requisiti tecnici non soddisfatti.

I 4 anti-pattern Warning identificati nel REVIEW.md (CR-01 path guard, CR-02 app sanitization, WR-01 parametri skeleton, WR-02 exit code catalog) sono debiti tecnici noti, documentati, e non bloccanti per M1.

---

_Verified: 2026-06-10T10:00:00Z_
_Verifier: Claude (gsd-verifier)_
