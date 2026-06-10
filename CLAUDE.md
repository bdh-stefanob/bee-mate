# Istruzioni per l'agente (Claude Code)

Leggi sempre prima di operare:
- `CONTRIBUTING.md` — regole architetturali (4 layer, step canonici, `@intent`, anti-rumore).
- `ROADMAP.md` — backlog, ordine di lavoro, cosa NON costruire.

## Regole non negoziabili

1. **Architettura 4 layer**: `features/` → `steps/` (glue sottile) → `actions/` (intenzioni business) → `pages/` (selettori). Ogni layer parla solo a quello sotto. **Mai selettori negli step.**
2. **Calibrazione deterministica**: i nuovi `.feature` devono riusare step da `step-catalog.json`. Step nuovi → proponi espressione, tagga `@wanted`, aspetta approvazione del team prima di implementare.
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

## Filosofia BDD adottata

Questo progetto segue due principi fondamentali della letteratura BDD:

### 1. Gherkin dichiarativo (non imperativo)
Gli scenari descrivono **l'intenzione dell'utente**, non la sequenza di click.

- **Imperativo** (da evitare): elenca ogni interazione UI → fragile, rumoroso, non leggibile dal business.
- **Dichiarativo** (standard): esprime cosa l'utente vuole ottenere → stabile, leggibile, documentazione viva.

Quando un sotto-flusso ha 3+ step UI sempre insieme, racchiudilo in un unico step di intent:
```gherkin
# IMPERATIVO — da evitare
And the user clicks on SMS verification
And the user clicks on Send code
And the user enters the code received by SMS
And the user clicks Verify button

# DICHIARATIVO — standard adottato
And the user completes SMS verification
```

Riferimento: *The Cucumber Book* (Wynne & Hellesøy) — cap. "Declarative vs Imperative".

### 2. Screenplay Pattern (livello codice)
Nei file `.steps.ts` e `.actions.ts` si usano tre livelli:

| Livello | Cos'è | Esempio |
|---------|-------|---------|
| **Step** (Gherkin glue) | Traduce la frase Gherkin in una chiamata Action | `When("the user completes SMS verification", ...)` |
| **Task / Action** | Intenzione business ad alto livello | `SmsVerification.complete()` |
| **Interaction** | Singola interazione UI atomica | `Click.on(smsButton)` |

Questo mappa direttamente ai 4 layer dell'architettura: `steps/` → `actions/` → `pages/`.

Riferimento: *Screenplay Pattern* (Serenity/JS docs) — serenity-js.org/handbook/design/screenplay-pattern.

## Stile

- Risposte in **italiano**, dirette e concise (preferenza utente).
- Conventional Commits per i messaggi di commit (`feat:`, `fix:`, `chore:`, `docs:`, `test:`).
- Sii onesto sui limiti: se qualcosa non e' fattibile, dillo e proponi l'alternativa
  vera invece di assecondare.
