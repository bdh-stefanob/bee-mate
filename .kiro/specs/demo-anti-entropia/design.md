# Design — Demo anti-entropia

Questo documento orienta. Il dettaglio di ogni scelta, con il suo perche', sta in
`docs/anti-entropy/`: `README.md` (fatti F1-F20, decisioni D1-D30), `02-design.md`,
`07-assistente.md`.

## La catena

```
  tester esegue a mano
         |  npm run record <bersaglio>
         v
  traccia semantica  -------------  dizionari delle pagine attraversate
  (role+name, URL,                   (inventariati durante la sessione)
   verifiche, passi nominati)
         |                                   |
         +-----------------+-----------------+
                           v   npm run generate
         feature + Page Object + step definition     <- deterministico, compila
                           |
                           v   reports/generate/<nome>/brief.md
         l'assistente porta le frasi nel catalogo    <- AI, vincolata
                           |
                           v
         tsc  .  dry-run  .  validate:steps           <- giudici deterministici
                           |
                           v   BDD_TARGET=<x> npm test
                       test verde
```

## Chi fa cosa

| Pezzo | Chi lo produce | Da cosa |
|---|---|---|
| Scheletro della Page Object | deterministico | URL della pagina |
| Un metodo per componente | deterministico | dizionario (1:1) |
| `assertLoaded()` | deterministico | verifiche registrate |
| Glue delle step definition | deterministico | forma fissa |
| **Frase Gherkin** | AI, vincolata | catalogo + etichetta del tester |
| **Quali metodi chiamare** | AI, vincolata | metodi generati |

Le ultime due righe sono le sole in cui serve un modello. Tutto il resto e'
sostituzione di stringhe sui modelli in `templates/`. Conseguenza: se l'assistente non
c'e' o delude, resta un test verde scritto con le parole di chi l'ha eseguito.

## I due giudici

```
Gherkin  ->  validatore del catalogo   la frase esiste? e' una variante nota?
Codice   ->  compilatore TypeScript    il metodo esiste? il tipo torna?
```

L'assistente non puo' inventare in nessuna delle due direzioni senza essere preso, e
nessuno dei due giudici costa niente: c'erano gia'.

## Il catalogo e l'aggancio

La mappatura e' asimmetrica: componente -> metodo e' 1:1 e meccanico; intento -> step
e' 1:N e semantico. **Un componente non e' uno step**: generarne uno per elemento
produrrebbe Gherkin imperativo e piu' entropia di quanta se ne toglie.

I candidati di catalogo per un passo si scelgono in due classi, mai sommate:

1. step che dichiarano gli **stessi componenti** toccati dal tester — identita';
2. step con **formulazione simile** — stima.

Oggi nessuno dei 100 step del catalogo e' ancorato a componenti: la prima classe e'
sempre vuota, ed e' il limite principale del risultato (task 6).

## Dove vive cosa

| Cosa | Dove |
|---|---|
| Registrazione | `scripts/record.ts`, `lib/recorder-overlay.ts`, `lib/labelling.ts` |
| Inventario | `lib/inventory.ts` (usato da `scout.ts` e da `record.ts`) |
| Generazione | `scripts/generate.ts`, `lib/generate-core.ts`, `lib/generate-emit.ts`, `lib/generate-brief.ts` |
| Forma del codice generato | `templates/*.tmpl` |
| Base delle Page Object | `src/support/base.page.ts` |
| World, bersagli, sessioni | `src/support/world.ts`, `lib/targets.ts`, `scripts/session.ts` |
| Misure | `scripts/benchmark.ts`, `lib/benchmark.ts`, `scripts/benchmark-arena.ts` |
| Referto committabile | `scripts/referto.ts` -> `referti/` |
| Diagnosi della macchina | `scripts/diagnosi.ts`, `scripts/targets.ts` |
| Controlli | `scripts/lib/*.check.ts`, tutti in `npm run check:all` |

## Cosa e' stato misurato sull'applicazione vera

Solo numeri; il dettaglio e' in `referti/`.

- **Pagine di lavoro** (area riservata, passo di questionario): accessibilita'
  **88-90%**. L'automazione per ruolo+nome regge.
- **Pagine di contenuto** del sito vetrina: **72-75%**, per link duplicati (menu
  doppi) e riferimenti bibliografici il cui testo e' l'URL.
- Un passo del questionario ha **4 campi numerici senza etichetta**: il loro nome
  accessibile e' il valore ("0"). Per l'automazione servono filtri; per uno screen
  reader sono campi muti. E' l'argomento da portare agli sviluppatori.
- **Prima registrazione vera**: 38 gesti, 0 confini, 0 verifiche. Ha motivato la
  nominazione dei passi a fine sessione e le verifiche sui testi.
- L'assistente, interrogato da riga di comando, ha citato correttamente la regola 1:
  le regole `always` sono davvero in contesto.

## Decisioni aperte che il design aspetta

| Decisione | Opzioni | Chi decide |
|---|---|---|
| Percorso vetrina -> applicazione su due domini | A) un indirizzo per dominio nel bersaglio · B) due registrazioni separate | il tester, sapendo com'e' fatto il flusso |
| `/questions/N`: id o passo? | A) id: una Page Object per tutte le domande · B) passo: una per domanda, via configurazione | il tester, sapendo se le domande sono diverse |
| Architettura a 3 o 4 layer | `CLAUDE.md` dice 4; il POC aziendale e le regole 3 | chi possiede `CLAUDE.md` |
| Amazon Q resta disponibile? | se no, la cartella sorgente `.amazonq/` va rinominata | l'azienda |
