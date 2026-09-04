---
inclusion: fileMatch
fileMatchPattern: 'src/**/*.ts'
---

# Architettura dell'automazione

```
features/          (.feature, Gherkin)   cosa fa il business
step-definitions/  (glue sottile)        traduce la frase in chiamate a Page Object
page-objects/      (meccanica)           selettori, attese, navigazione
```

**Tre layer, non quattro.** Gli step chiamano direttamente i metodi delle Page Object:
sono gia' quei metodi a esprimere l'intenzione (`clickFirstVisit`, `goToPatients`), non
serve un livello in mezzo.

Un layer `actions/` si introduce **solo** quando un'intenzione attraversa piu' Page
Object e la logica non appartiene a nessuna di esse. Finche' non succede, aggiungerlo
e' un livello di indirezione che non paga.

## La mappatura e' asimmetrica

Il punto che si sbaglia piu' spesso:

```
componente UI     ->  metodo di Page Object    1:1   MECCANICO, generabile
intento business  ->  step Gherkin             1:N   SEMANTICO, curato a mano
```

Un componente **non** corrisponde a uno step. Uno step di intento ne usa molti.
Generare uno step per elemento produce Gherkin imperativo e, su venti pagine,
centinaia di step atomici: piu' entropia di quanta se ne toglie.

## Page Object: constructor injection, niente singleton

```typescript
export class CheckoutPage extends BasePage {
    public async assertLoaded(): Promise<void> {
        await expect(this.page.getByRole('heading', { name: 'Checkout' })).toBeVisible();
    }
}
```

`BasePage` riceve `page` dal costruttore. **Mai singleton, mai `getInstance()`, mai
cache statiche**: e' una decisione presa dopo averne misurato il danno — l'istanza
statica sopravviveva fra scenari nello stesso worker e trascinava stato sporco nello
scenario successivo. Il `World` di Cucumber viene ricreato per ogni scenario, ed e' li'
che vive lo stato.

## Step definition: dichiarazione a livello modulo, init nel primo step

```typescript
// A livello di modulo: sopravvive fra uno step e l'altro dello stesso scenario
let visitsList: VisitsListPage;
let visitDetail: VisitDetailPage;

Given('the clinician is on the visits list', async function (this: CucumberWorld) {
    visitsList = new VisitsListPage(this.page);   // init nello step che possiede la transizione
    await visitsList.navigate();
    await visitsList.assertLoaded();
});

When('the clinician opens the first visit', async function (this: CucumberWorld) {
    visitDetail = await visitsList.clickFirstVisit();   // return-value chaining
});
```

Tre regole che vanno insieme:

- **`function (this: CucumberWorld)`**, mai arrow function: servono per `this`.
- **Niente init nei hook `Before`**: la Page Object si crea nello step che la introduce.
- **Return-value chaining**: un metodo che cambia pagina restituisce la Page Object
  successiva (`Promise<VisitDetailPage>`). Rende esplicita la transizione e toglie
  l'accoppiamento fra step.

Ogni Page Object espone `assertLoaded()`: la verifica che la pagina sia davvero quella
attesa, prima di interagirci.

## Le Page Object si scrivono dal dizionario, non a memoria

`npm run scout -- <url>` produce `reports/scout/<pagina>.json`: per ogni componente il
ruolo, il nome accessibile, il locator Playwright e un **giudizio di stabilita'**.

- **usa i locator del dizionario**, non inventarne;
- `ambiguous` = il locator non e' univoco: serve un filtro o `.nth()`, e vale la pena
  segnalarlo a chi sviluppa la pagina;
- `unstable` = il nome contiene un dato variabile (data, id, importo): cerca un
  ancoraggio stabile invece di costruirci sopra;
- `unnamed` = nessun nome accessibile. **Segnalalo**: non e' solo scomodo da
  automatizzare, e' probabilmente invisibile a uno screen reader.

## Attese

```typescript
// CORRETTO — aspetta che l'elemento diventi visibile
await locator.waitFor({ state: 'visible' });

// SBAGLIATO come attesa — isVisible() legge lo stato attuale, non aspetta
await locator.isVisible({ timeout: 5000 });
```

Per sondare senza far fallire, usa l'helper non lanciante di `BasePage`
(`isVisibleWithin`), non un try/catch scritto a mano ogni volta.

Mai `waitForTimeout` come sincronizzazione: solo come ultima risorsa, e documentata.

## Trappole note delle SPA

- Su framework che non espongono ruoli ARIA affidabili, `getByRole` non basta: usa gli
  attributi applicativi del framework.
- Un modale con `role="alertdialog"` **tronca l'albero di accessibilita'**: finche' e'
  aperto, `getByRole` non trova nulla fuori da lui. Chiudilo prima.
- I campi di pagamento di terze parti stanno in iframe separati: servono `frameLocator`
  e indici, non locator diretti.
- Un banner di consenso puo' intercettare i click: chiudilo in modo incondizionato e
  tollerante, non assumere che ci sia.

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
