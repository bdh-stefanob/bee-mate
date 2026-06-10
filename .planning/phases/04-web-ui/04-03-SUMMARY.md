---
phase: 04-web-ui
plan: "03"
subsystem: web-ui
tags: [next.js, gherkin-editor, codemirror6, autocomplete, import, tdd, typescript, toolbar, step-browser]
dependency_graph:
  requires:
    - web-ui/src/lib/types.ts (CatalogStep)
    - web-ui/src/lib/repo.ts (REPO_ROOT, slugify)
    - /api/catalog (GET — per caricare gli step nell'editor)
    - scripts/import-scenarios.ts (CLI eseguito via execSync)
    - "@lezer/highlight" (highlight tags per HighlightStyle — peer dep di @codemirror/language)
  provides:
    - web-ui/src/lib/autocomplete.ts (getSuggestions, getAutocompletePrefix)
    - web-ui/src/lib/gherkin-cm.ts (gherkinLanguage, gherkinTheme, gherkinLinter)
    - web-ui/src/components/GherkinEditor.tsx (CodeMirror 6, forwardRef handle)
    - web-ui/src/components/GherkinToolbar.tsx (struttura + step keywords + undo/redo)
    - web-ui/src/components/StepBrowser.tsx (ricerca inline + click-to-insert)
    - web-ui/src/components/ImportDropzone.tsx (drag-drop .txt → /api/import)
    - web-ui/src/app/api/import/route.ts (POST Windows-safe via execSync shell)
    - web-ui/src/app/editor/page.tsx (pagina /editor 2 colonne, ?step= fix)
  affects:
    - web-ui/src/app/editor/page.tsx (riscritta come Client Component, layout 2 col)
    - web-ui/src/app/api/import/route.ts (stub 501 → implementazione completa)
tech_stack:
  added:
    - "@codemirror/view ^6.43"
    - "@codemirror/state ^6.6"
    - "@codemirror/commands ^6.10"
    - "@codemirror/language ^6.12"
    - "@codemirror/autocomplete ^6.20"
    - "@codemirror/lint ^6.9"
  patterns:
    - TDD RED→GREEN per lib/autocomplete.ts (5 test behavior)
    - CodeMirror 6 StreamParser per Gherkin syntax highlighting
    - CodeMirror 6 HighlightStyle con CSS custom properties del design system
    - CodeMirror 6 linter custom (Diagnostic[]) senza librerie esterne
    - forwardRef + useImperativeHandle per GherkinEditorHandle (insertAtCursor, undo, redo)
    - execSync con shell stringa ('cmd.exe'|'/bin/sh') per compatibilità TypeScript
    - Client Component useSearchParams per ?step= pre-population
    - Two-column responsive layout (lg:w-2/3 editor | lg:w-1/3 step browser)
key_files:
  created:
    - web-ui/src/lib/autocomplete.ts
    - web-ui/src/lib/gherkin-cm.ts
    - web-ui/src/components/GherkinToolbar.tsx
    - web-ui/src/components/StepBrowser.tsx
    - web-ui/src/components/ImportDropzone.tsx
    - web-ui/__tests__/lib/autocomplete.test.ts
  modified:
    - web-ui/src/components/GherkinEditor.tsx (textarea → CodeMirror 6 + forwardRef)
    - web-ui/src/app/api/import/route.ts (stub → implementazione completa)
    - web-ui/src/app/editor/page.tsx (Server Component → Client Component, 2-col layout)
    - web-ui/package.json (aggiunte 6 dipendenze CodeMirror)
decisions:
  - "CodeMirror 6 sostituisce textarea custom — syntax highlighting + linting inline senza DOM manipulation manuale"
  - "StreamParser (StreamLanguage) per Gherkin — più semplice di un parser Lezer custom, sufficiente per line-based grammar"
  - "forwardRef + useImperativeHandle per GherkinEditorHandle — consente a toolbar e step browser di inserire testo senza prop drilling"
  - "editor/page.tsx convertita a Client Component ('use client') per useSearchParams + ref management — App Router non consente ref forwarding da Server Component"
  - "shell:'cmd.exe'|'/bin/sh' invece di shell:true — ExecSyncOptionsWithStringEncoding richiede string per shell, non boolean"
  - "StepBrowser duplica il fetch /api/catalog — consapevole, evita accoppiamento stato con parent"
metrics:
  duration: "~65 min (incluse task A-G)"
  completed_date: "2026-06-10"
  tasks_completed: 10
  files_created: 7
  files_modified: 4
---

# Phase 04 Plan 03: Gherkin Editor Summary

**One-liner:** Editor Gherkin CodeMirror 6 con syntax highlighting (teal/green/gray/orange), linter inline, autocomplete step dal catalog, toolbar struttura+step, StepBrowser ricercabile, layout 2 colonne, ?step= fix, ImportDropzone con POST /api/import Windows-safe.

---

## Tasks Completed

| # | Task | Commit | Files chiave |
|---|------|--------|-------------|
| 1 RED | Test failing getSuggestions autocomplete | `4d55991` (cherry-pick) | `__tests__/lib/autocomplete.test.ts` |
| 1 GREEN | getSuggestions + getAutocompletePrefix | `f0f2f5b` (cherry-pick) | `src/lib/autocomplete.ts` |
| 2 | POST /api/import execSync Windows-safe | `f6b7256` (cherry-pick) | `src/app/api/import/route.ts` |
| 3 | GherkinEditor textarea + ImportDropzone + page | `0a5f395` (cherry-pick) | `GherkinEditor.tsx`, `ImportDropzone.tsx`, `editor/page.tsx` |
| A | Install CodeMirror 6 packages | `c17409d` | `package.json`, `package-lock.json` |
| B | gherkin-cm.ts: StreamParser + HighlightStyle + linter | `f9e6d15` | `src/lib/gherkin-cm.ts` |
| C | GherkinEditor rewrite CodeMirror 6 + forwardRef | `7ad9fa8` | `src/components/GherkinEditor.tsx` |
| D | GherkinToolbar keyword quick-insert + undo/redo | `ae9b5ba` | `src/components/GherkinToolbar.tsx` |
| E | StepBrowser inline panel search + click-to-insert | `e732a44` | `src/components/StepBrowser.tsx` |
| F | editor/page.tsx: 2-col layout + ?step= + wiring | `ed195b9` | `src/app/editor/page.tsx` |
| G | tsc --noEmit + vitest run (4 file, 18 test) | — (no fix needed) | — |

---

## Verification Results

- `cd web-ui && npx tsc --noEmit` → exit 0 (nessun errore)
- `cd web-ui && npx vitest run` → 4 test file, 18 test, tutti verdi

**Checkpoint umano:** Verifica visiva su http://localhost:3000/editor

---

## Features Implementate

### CodeMirror 6 Syntax Highlighting
File: `web-ui/src/lib/gherkin-cm.ts`

| Token | Colore | Tag |
|-------|--------|-----|
| `Feature:` / `Scenario:` / `Background:` / `Rule:` / `Examples:` | teal `var(--primary)`, bold | `tags.keyword` |
| `Given ` / `When ` / `Then ` / `And ` / `But ` | verde `#22c55e` | `tags.definitionKeyword` |
| `# commento` | grigio muted, italic | `tags.lineComment` |
| `@tag` | arancione `var(--accent)` | `tags.typeName` |
| `\| tabella \|` | blu-ish oklch | `tags.string` |

### Gherkin Linter
- ERROR: step line fuori da un blocco Scenario/Background
- WARNING: Scenario senza step lines
- WARNING: documento senza `Feature:` declaration

### GherkinEditor (CodeMirror)
- `forwardRef` con `GherkinEditorHandle` (insertAtCursor, undo, redo, getView)
- Autocomplete: prefix-match sugli `stepExpressions` passati come prop, max 8, case-insensitive
- Line numbers + active line gutter
- History (undo/redo via Ctrl+Z / Ctrl+Y)
- Controlled value (sync bidirezionale value↔EditorView)
- Altezza minima 400px, font-mono

### GherkinToolbar
- Row 1: Feature, Scenario, Background, Scenario Outline, Examples (teal border)
- Row 2: Given, When, Then, And, But (green border) + `| table |` + Undo + Redo

### StepBrowser
- Fetch /api/catalog on mount
- Collapsible (Steps ▲/▼)
- Search Input in tempo reale (expression + area)
- Lista scrollabile max-height 300px con badge area + status
- Click → `onInsert("  Given " + expression)`
- Keyboard: ArrowUp/Down naviga, Enter inserisce

### editor/page.tsx (Client Component)
- Layout 2 colonne: lg:w-2/3 editor | lg:w-1/3 step browser + preview
- `useSearchParams()` per ?step= pre-population (fix rispetto a Server Component)
- `editorRef` condiviso tra toolbar (onInsert/undo/redo) e StepBrowser (onInsert)
- Feature Preview: `<pre>` del contenuto corrente
- Download .feature via Blob client-side

---

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] shell:'cmd.exe'|'/bin/sh' invece di shell:true**
- **Found during:** Task 2 (tsc --noEmit)
- **Issue:** `ExecSyncOptionsWithStringEncoding.shell` ha tipo `string | undefined` (non `boolean`). `shell: true` causa `TS2322`.
- **Fix:** `shell: process.platform === 'win32' ? 'cmd.exe' : '/bin/sh'`
- **Files modified:** `web-ui/src/app/api/import/route.ts`
- **Commit:** `f6b7256` (cherry-pick)

**2. [Rule 3 - Blocking] editor/page.tsx convertita a Client Component**
- **Found during:** Task F
- **Issue:** `useSearchParams()` e `useRef<GherkinEditorHandle>` non utilizzabili in Server Component. Il piano indicava Client Component ma il file originale era un Server Component async.
- **Fix:** Rimosso `async`, aggiunto `'use client'`, sostituito `searchParams` prop con `useSearchParams()`.
- **Files modified:** `web-ui/src/app/editor/page.tsx`
- **Commit:** `ed195b9`

**3. [Rule 3 - Blocking] Cherry-pick task 1-3 nel worktree branch**
- **Found during:** Inizio esecuzione
- **Issue:** Il branch `worktree-agent-a75572950751b3c3c` non aveva i commit delle task 1-3 (esistevano solo in `main`). Il worktree non aveva i file su disco.
- **Fix:** `git cherry-pick 4d55991 f0f2f5b f6b7256 0a5f395 c95265e` nel worktree branch.
- **Commit:** `da026ef`, `828b177`, `a016bfe`, `4163740`, `3970b04` (cherry-picks)

---

## Known Stubs

Nessun nuovo stub introdotto in questo piano. Stub da piano 01 ancora attivi:

| File | Descrizione | Piano |
|------|-------------|-------|
| `web-ui/src/app/api/download/route.ts` | GET restituisce 501 | Plan 04-04 |
| `web-ui/src/app/features/page.tsx` | Placeholder senza componente | Plan 04-04 |

---

## Threat Flags

Nessun nuovo surface di sicurezza oltre al threat model del piano.

- T-04-06 mitigato: `tmpPath = os.tmpdir() + 'import-' + Date.now() + '.txt'` — nessun input utente nel nome né nel comando shell.
- T-04-07 mitigato: `timeout: 30000` su execSync.
- T-04-09 mitigato: `?step=` inserito come valore controllato nell'editor, mai eval/dangerouslySetInnerHTML.

---

## Self-Check: PASSED

File chiave verificati:
- `web-ui/src/lib/autocomplete.ts` — FOUND
- `web-ui/src/lib/gherkin-cm.ts` — FOUND
- `web-ui/__tests__/lib/autocomplete.test.ts` — FOUND
- `web-ui/src/app/api/import/route.ts` — FOUND
- `web-ui/src/components/GherkinEditor.tsx` — FOUND
- `web-ui/src/components/GherkinToolbar.tsx` — FOUND
- `web-ui/src/components/StepBrowser.tsx` — FOUND
- `web-ui/src/components/ImportDropzone.tsx` — FOUND
- `web-ui/src/app/editor/page.tsx` — FOUND

TypeScript: `npx tsc --noEmit` → exit 0
Tests: `npx vitest run` → 18/18 passed
