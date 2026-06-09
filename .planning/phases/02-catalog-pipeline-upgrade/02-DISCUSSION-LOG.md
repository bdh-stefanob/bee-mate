# Phase 2: Catalog Pipeline Upgrade - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-09
**Phase:** 02-catalog-pipeline-upgrade
**Areas discussed:** Rendering STEP_CATALOG.md

---

## Rendering STEP_CATALOG.md

### Status visual presentation

| Option | Description | Selected |
|--------|-------------|----------|
| Badge emoji inline | Prefisso emoji davanti all'expression (🔧 wanted, ⛔ deprecated, nulla per implemented) | ✓ |
| Sezioni per status | Ogni dominio ha sotto-sezioni Implemented / Wanted / Deprecated | |

**User's choice:** Badge emoji inline
**Notes:** Semplice, cercabile con Ctrl+F, non verboso.

---

### Metadati step WANTED

| Option | Description | Selected |
|--------|-------------|----------|
| Intent + Requester/Assignee | @intent + riga con requester/assignee se compilati | ✓ |
| Solo indicatore WANTED | Solo badge, nessun metadato | |

**User's choice:** Intent + Requester/Assignee

---

### Metadati step DEPRECATED

| Option | Description | Selected |
|--------|-------------|----------|
| Intent + ReplacedBy | @intent originale + "Sostituito da: `<expr>`" | ✓ |
| Solo ReplacedBy | Solo link al sostituto | |

**User's choice:** Intent + ReplacedBy

---

### Header stats

| Option | Description | Selected |
|--------|-------------|----------|
| Breakdown per status | "Total: N steps (X implemented, Y wanted, Z deprecated)" | ✓ |
| Solo totale come ora | Solo documented/undocumented | |

**User's choice:** Breakdown per status
**Notes:** KPI utile per il team per monitorare backlog wanted.

---

## Claude's Discretion

- Demo @wanted step: espressione, area e contenuto delegati a Claude (Steve rivedere nella PR)
- Retrocompatibilità extension: optional fields + fallback a "implemented" per campi assenti
- Edge case path (`steps/common/`): `area: "common"`, `domain: "common"`
- Struttura commit e ordine operazioni durante refactor

## Deferred Ideas

- Filtro CLI `--only=wanted` per render-markdown.ts
- Contatore per dominio con breakdown status nell'header di sezione
