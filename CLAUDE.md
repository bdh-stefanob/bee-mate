# Istruzioni per l'agente (Claude Code)

Leggi sempre prima di operare:
- `CONTRIBUTING.md` — regole architetturali (4 layer, step canonici, `@intent`, anti-rumore).
- `ROADMAP.md` — backlog, ordine di lavoro, cosa NON costruire.

## Regole non negoziabili

1. **Architettura 4 layer**: `features/` → `steps/` (glue sottile) → `actions/` (intenzioni business) → `pages/` (selettori). Ogni layer parla solo a quello sotto. **Mai selettori negli step.**
2. **Calibrazione deterministica**: i nuovi `.feature` devono riusare step da `step-catalog.json`. Step nuovi solo se l'utente (Steve) approva esplicitamente.
3. **`STEP_CATALOG.md` non si scrive a mano**: si rigenera con `npm run catalog`.
4. **Niente dati/flussi/nomi aziendali reali** in questo repo (e' pubblico/personale).
5. **Niente credenziali nel codice o nei commit**: token in `.env` (gitignored).

## Comandi quotidiani

```bash
npm test            # esegue gli scenari
npm run test:dry    # dry-run, valida step senza eseguire
npm run catalog     # rigenera STEP_CATALOG.md + step-catalog.json
```

## Workflow consigliato per richieste comuni

- **"Aggiungi feature/scenario per X"**: prima `npm run catalog`, poi proponi
  Gherkin riusando step esistenti. Step nuovi → flagga e chiedi conferma.
- **"Costruisci la UI / authoring portal"**: segui l'ordine in `ROADMAP.md`
  (5.1 catalog site e 5.2 validator prima di 5.6 semi-app).
- **"Refactor architetturale"**: chiedi conferma esplicita prima di rompere i 4 layer.

## Stile

- Risposte in **italiano**, dirette e concise (preferenza utente).
- Conventional Commits per i messaggi di commit (`feat:`, `fix:`, `chore:`, `docs:`, `test:`).
- Sii onesto sui limiti: se qualcosa non e' fattibile, dillo e proponi l'alternativa
  vera invece di assecondare.
