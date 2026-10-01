# Step Catalog

> **Auto-generated — do not edit by hand.**
> Source of truth: the step definitions in the code. Regenerated on
> every build. To change a step, change the code.

Last update: 2026-10-01T08:56:03.110Z
Total: **2** steps (2 implemented, 0 wanted, 0 deprecated)

## How to use

Before writing a new step in a `.feature`, **search here** (Ctrl+F) for
an existing step that matches the intent. If it exists, reuse the exact
expression. If it does not, flag it to the step gatekeeper.

---

## Domain: `common` (2 steps)

### `the page shows {string}`

Verifica che un elemento atteso sia visibile sulla pagina.

**Parameters:**
- `atteso` — Il nome accessibile, o il testo, dell'elemento.

_Source:_ `src\steps\common\verifica.steps.ts:21`

### `the user is logged in`

L'utente e' dentro l'applicazione: con una sessione valida non fa

_Source:_ `src\steps\common\accesso.steps.ts:18`

