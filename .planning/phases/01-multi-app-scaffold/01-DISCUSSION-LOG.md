# Phase 1: Multi-App Scaffold - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-09
**Phase:** 01-multi-app-scaffold
**Areas discussed:** app-b scope, catalog bridge, import paths

---

## app-b scope

| Option | Description | Selected |
|--------|-------------|----------|
| Directory vuote | Crea src/{features,steps,actions,pages}/app-b/ con .gitkeep. Zero codice. | ✓ |
| Stub .feature + step vuoto | Scenario @wip in app-b/ui/ che dimostra 2 app nel framework | |
| Copia scheletro da app-a | Replica struttura app-a con stub vuoti | |

**User's choice:** Directory vuote  
**Notes:** Minimo rumore, documenta la struttura. Nessun codice eseguibile in app-b per ora.

---

## Catalog bridge

| Option | Description | Selected |
|--------|-------------|----------|
| Fix minimale: domain = app | Aggiorna extract-steps.ts solo per path a 3 livelli, domain = "app-a" | ✓ |
| Nessuna modifica: accetta domain rotto | Lascia extract-steps.ts invariato, catalog con domain errato | |
| Fix completo: anticipa Phase 2 | Implementa app+area già in Phase 1 | |

**User's choice:** Fix minimale — domain = "app-a"  
**Notes:** Catalog funziona, success criterion rispettato. Phase 2 aggiungerà area e lifecycle.

---

## Import paths

| Option | Description | Selected |
|--------|-------------|----------|
| Relativi aggiornati | Mantieni import relativi, aggiorna path durante il move | ✓ |
| TypeScript path aliases | Aggiungi @app-a/* in tsconfig paths | |

**User's choice:** Import relativi  
**Notes:** Zero configurazione aggiuntiva. Path diventano più profondi (3 livelli) ma espliciti.

---

## Claude's Discretion

- Ordine delle operazioni durante il move
- Uso di `git mv` per preservare storia
- Struttura commit (uno o più commit atomici)

## Deferred Ideas

- Domain format completo (app/area) → Phase 2
- TypeScript path aliases → deciso di non aggiungere
- app-b con scenario funzionante → futura decisione
