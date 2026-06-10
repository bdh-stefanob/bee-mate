---
phase: 04-web-ui
plan: "03"
subsystem: web-ui
tags: [next.js, gherkin-editor, autocomplete, import, tdd, typescript]
dependency_graph:
  requires:
    - web-ui/src/lib/types.ts (CatalogStep)
    - web-ui/src/lib/repo.ts (REPO_ROOT, slugify)
    - /api/catalog (GET — per caricare gli step nell'editor)
    - scripts/import-scenarios.ts (CLI eseguito via execSync)
  provides:
    - web-ui/src/lib/autocomplete.ts (getSuggestions, getAutocompletePrefix)
    - web-ui/src/components/GherkinEditor.tsx (textarea + autocomplete dropdown)
    - web-ui/src/components/ImportDropzone.tsx (drag-drop .txt → /api/import)
    - web-ui/src/app/api/import/route.ts (POST Windows-safe via execSync shell)
    - web-ui/src/app/editor/page.tsx (pagina /editor con pre-popolamento ?step=)
  affects:
    - web-ui/src/app/editor/page.tsx (stub sostituito con componente reale)
    - web-ui/src/app/api/import/route.ts (stub 501 sostituito con implementazione)
tech_stack:
  added: []
  patterns:
    - TDD RED→GREEN per lib/autocomplete.ts (5 test behavior)
    - Custom dropdown autocomplete (zero librerie aggiuntive)
    - execSync con shell stringa ('cmd.exe'|'/bin/sh') per compatibilità @types/node
    - Client Component con useEffect fetch + useState per catalog loading
    - App Router searchParams async (Next.js 15 Server Component)
key_files:
  created:
    - web-ui/src/lib/autocomplete.ts
    - web-ui/src/components/GherkinEditor.tsx
    - web-ui/src/components/ImportDropzone.tsx
    - web-ui/__tests__/lib/autocomplete.test.ts
  modified:
    - web-ui/src/app/api/import/route.ts (stub → implementazione completa)
    - web-ui/src/app/editor/page.tsx (stub → pagina con GherkinEditor)
decisions:
  - "shell:'cmd.exe'|'/bin/sh' invece di shell:true — ExecSyncOptionsWithStringEncoding richiede string per shell, non boolean; funzionalmente identico"
  - "Autocomplete custom dropdown (zero librerie) — più semplice e affidabile di cmdk/react-textarea-autocomplete per questo use case"
  - "onBlur con delay 50ms per permettere click sul suggerimento prima della chiusura (Pitfall 5 RESEARCH)"
  - "editor/page.tsx usa searchParams async (Next.js 15 pattern) invece di useSearchParams hook lato client"
metrics:
  duration: "~25 min"
  completed_date: "2026-06-10"
  tasks_completed: 3
  files_created: 4
  files_modified: 2
---

# Phase 04 Plan 03: Gherkin Editor Summary

**One-liner:** Editor Gherkin con autocomplete custom prefix-match (TDD, 5/5 test), dropdown Tab/Enter/Escape, pre-popolamento da ?step=, ImportDropzone con POST /api/import Windows-safe (execSync shell stringa), preview + download .feature client-side.

---

## Tasks Completed

| # | Task | Commit | Files chiave |
|---|------|--------|-------------|
| 1 (RED) | Test failing per getSuggestions autocomplete | `4d55991` | `__tests__/lib/autocomplete.test.ts` |
| 1 (GREEN) | getSuggestions + getAutocompletePrefix | `f0f2f5b` | `src/lib/autocomplete.ts` |
| 2 | POST /api/import execSync Windows-safe | `f6b7256` | `src/app/api/import/route.ts` |
| 3 | GherkinEditor + ImportDropzone + editor/page.tsx | `0a5f395` | `src/components/GherkinEditor.tsx`, `src/components/ImportDropzone.tsx`, `src/app/editor/page.tsx` |

---

## Verification Results

- `cd web-ui && npm test -- autocomplete` → 5/5 test verdi (TDD GREEN)
- `cd web-ui && npm test` → 4 test file, 18 test, tutti verdi
- `cd web-ui && npx tsc --noEmit` → exit 0

**Checkpoint umano:** Task 4 — verifica visiva dell'editor su http://localhost:3000/editor

---

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] shell:'cmd.exe'|'/bin/sh' invece di shell:true**
- **Found during:** Task 2 (tsc --noEmit)
- **Issue:** `ExecSyncOptionsWithStringEncoding.shell` ha tipo `string | undefined` (non `boolean`). `shell: true` causa `TS2322: Type 'boolean' is not assignable to type 'string'`.
- **Fix:** Usato `shell: process.platform === 'win32' ? 'cmd.exe' : '/bin/sh'` — equivalente funzionale a `shell: true`, type-safe, cross-platform.
- **Files modified:** `web-ui/src/app/api/import/route.ts`
- **Commit:** `f6b7256`

---

## Known Stubs

Nessuno stub nuovo in questo piano. Gli stub da piano 01 ancora non implementati:

| File | Descrizione | Piano che la implementa |
|------|-------------|------------------------|
| `web-ui/src/app/api/download/route.ts` | GET restituisce 501 | Plan 04-04 |
| `web-ui/src/app/features/page.tsx` | Placeholder senza componente | Plan 04-04 |

---

## Threat Flags

Nessun nuovo surface di sicurezza oltre al threat model del piano.

- T-04-06 mitigato: `tmpPath = os.tmpdir() + 'import-' + Date.now() + '.txt'` — nessun input utente nel nome file né nel comando shell.
- T-04-07 mitigato: `timeout: 30000` su execSync — errore gestito nel catch con 500.
- T-04-09 mitigato: `?step=` inserito come `initialValue` in textarea controlled value — mai eval/dangerouslySetInnerHTML.

---

## Checkpoint Pending

Task 4 (`checkpoint:human-verify`) richiede verifica visiva su http://localhost:3000/editor.

**Comandi per la verifica:**
```bash
cd web-ui && npm run dev
```

Poi aprire http://localhost:3000/editor e verificare:
1. Textarea monospace, autocomplete compare scrivendo `Given I a`
2. Tab/Enter inserisce il suggerimento; Escape chiude
3. Torna al Catalog (/), doppio click → editor pre-popolato con ?step=
4. Import file .txt tramite drag-drop → editor carica il .feature + riepilogo "N step nuovi, M skippati"
5. Il file .feature scritto in `src/features/<area>/` del repo
6. "Download .feature" → scarica file Blob con nome slugificato

---

## Self-Check: PASSED

File chiave verificati:
- `web-ui/src/lib/autocomplete.ts` — FOUND
- `web-ui/__tests__/lib/autocomplete.test.ts` — FOUND
- `web-ui/src/app/api/import/route.ts` — FOUND
- `web-ui/src/components/GherkinEditor.tsx` — FOUND
- `web-ui/src/components/ImportDropzone.tsx` — FOUND
- `web-ui/src/app/editor/page.tsx` — FOUND

Commit verificati:
- `4d55991` — FOUND (test RED autocomplete)
- `f0f2f5b` — FOUND (autocomplete GREEN)
- `f6b7256` — FOUND (api/import)
- `0a5f395` — FOUND (GherkinEditor + ImportDropzone + editor page)
