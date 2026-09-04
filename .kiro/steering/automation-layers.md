---
inclusion: fileMatch
fileMatchPattern: 'src/**/*.ts'
---

# I quattro layer, e la regola che li tiene separati

```
features/    (.feature, Gherkin)      cosa fa il business
steps/       (glue sottile)           traduce la frase in una chiamata ad Action
actions/     (intenzioni business)    riusabile, NESSUN selettore
pages/, api/ (meccanica)              selettori, endpoint
```

**Ogni layer parla solo a quello sotto.** Uno step Gherkin chiama UNA action. Se
cambia la UI, si corregge una Page Object e nient'altro.

## La mappatura e' asimmetrica

Questo e' il punto che si sbaglia piu' spesso:

```
componente UI     ->  metodo di Page Object    1:1   MECCANICO, generabile
intento business  ->  step Gherkin             1:N   SEMANTICO, curato a mano
```

Un componente **non** corrisponde a uno step. Uno step di intento ne usa molti.
Generare uno step per elemento produce Gherkin imperativo e, su venti pagine,
centinaia di step atomici: piu' entropia di quanta se ne toglie.

## Le Page Object si scrivono dal dizionario, non a memoria

`npm run scout -- <url>` produce `reports/scout/<pagina>.json`: per ogni componente il
ruolo, il nome accessibile, il locator Playwright e un **giudizio di stabilita'**.

Quando scrivi una Page Object:

- **usa i locator del dizionario**, non inventarne;
- se un componente e' marcato `ambiguous`, il locator non e' univoco: serve un filtro
  o `.nth()`, e vale la pena dirlo a chi sviluppa la pagina;
- se e' marcato `unstable`, il nome contiene un dato variabile (data, id, importo):
  non costruirci sopra un locator, cerca un ancoraggio stabile;
- se e' `unnamed`, il componente non ha nome accessibile. **Segnalalo**: non e' solo
  scomodo da automatizzare, e' probabilmente invisibile a uno screen reader.

## Attese

```typescript
// CORRETTO — aspetta che l'elemento diventi visibile
await locator.waitFor({ state: 'visible' });

// SBAGLIATO come attesa — isVisible() legge lo stato attuale, non aspetta
await locator.isVisible({ timeout: 5000 });
```

Mai `waitForTimeout` come sincronizzazione: solo come ultima risorsa, e documentata.

## Documentare gli step

Ogni step definition porta un commento strutturato. `@intent` e' obbligatorio: il
generatore del catalogo lo legge e lo pubblica.

```typescript
/**
 * @intent  <Una frase. Verbo prima, presente, attivo. Meno di ~15 parole.>
 * @param   <nome> <Cos'e' e quali valori accetta.>
 * @pre     <Cosa deve essere vero prima.>
 * @post    <Cosa e' vero dopo.>
 */
```

Niente meccanica UI nell'`@intent`: descrive l'intenzione, non i click.
