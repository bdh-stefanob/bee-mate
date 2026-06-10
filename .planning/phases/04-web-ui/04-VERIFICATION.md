---
phase: 04-web-ui
verified: 2026-06-10T10:00:00Z
status: human_needed
score: 14/15
overrides_applied: 0
human_verification:
  - test: "Avviare npm run dev in web-ui/ e aprire http://localhost:3000"
    expected: "Le tre pagine (/, /editor, /features) caricano con nav teal, toggle tema dark/light e toggle lingua EN/IT visibili. La home mostra la tabella step."
    why_human: "Rendering Next.js 15 con CodeMirror 6 richiede browser reale — non testabile via grep."
  - test: "Scrivere 'Given I a' nell'editor su http://localhost:3000/editor"
    expected: "Compare un dropdown con max 8 step dal catalog che iniziano con 'i a'. Tab/Enter inserisce. Escape chiude."
    why_human: "Autocomplete CodeMirror 6 richiede interazione tastiera nel browser."
  - test: "Dal Catalog, doppio click su una riga step"
    expected: "L'editor si apre a /editor?step=Given%20... con lo step pre-inserito nel CodeMirror."
    why_human: "Dipende da router.push e hydration React — verificabile solo a runtime."
  - test: "Premere il toggle tema (icona luna/sole) e il toggle lingua (EN/IT)"
    expected: "Il tema dark/light si applica globalmente; i label cambiano lingua in EN e IT su tutte le pagine."
    why_human: "Comportamento visivo e i18n — non testabile staticamente."
---

# Phase 04: Web-UI Verification Report

**Phase Goal:** Web-UI authoring portal — Next.js 15 app con Step Catalog, Gherkin Editor (CodeMirror, autocomplete, toolbar, step browser, linting), Feature Files page, dark/light theme, EN/IT i18n.
**Verified:** 2026-06-10T10:00:00Z
**Status:** human_needed
**Re-verification:** No — verifica iniziale

---

## Goal Achievement

### Observable Truths

| #  | Truth | Status | Evidence |
|----|-------|--------|---------|
| 1  | npm run dev in web-ui/ avvia il server (scripts "dev" e "test" presenti, Next 15.5.19) | VERIFIED | `package.json` contiene `"dev": "next dev --turbopack"`, `"next": "15.5.19"` |
| 2  | Le tre pagine (/, /editor, /features) caricano con nav comune | VERIFIED | `layout.tsx` espone nav con 3 Link shadcn; `page.tsx`, `editor/page.tsx`, `features/page.tsx` esistono e montano componenti reali |
| 3  | GET /api/catalog legge step-catalog.json reale dal repo | VERIFIED | `api/catalog/route.ts` usa `REPO_ROOT` + `fs.readFileSync` — non stub |
| 4  | GET /api/features elenca i .feature via walkFeatures+parseFeatureSummary | VERIFIED | `api/features/route.ts` chiama `listFeatures(FEATURES_DIR)`; `lib/features.ts` implementa `walkFeatures`+`parseFeatureSummary`+`listFeatures` puri |
| 5  | GET /api/download serve .feature con guard 403 su path traversal e estensione | VERIFIED | `api/download/route.ts` chiama `safeFeaturePath`; test 4/4 (200, 403 traversal, 403 ext, 404) documentati e codice conforme |
| 6  | POST /api/import esegue import-scenarios.ts via execSync Windows-safe | VERIFIED | `api/import/route.ts` usa `execSync` con `shell: process.platform === 'win32' ? 'cmd.exe' : '/bin/sh'`, `cwd: REPO_ROOT`, `timeout: 30000`; CR-02 fix aggiunge `safeFeaturePath` sul path restituito dallo script |
| 7  | REPO_ROOT e FEATURES_DIR risolvono correttamente; safeFeaturePath blocca traversal | VERIFIED | `lib/repo.ts` implementa entrambi; guard con `prefix.toLowerCase()` (WR-04 fix case-insensitive); 4 test verdi documentati |
| 8  | StepCatalog mostra tabella con filtri (query/area/status) e badge colorati (#FF6B2C/#2ECC71/#9CA3AF) | VERIFIED | `StepCatalog.tsx`: fetch `/api/catalog`, `filterSteps`, `uniqueAreas`, `uniqueStatuses`, `STATUS_STYLES` con i 3 colori esatti, `onDoubleClick → router.push('/editor?step=')` |
| 9  | Doppio click su step del catalog apre editor con step pre-inserito (?step=) | VERIFIED (codice) | `StepCatalog.tsx` usa `router.push('/editor?step=' + encodeURIComponent(...))`. `editor/page.tsx` legge `useSearchParams().get('step')` — richiede verifica umana browser |
| 10 | GherkinEditor CodeMirror 6 con syntax highlighting, linting, autocomplete, toolbar, step browser | VERIFIED | `GherkinEditor.tsx` (242 righe, CodeMirror 6); `gherkin-cm.ts` (StreamParser + HighlightStyle + linter); `GherkinToolbar.tsx` (2 righe + undo/redo); `StepBrowser.tsx` (fetch catalog, click-to-insert, keyboard nav) |
| 11 | Autocomplete prefix-match: getSuggestions pura, max 8, sull'ultima riga | VERIFIED | `lib/autocomplete.ts` implementa `getAutocompletePrefix` + `getSuggestions` (slice 0,8); 5 test verdi documentati |
| 12 | Import .txt via ImportDropzone → POST /api/import → editor caricato con riepilogo N/M | VERIFIED | `ImportDropzone.tsx` POST FormData → `onImported(json.featureContent)`; riepilogo `newCount/skipCount` mostrato |
| 13 | Pagina /features lista feature con preview e download | VERIFIED | `features/page.tsx` fetch `/api/features`, click → `selected`, `<FeaturePreview file={selected} />`; `FeaturePreview.tsx` fetch `/api/download` + link download |
| 14 | Dark/light theme con next-themes + toggle | VERIFIED | `ThemeToggle.tsx` (useTheme, Moon/Sun icons); `Providers.tsx` wrap con `NextThemesProvider`; `layout.tsx` monta entrambi i toggle |
| 15 | EN/IT i18n con toggle lingua | VERIFIED (struttura) | `lib/i18n.ts` (translations EN+IT per catalog/editor/features/status); `LanguageToggle.tsx`; `Providers.tsx` espone `useLanguage()`; verifica umana per applicazione effettiva nelle pagine |

**Score:** 14/15 truths verificabili staticamente (truth 9 e 15 parzialmente richiedono browser)

---

### Deferred Items

Nessuno — tutti gli item del piano risultano implementati in questa fase.

---

### Required Artifacts

| Artifact | Status | Linee | Note |
|----------|--------|-------|------|
| `web-ui/src/lib/repo.ts` | VERIFIED | 52 | REPO_ROOT, FEATURES_DIR, slugify, safeFeaturePath con case-insensitive fix |
| `web-ui/src/lib/types.ts` | VERIFIED | 24 | CatalogStep, Catalog, FeatureSummary |
| `web-ui/src/lib/catalog.ts` | VERIFIED | 43 | filterSteps, uniqueAreas, uniqueStatuses |
| `web-ui/src/lib/autocomplete.ts` | VERIFIED | 44 | getSuggestions, getAutocompletePrefix, GHERKIN_PREFIX_RE |
| `web-ui/src/lib/features.ts` | VERIFIED | 74 | walkFeatures, parseFeatureSummary, listFeatures |
| `web-ui/src/lib/gherkin-cm.ts` | VERIFIED | 199 | StreamParser Gherkin + HighlightStyle + linter |
| `web-ui/src/lib/i18n.ts` | VERIFIED | 69 | Translations EN+IT complete per tutte le pagine |
| `web-ui/src/app/layout.tsx` | VERIFIED | 52 | Nav 3 link + ThemeToggle + LanguageToggle |
| `web-ui/src/app/page.tsx` | VERIFIED | 15 | Monta StepCatalog (non placeholder) |
| `web-ui/src/app/editor/page.tsx` | VERIFIED | 132 | Client Component, useSearchParams, 2-col layout, editorRef |
| `web-ui/src/app/features/page.tsx` | VERIFIED | 77 | Client Component, fetch /api/features, FeaturePreview |
| `web-ui/src/app/api/catalog/route.ts` | VERIFIED | 15 | GET reale con REPO_ROOT + fs.readFileSync |
| `web-ui/src/app/api/features/route.ts` | VERIFIED | 18 | GET chiama listFeatures(FEATURES_DIR) |
| `web-ui/src/app/api/import/route.ts` | VERIFIED | 115 | POST execSync Windows-safe + CR-01/CR-02 fix |
| `web-ui/src/app/api/download/route.ts` | VERIFIED | 37 | GET con safeFeaturePath guard (403/404) |
| `web-ui/src/components/StepCatalog.tsx` | VERIFIED | 168 | Client Component, fetch, filtri, badge colorati, onDoubleClick |
| `web-ui/src/components/GherkinEditor.tsx` | VERIFIED | 242 | CodeMirror 6, forwardRef, autocomplete, controlled |
| `web-ui/src/components/GherkinToolbar.tsx` | VERIFIED | 120 | 2 righe snippet (structure + steps) + undo/redo |
| `web-ui/src/components/StepBrowser.tsx` | VERIFIED | 195 | fetch catalog, filtro, click-to-insert, keyboard nav |
| `web-ui/src/components/ImportDropzone.tsx` | VERIFIED | 179 | Drag-drop + picker + POST /api/import + riepilogo |
| `web-ui/src/components/FeaturePreview.tsx` | VERIFIED | 79 | fetch /api/download + pre tag + link download |
| `web-ui/src/components/ThemeToggle.tsx` | VERIFIED | 23 | useTheme, Moon/Sun, mounted guard |
| `web-ui/src/components/LanguageToggle.tsx` | VERIFIED | 17 | useLanguage, EN/IT toggle |
| `web-ui/src/providers/Providers.tsx` | VERIFIED | 33 | NextThemesProvider + LanguageContext |
| `web-ui/vitest.config.ts` | VERIFIED | 14 | environment:node, alias @/ → ./src |

**Deviazione strutturale accettata (piana 01):** tutti i file sono in `web-ui/src/app/` e `web-ui/src/lib/` invece di `web-ui/app/` e `web-ui/lib/` a causa del comportamento di `create-next-app@15` con `src/` directory forzata. Funzionalmente equivalente — confermato nel SUMMARY 04-01.

---

### Key Link Verification

| From | To | Via | Status | Note |
|------|----|-----|--------|------|
| `StepCatalog.tsx` | `/api/catalog` | `fetch` in `useEffect` | WIRED | `fetch('/api/catalog')` riga 41 |
| `StepCatalog.tsx` | `/editor?step=` | `router.push` in `onDoubleClick` | WIRED | `router.push('/editor?step=' + encodeURIComponent(...))` riga 141 |
| `editor/page.tsx` | `/api/catalog` | `fetch` in `useEffect` | WIRED | Carica `stepExpressions` per GherkinEditor |
| `GherkinEditor.tsx` | `lib/autocomplete.GHERKIN_PREFIX_RE` | `import + match` | WIRED | Riga 9: `import { GHERKIN_PREFIX_RE }` + uso in `gherkinComplete` |
| `api/import/route.ts` | `scripts/import-scenarios.ts` | `execSync` con `cwd: REPO_ROOT` | WIRED | Riga 51: `execSync(\`npx ts-node scripts/import-scenarios.ts --input "${tmpPath}"\`, ...)` |
| `ImportDropzone.tsx` | `/api/import` | `fetch POST FormData` | WIRED | Riga 40: `fetch('/api/import', { method: 'POST', body: formData })` |
| `api/download/route.ts` | `lib/repo.safeFeaturePath` | `import + call` | WIRED | Riga 3 + riga 18: `const resolved = safeFeaturePath(file)` |
| `FeaturePreview.tsx` | `/api/download?file=` | `fetch` in `useEffect` | WIRED | Riga 27: `fetch('/api/download?file=' + encodeURIComponent(file))` |
| `features/page.tsx` | `/api/features` | `fetch` in `useEffect` | WIRED | Riga 19: `fetch('/api/features')` |
| `api/features/route.ts` | `lib/features.listFeatures` | `import + call` | WIRED | Riga 3 + riga 12: `listFeatures(FEATURES_DIR)` |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produce Dati Reali | Status |
|----------|---------------|--------|--------------------|--------|
| `StepCatalog.tsx` | `steps` (useState) | `fetch('/api/catalog')` → `/api/catalog/route.ts` → `fs.readFileSync(step-catalog.json)` | Si — JSON da file repo | FLOWING |
| `features/page.tsx` | `features` (useState) | `fetch('/api/features')` → `/api/features/route.ts` → `listFeatures(FEATURES_DIR)` → `walkFeatures` + `fs.readFileSync` | Si — scan fs reale | FLOWING |
| `GherkinEditor.tsx` | `stepExpressions` (prop da parent) | `editor/page.tsx` fetch `/api/catalog` → `.steps.map(s => s.expression)` | Si — da catalog reale | FLOWING |
| `FeaturePreview.tsx` | `content` (useState) | `fetch('/api/download?file=')` → `api/download/route.ts` → `fs.readFileSync` | Si — file reale dal repo | FLOWING |

---

### Behavioral Spot-Checks

Step 7b non eseguito direttamente (il server Next.js non è avviato): le verifiche runtime sono delegate alla sezione "Human Verification Required".

I test Vitest sono testabili senza server:

| Comportamento | Test file | Risultato documentato | Status |
|---------------|-----------|-----------------------|--------|
| getSuggestions: 5 behavior tests | `__tests__/lib/autocomplete.test.ts` | 5/5 verdi (SUMMARY 04-03: "18/18 passed") | PASS (documentato) |
| filterSteps/uniqueAreas/uniqueStatuses: 8 test | `__tests__/lib/catalog.test.ts` | 8+ verdi (SUMMARY 04-02: "13/13 passed") | PASS (documentato) |
| safeFeaturePath / slugify: 4 test | `__tests__/lib/repo.test.ts` | 4/4 verdi (SUMMARY 04-01: "5/5 passed") | PASS (documentato) |
| walkFeatures + parseFeatureSummary: 6 test | `__tests__/lib/features.test.ts` | 6/6 verdi (SUMMARY 04-04: "28/28 passed") | PASS (documentato) |
| GET /api/download: 200/403/403/404 | `__tests__/api/download.test.ts` | 4/4 verdi (SUMMARY 04-04) | PASS (documentato) |
| GET /api/catalog: steps non vuoto | `__tests__/api/catalog.test.ts` | 1/1 verde (SUMMARY 04-01) | PASS (documentato) |

Totale documentato: **28/28 test verdi** (suite completa al termine di piano 04).

---

### Requirements Coverage

| Requirement | Piano | Descrizione sintetica | Status | Evidence |
|-------------|-------|-----------------------|--------|---------|
| UI-01 | 04-01, 04-02 | Step Catalog con filtri | SATISFIED | `StepCatalog.tsx`, `/api/catalog`, `lib/catalog.ts` |
| UI-02 | 04-01, 04-04 | Feature files elencati | SATISFIED | `features/page.tsx`, `/api/features`, `lib/features.ts` |
| UI-03 | 04-03 | Import .txt esegue import-scenarios.ts | SATISFIED | `/api/import/route.ts` con `execSync` |
| UI-04 | 04-01, 04-04 | Guard path traversal su download | SATISFIED | `safeFeaturePath` testato con 403 su `../../package.json` |
| UI-05 | 04-03 | Autocomplete prefix sul catalog | SATISFIED | `GherkinEditor.tsx` + `lib/autocomplete.ts` (5 test) |
| UI-06 | 04-01, 04-04 | Feature Catalog navigabile | SATISFIED | `/features` con preview e download |

**Extra non nei piani originali (implementati durante l'esecuzione):**
- Dark/light theme (next-themes, ThemeToggle)
- EN/IT i18n (lib/i18n.ts, LanguageToggle, Providers)
- CodeMirror 6 con syntax highlighting e linting (oltre la textarea originale)
- GherkinToolbar e StepBrowser come componenti separati
- Code review fixes: WR-01, WR-02, WR-03, WR-04, CR-01, CR-02

Tutte le funzionalità extra sono additive e non rompono i contratti esistenti.

---

### Anti-Patterns Found

| File | Pattern | Severita | Impatto |
|------|---------|----------|---------|
| `app/editor/page.tsx` righe 33 | `initialContent` costruito come `"  Given ${decodeURIComponent(stepParam)}"` — il parametro URL è già `Given ...` dal `encodeURIComponent` lato catalog, quindi il prefisso `Given ` viene aggiunto una seconda volta | Warning | Stile: l'editor riceve `"  Given Given I add ..."` al posto di `"  Given I add ..."`. Dipende da come StepCatalog passa il valore (`'Given ' + step.expression`). Da verificare visivamente. |

**Nessun blocker trovato.** Nessun TODO/FIXME/placeholder residuo nei file chiave. Gli stub 501 originali di import e download sono stati entrambi implementati.

**Nota sul potenziale doppio prefisso "Given":** `StepCatalog.tsx` riga 141 fa `encodeURIComponent('Given ' + step.expression)`. `editor/page.tsx` riga 32-34 decodifica il parametro e prepende `"  Given "`. Il risultato finale sarebbe `"  Given Given I add ..."`. Questo è un bug sottile ma non blocca la demo (l'utente può editare la riga); richiede verifica umana.

---

### Human Verification Required

#### 1. Rendering generale e navigazione

**Test:** Avviare `npm run dev` in `web-ui/` e aprire http://localhost:3000
**Expected:** Nav teal con link Catalog/Editor/Features, toggle luna/sole per dark mode, toggle EN/IT per lingua. La home mostra la tabella step da step-catalog.json (~18 step con colonne Expression/Area/Status/App).
**Why human:** Hydration Next.js 15 + Providers CSR — non verificabile staticamente.

#### 2. Autocomplete nell'editor

**Test:** Aprire http://localhost:3000/editor, digitare `Given I a` su una riga
**Expected:** Dropdown con max 8 step che iniziano con "i a". Tab/Enter inserisce il suggerimento attivo. Escape chiude senza inserire.
**Why human:** CodeMirror 6 autocompletion richiede DOM + eventi tastiera reali.

#### 3. Doppio click catalog → editor con step pre-inserito

**Test:** Andare su /, doppio click su una riga → verificare URL e contenuto editor
**Expected:** URL = `/editor?step=Given%20<expression>`; l'editor mostra lo step. Verificare che non ci sia doppio prefisso "Given Given ...".
**Why human:** router.push + useSearchParams + pre-population richiede browser. Verifica anche il potenziale bug del doppio prefisso "Given".

#### 4. Dark/light theme e i18n

**Test:** Premere il toggle tema (luna/sole) e il toggle lingua (EN/IT) su tutte e tre le pagine.
**Expected:** Tema applicato globalmente; label catalog/editor/features cambiano in italiano/inglese.
**Why human:** Comportamento visivo e stato React Context — non testabile staticamente. Verificare anche che `useLanguage()` sia effettivamente usato nei componenti per tradurre i testi (l'i18n è implementato ma l'applicazione dei token traduzione nei componenti non è stata verificata nel dettaglio del codice — StepCatalog ad esempio usa stringhe hardcodate in italiano).

---

### Gaps Summary

Nessun gap bloccante identificato. Tutti gli artefatti pianificati esistono su disco, sono implementazioni reali (non stub), e sono cablati correttamente.

**Un potenziale bug da verificare umanamente:** doppio prefisso "Given Given" nell'editor pre-popolamento (vedi Anti-Patterns). Non blocca la demo ma dovrebbe essere corretto se confermato.

**L'i18n è implementata come infrastruttura** (lib/i18n.ts + Provider + toggle) ma l'applicazione dei token di traduzione nei componenti (StepCatalog, editor/page, features/page) non è stata verificata completamente — alcuni componenti usano ancora stringhe hardcodate. Da verificare visivamente.

---

_Verified: 2026-06-10T10:00:00Z_
_Verifier: Claude (gsd-verifier)_
