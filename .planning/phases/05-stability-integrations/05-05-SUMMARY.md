---
phase: "05"
plan: "05"
subsystem: web-ui
tags: [layout, responsive, desktop, overflow, max-width, nav, codemirror]
dependency_graph:
  requires: [05-01, 05-04]
  provides: [layout-desktop-stable, nav-max-width, overflow-fixed]
  affects:
    - web-ui/src/app/layout.tsx
    - web-ui/src/app/page.tsx
    - web-ui/src/app/features/page.tsx
    - web-ui/src/components/StepCatalog.tsx
    - web-ui/src/components/StepBrowser.tsx
tech_stack:
  added: []
  patterns:
    - "max-w-screen-xl mx-auto per container desktop (1280px cap)"
    - "overflow-x-auto su wrapper tabella per scrollbar orizzontale controllata"
    - "overflow-hidden su StepBrowser per contenimento nel pannello laterale"
    - "GherkinEditor gia' aveva minHeight:400px — nessuna modifica necessaria"
key_files:
  created: []
  modified:
    - web-ui/src/app/layout.tsx
    - web-ui/src/app/page.tsx
    - web-ui/src/app/features/page.tsx
    - web-ui/src/components/StepCatalog.tsx
    - web-ui/src/components/StepBrowser.tsx
decisions:
  - "Nav header: wrapper div interno con max-w-screen-xl, nav esterno rimane full-width per il background color"
  - "features/page.tsx: rimosso h-full (causava potenziale overflow verticale su viewport corte) sostituito con layout flex colonna senza altezza fissa"
  - "StepCatalog: min-w-[600px] sulla Table + overflow-x-auto sul wrapper — la tabella ha una larghezza minima garantita e scrolla orizzontalmente se necessario"
  - "GherkinEditor non modificato: gia' conforme (minHeight:400px, nessun 100vh)"
metrics:
  duration_minutes: 20
  completed_date: "2026-06-10"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 5
  files_created: 0
---

# Phase 05 Plan 05: Desktop Layout Fix — max-w-screen-xl, overflow, nav

**One-liner:** Audit e fix responsiveness desktop 1280px+: nav header con max-w-screen-xl, container max-width su tutte le pagine, tabella Catalog con overflow-x-auto, StepBrowser con overflow-hidden, GherkinEditor gia' conforme.

---

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Audit e fix layout — editor, nav, container | a8439fd | web-ui/src/app/layout.tsx |
| 2 | Audit e fix pagine Catalog, Features, Settings + StepBrowser | 2ccda13 | web-ui/src/app/page.tsx, web-ui/src/app/features/page.tsx, web-ui/src/components/StepCatalog.tsx, web-ui/src/components/StepBrowser.tsx |

---

## What Was Built

### Task 1 — Nav header e audit editor

**Audit risultati:**
- `GherkinEditor.tsx`: gia' conforme — `minHeight: '400px'` nel tema CodeMirror e nel div wrapper, nessun `100vh`. Nessuna modifica applicata.
- `editor/page.tsx`: gia' conforme — `max-w-screen-xl mx-auto` presente sul container esterno. Nessuna modifica applicata.
- `layout.tsx`: il `<nav>` aveva padding e flex direttamente sull'elemento nav, senza cap della larghezza. **Fix applicato.**

**Fix `layout.tsx`:** Il `<nav>` ora ha struttura a due livelli:
- Esterno: `bg-teal-700 border-b` (full-width per il colore di sfondo)
- Interno: `div.max-w-screen-xl.mx-auto.px-6.py-3.flex.items-center.gap-6` (contenuto centrato con cap 1280px)

Questo pattern assicura che il nav appaia correttamente sia su schermi stretti (1280px) sia su wide screen (1920px+), mantenendo il colore di sfondo full-width e il contenuto allineato ai container delle pagine.

### Task 2 — Pagine e componenti

**`web-ui/src/app/page.tsx` (Catalog)**
- `container mx-auto` sostituito con `max-w-screen-xl mx-auto` — il container Tailwind non applica un cap specifico di 1280px, mentre `max-w-screen-xl` garantisce il limite preciso.

**`web-ui/src/app/features/page.tsx` (Features)**
- Aggiunto `max-w-screen-xl mx-auto` al container esterno
- Rimosso `h-full` (classe che poteva causare overflow verticale su viewport con altezza ridotta)

**`web-ui/src/components/StepCatalog.tsx`**
- Wrapper `<div className="rounded-lg border">` aggiornato a `overflow-x-auto rounded-lg border`
- `<Table>` aggiornato con classe `min-w-[600px]` per garantire larghezza minima prima dello scrolling orizzontale

**`web-ui/src/components/StepBrowser.tsx`**
- Wrapper radice aggiornato da `className="rounded-md border border-border bg-background"` a `overflow-hidden` aggiunto — impedisce che la lista step o il picker parametri trabocchino fuori dal pannello laterale

**`web-ui/src/app/settings/page.tsx`** — Non modificato: gia' conforme con `max-w-2xl mx-auto`.

---

## Decisions Made

1. **Nav a due livelli**: Separare il `<nav>` (full-width per background) dal wrapper interno (`max-w-screen-xl`) e' il pattern standard per nav con colore di sfondo esteso + contenuto centrato. Alternativa — `max-w` direttamente sul nav — avrebbe tagliato il colore di sfondo ai bordi del container.

2. **`h-full` rimosso da features/page.tsx**: `h-full` e' valido solo quando il parent ha un'altezza definita. In App Router Next.js il `<main>` non ha altezza fissa per default — `h-full` diventava inutile e potenzialmente problematico. Rimosso, il layout flex colonna funziona correttamente senza.

3. **`min-w-[600px]` su Table**: Senza larghezza minima, la tabella si comprime sotto i 600px invece di attivare lo scroll orizzontale del wrapper. Valore scelto in base alle 4 colonne (Expression 50%, Area, Status, App).

4. **GherkinEditor non modificato**: L'audit ha confermato che `minHeight: '400px'` era gia' presente in tre punti (tema `.&`, tema `.cm-scroller`, style del div wrapper). Il piano anticipava un fix qui, ma non era necessario.

---

## Deviations from Plan

### Auto-fix applicati

Nessuno.

### Differenze rispetto al piano

**1. [Audit — nessun fix] GherkinEditor gia' conforme**
- **Trovato durante:** Task 1 — lettura di GherkinEditor.tsx
- **Dettaglio:** Il piano anticipava che `height: '100vh'` potesse essere presente. L'audit ha trovato `minHeight: '400px'` correttamente impostato in tutti i punti rilevanti.
- **Azione:** Nessuna modifica — conformita' verificata e documentata.

---

## Checkpoint: human-verify

Il piano include un checkpoint `type="checkpoint:human-verify"` (Task 3) per la verifica visiva del layout desktop. I due task automatici precedenti sono stati completati e committati. Il checkpoint richiede verifica manuale a 1280px nel browser.

**Passi di verifica:**
1. `cd web-ui && npm run dev`
2. Aprire http://localhost:3000 in finestra da 1280px (DevTools Responsive)
3. Verificare ogni pagina: Catalog, Editor (2 colonne), Features, Settings
4. Allargare a 1920px: contenuto rimane centrato
5. Nav header: link sempre orizzontali, mai collassati

---

## Verification Results

```
cd web-ui && npx tsc --noEmit    → exit 0 (nessun errore)
cd web-ui && npx vitest run      → 6 test file, 28 test, tutti passati

grep "minHeight.*400" GherkinEditor.tsx      → 2 occorrenze (tema CM)
grep "100vh" GherkinEditor.tsx               → 0 occorrenze
grep "max-w-screen-xl" layout.tsx            → 1 occorrenza (wrapper nav interno)
grep "max-w-screen-xl" editor/page.tsx       → 1 occorrenza (container)
grep "max-w-screen-xl" app/page.tsx          → 1 occorrenza (container catalog)
grep "max-w-screen-xl" features/page.tsx     → 1 occorrenza (container)
grep "overflow-x-auto" StepCatalog.tsx       → 1 occorrenza (wrapper tabella)
grep "overflow-hidden" StepBrowser.tsx       → 1 occorrenza (wrapper radice)
```

---

## Known Stubs

Nessuno — le modifiche sono puramente presentazionali (classi CSS/Tailwind). Nessun dato, API o stato e' stato introdotto.

---

## Threat Flags

Nessuna nuova superficie di sicurezza introdotta. Le modifiche sono esclusivamente CSS/layout (classi Tailwind). Conforme a T-05-05-01 del threat model (truncate su testi — nessun dato sensibile nascosto nel DOM).

---

## Self-Check: PASSED

- [x] `web-ui/src/app/layout.tsx` — contiene `max-w-screen-xl` (riga 33)
- [x] `web-ui/src/app/page.tsx` — contiene `max-w-screen-xl` (riga 9)
- [x] `web-ui/src/app/features/page.tsx` — contiene `max-w-screen-xl` (riga 29)
- [x] `web-ui/src/components/StepCatalog.tsx` — contiene `overflow-x-auto` (riga 126)
- [x] `web-ui/src/components/StepBrowser.tsx` — contiene `overflow-hidden` (riga 136)
- [x] `web-ui/src/components/GherkinEditor.tsx` — nessun `100vh`, `minHeight: '400px'` presente
- [x] Commit a8439fd — esiste
- [x] Commit 2ccda13 — esiste
