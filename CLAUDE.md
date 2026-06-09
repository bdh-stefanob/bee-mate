# Istruzioni per l'agente (Claude Code)

Leggi sempre prima di operare, in quest'ordine:
- `PROJECT_BRIEF.md` — visione, ruoli, vincoli, stato attuale.
- `CONTRIBUTING.md` — regole architetturali (4 layer, step canonici, multi-app, step status).
- `WORKFLOW.md` — collaborazione QA manuale ↔ SDET, ciclo wanted/implemented/deprecated.
- `DOMAINS.md` — mappa apps/aree/pagine + naming convention.
- `ROADMAP.md` — backlog, ordine di lavoro, cosa NON costruire.

## Regole non negoziabili

1. **Architettura 4 layer**: `features/` → `steps/` (glue sottile) → `actions/` (intenzioni business) → `pages/` (selettori). Ogni layer parla solo a quello sotto. **Mai selettori negli step.**
2. **Multi-app pulito**: rispetta `src/<layer>/<app>/<area>/...`. Naming placeholder `app-a`, `app-b` (vedi DOMAINS.md). Step cross-app solo in `common/` se davvero universali.
3. **Calibrazione deterministica**: i nuovi `.feature` devono riusare step da `step-catalog.json`. Step nuovi solo se Steve approva esplicitamente; se la richiesta arriva da QA, usa il flusso `@wanted` (WORKFLOW.md).
4. **Status degli step**: ogni step e' `implemented` (default), `wanted` (stub con throw), o `deprecated` (con `@replacedBy`). Rispetta i tag JSDoc descritti in WORKFLOW.md.
5. **`STEP_CATALOG.md` non si scrive a mano**: si rigenera con `npm run catalog`. `step-catalog.json` e' committato (e' la SoT machine-readable).
6. **Niente dati/flussi/nomi aziendali reali** in questo repo (personale + potenzialmente pubblico).
7. **Niente credenziali nel codice o nei commit**: token in `.env` (gitignored).

## Comandi quotidiani

```bash
npm test            # esegue gli scenari
npm run test:dry    # dry-run, valida step senza eseguire
npm run catalog     # rigenera STEP_CATALOG.md + step-catalog.json
```

## Workflow consigliato per richieste comuni

- **"Aggiungi feature/scenario per X"**: prima `npm run catalog`, poi proponi
  Gherkin riusando step esistenti. Step nuovi → flagga, chiedi conferma a Steve,
  se approvati crea stub `@wanted` (WORKFLOW.md scenario B).
- **"Implementa step wanted X"**: ruolo SDET. Rimuovi `@wanted`, scrivi
  actions/pages necessari, aggiungi `@intent`/`@pre`/`@post`, apri PR.
- **"Costruisci la UI / extension VS Code"**: segui l'ordine in `ROADMAP.md`
  §5.6 (completion → diagnostics → tree view → quickfix → hover → PR opener).
- **"Aggiungi app-c / nuova area"**: aggiorna DOMAINS.md prima, poi crea le
  cartelle, poi i primi feature.
- **"Refactor architetturale"**: chiedi conferma esplicita, non rompere i 4 layer
  ne' la separazione multi-app.

## Stile

- Risposte in **italiano**, dirette e concise (preferenza utente).
- Conventional Commits per i messaggi di commit (`feat:`, `fix:`, `chore:`, `docs:`, `test:`).
- Sii onesto sui limiti: se qualcosa non e' fattibile, dillo e proponi l'alternativa
  vera invece di assecondare.
