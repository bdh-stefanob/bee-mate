# Il catalogo degli step

`step-catalog.json` e' la **fonte di verita' macchina-leggibile**. `STEP_CATALOG.md` e'
la sua resa leggibile e **si rigenera** con `npm run catalog`: non modificarlo a mano,
le modifiche verrebbero sovrascritte.

## Come e' fatta una voce

| Campo | Significato |
|---|---|
| `expression` | La formulazione canonica, con i parametri come `{string}`, `{int}` |
| `keyword` | `Given` / `When` / `Then` |
| `app`, `area` | Dove vive lo step: applicazione e area funzionale |
| `page` | Pagina o componente di riferimento |
| `status` | `implemented` (usabile) · `wanted` (proposto, non approvato) · `deprecated` (non usare) |
| `replacedBy` | Per i `deprecated`: quale step usare al suo posto |
| `requester`, `assignee` | Chi l'ha chiesto, chi lo implementa |
| `paramEnums` | Valori ammessi per un parametro, quando sono un insieme chiuso |

## Da dove nascono le voci

**Dai cluster dei casi di test gia' scritti**, non da un design a tavolino. Si estrae
il corpus esistente, si normalizza, si raggruppano le frasi equivalenti: ogni cluster
diventa una voce candidata, con la variante piu' frequente come forma canonica e le
altre registrate come **alias**.

Gli alias sono il pezzo che fa funzionare l'adozione: quando qualcuno scrive una
variante nota, il validatore non dice "non conforme" — dice *"hai scritto una variante
di X, usa X"*. Suggerimento, non rifiuto.

Il catalogo nasce cosi' gia' pieno e gia' coerente con come il team scrive davvero: e'
l'unica versione che viene adottata invece che aggirata.

## Il flusso `@wanted`

1. Nessuno step esistente esprime l'intenzione.
2. Proponi **una** formulazione canonica. Una, non tre.
3. Taggala `@wanted` e fermati: serve l'approvazione del gatekeeper.
4. Approvata, si implementa e lo `status` passa a `implemented`.

Uno step `@wanted` puo' comparire in un `.feature` ma non e' eseguibile: serve a
rendere visibile la richiesta, non a scavalcare l'approvazione.

## Il confine fra te e il validatore

Tu proponi. Il validatore decide.

`npm run validate:steps` confronta ogni passo con le espressioni del catalogo. Match =
conforme. Nessun match = step nuovo, che richiede approvazione. Il controllo e'
deterministico e non dipende da te: e' li' apposta perche' la garanzia anti-entropia
non puo' poggiare su un sistema probabilistico.

Non aggirarlo, non anticiparne il giudizio, e non dichiarare conforme del lavoro che
non hai fatto validare.
