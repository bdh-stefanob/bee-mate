# Boots BDD — Convenzioni Gherkin

Riferimento per i QA author e gli strumenti AI che scrivono file `.feature` per la suite Boots.

---

## 1. Struttura dell'app

```
Brochure (app)          sito marketing / area pubblica di boots.com
Clinic (app)
  ├── auth              login, registrazione, 2FA
  ├── weight-loss       questionario clinico + selezione medicinale
  ├── hair-loss
  ├── acne
  └── ...               altri servizi Clinic
```

I journey cross-dominio (es. utente parte da Brochure → approda su Clinic) vanno in
`brochure-clinic/`. Tutto il resto vive nella cartella della propria app.

```
src/features/<app>/<servizio>/<scenario>.feature
src/steps/<app>/<servizio>/<scenario>.steps.ts
```

---

## 2. Given / When / Then — la regola principale

| Keyword | A cosa risponde | Segnale |
|---------|-----------------|---------|
| `Given` | *Da dove parte il test?* | Precondizione. Stato dichiarativo. Non descrive mai come l'utente ci è arrivato. |
| `When`  | *Cosa fa intenzionalmente l'utente?* | Azione dell'utente con uno scopo: click, selezione, inserimento, invio. |
| `Then`  | *Cosa ha fatto il sistema come risultato?* | Esito osservabile: cambio pagina causato da un redirect, messaggio di successo/errore, aggiornamento dati. |
| `And`   | *Continua il keyword precedente* | Concatena più azioni o più esiti. |

**Regola di navigazione — il test pratico:**

> Se l'utente *ha scelto* di andare da qualche parte → `When`.  
> Se il sistema *ha portato* l'utente da qualche parte → `Then`.  
> Se il test *parte* da lì → `Given`.

```gherkin
# L'utente ha cliccato Login di proposito → When
When the user clicks the Login button

# Il sistema ha fatto il redirect dopo l'autenticazione → Then
Then the user is on the "My Account" page

# Il test inizia su questa pagina, non ci interessa come ci è arrivato → Given
Given the user is on the Brochure home page
```

**Errore comune — non mischiare gli esiti nella catena di azioni:**
```gherkin
# SBAGLIATO — l'arrivo sulla pagina è infilato dentro il blocco When
When the user clicks the Login button
And the user lands on the Clinic login page   ← redirect di sistema, appartiene a Then
And the user enters valid login credentials

# CORRETTO — il redirect è un esito, poi l'azione successiva si costruisce su di esso
When the user clicks the Login button
Then the user is on the "Clinic login" page
When the user enters valid login credentials on the "Clinic login" page
And the user completes SMS verification
Then the user is successfully logged in
And the user is on the "My Account" page
```

---

## 3. Best practice per scrivere gli step

**Formato:** `the user [verbo] [oggetto] [contesto opzionale]`

Usare il sentence case (solo prima lettera maiuscola). Gli step in ALL CAPS vanno
convertiti nel formato parametrico indicato di seguito: il contesto di pagina
diventa un parametro `{string}`.

**Verbi consigliati:**

| Verbo | Quando usarlo |
|-------|---------------|
| `is on the` | stato iniziale o esito di un redirect |
| `clicks` | singolo bottone o link |
| `selects` | radio button, opzione checkbox, dropdown, voce di lista |
| `enters` | campo testo, valore numerico |
| `completes` | flusso multi-step incapsulato (es. verifica SMS) |
| `flags` | checkbox da spuntare obbligatoriamente |
| `confirms` | azione di conferma / prosegui |

**Astrarre i sotto-flussi ripetitivi:**  
Se un flusso ha 3+ step che compaiono sempre insieme, racchiuderli in un unico step.
```gherkin
# SBAGLIATO — fragile, si rompe se la UI cambia
And the user clicks on SMS verification
And the user clicks on Send code
And the user enters the code received by SMS
And the user clicks Verify button

# CORRETTO — l'intenzione è chiara, il dettaglio implementativo è nascosto
And the user completes SMS verification
```

**Usare parametri `{string}` per i valori che variano:**
```gherkin
# Invece di uno step per ogni opzione:
When the user selects "Pancreatitis" on the "Bowel and Gut Conditions" questionnaire page
When the user selects "None of the above" on the "Bowel and Gut Conditions" questionnaire page

# Un unico step parametrico copre tutte le opzioni su tutte le pagine:
the user selects {string} on the {string} questionnaire page
```

**Usare Scenario Outline per variazioni di dati:**
```gherkin
# SBAGLIATO — uno scenario per ogni medicinale:
Scenario: Wegovy 0.25mg con coaching
Scenario: Wegovy 0.5mg senza coaching

# CORRETTO — un unico outline, tutte le combinazioni nella tabella:
Scenario Outline: Selezione medicinale e piano coaching
  When the user selects medicine "<medicine>" with quantity "<quantity>" and coaching "<coaching>"
  Examples:
    | medicine | quantity | coaching |
    | Wegovy   | 0.25mg   | with     |
    | Wegovy   | 0.5mg    | without  |
```

---

## 4. Catalogo step disponibili

### Common (condivisi tra tutte le app)
| Espressione | Tipo |
|-------------|------|
| `the user is on the {string} page` | Given / Then |
| `I am logged in as a {string} user` | Given |

### Brochure → Clinic (autenticazione cross-dominio)
| Espressione | Tipo |
|-------------|------|
| `the user is on the Brochure home page` | Given |
| `the user clicks the Login button` | When |
| `the user enters valid login credentials on the {string} page` | When |
| `the user completes SMS verification` | When |
| `the user is successfully logged in` | Then |

### Clinic — Questionario Weight Loss
| Espressione | Tipo |
|-------------|------|
| `the user selects {string} from the popular services menu` | When |
| `the user clicks {string} on the {string} service page` | When |
| `the user selects {string} as their service status` | When |
| `the user selects medicine {string} with quantity {string} and coaching {string}` | When |
| `the user confirms the medicine selection` | When |
| `the user flags the consent checkbox and continues on the {string} page` | When |
| `the user enters height {string} in {string} and weight {string} in {string}` | When |
| `the user selects {string} on the {string} questionnaire page` | When |
| `the user selects {string} and enters {string} on the {string} questionnaire page` | When |
| `the user clicks next on the {string} questionnaire page` | When |

---

## 5. Tag

| Tag | Significato |
|-----|-------------|
| `@smoke` | Deve passare prima di qualsiasi deploy |
| `@brochure-clinic` | Journey cross-dominio Brochure → Clinic |
| `@auth` | Flussi di autenticazione |
| `@weight-loss` | Servizio Weight Loss |
| `@questionnaire` | Questionario multi-pagina |
| `@medicine-selection` | Selezione del medicinale |
| `@wanted` | Lo scenario usa step non ancora implementati |

---

## 6. Proporre nuovi step

1. Scrivi lo scenario con l'espressione di cui hai bisogno.
2. Taggalo `@wanted`.
3. Apri una PR o una discussione in modo che il team possa valutare la nuova espressione.
4. Una volta approvato, lo step viene implementato e `@wanted` viene rimosso.

Controlla prima il catalogo: `npm run catalog` rigenera `STEP_CATALOG.md`.

---

## 7. Usare questo documento con un'AI

1. Incolla questo file come contesto all'inizio della conversazione.
2. Aggiungi la sezione rilevante da `STEP_CATALOG.md`.
3. Descrivi il journey utente in linguaggio naturale.
4. Chiedi: *"Scrivi uno scenario Gherkin seguendo le convenzioni Boots indicate sopra."*

L'AI userà i template parametrici della sezione 4, applicherà la regola di
navigazione Given/When/Then della sezione 2 e marcherà gli step sconosciuti con `@wanted`.

> L'enforcement inline in VS Code (autocomplete + linting rispetto a queste convenzioni)
> è tracciato separatamente nel roadmap del progetto.
