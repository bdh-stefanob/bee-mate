# Confluence API — cosa e' accertato e cosa no

> Note di ricerca a supporto di `scripts/confluence-fetch.ts` e
> `scripts/lib/confluence-v2.ts`.
>
> **Perche' esiste questo file.** Il codice gira su un'istanza Confluence che chi
> lo ha scritto non ha mai visto. In quella condizione un'assunzione sbagliata e
> silenziosa e' l'esito peggiore possibile: non fallisce, restituisce numeri
> sbagliati. Qui sotto la riga di separazione fra "verificato sulla
> documentazione ufficiale" e "plausibile ma da confermare al primo run" e'
> tenuta esplicita apposta.
>
> Ricerca svolta il **2026-09-04**. Le API Atlassian Cloud cambiano: se qualcosa
> non torna, ricontrolla le fonti prima di dare la colpa al codice.

---

## 1. Le Folder: cosa sono

**Accertato.** Su Confluence **Cloud** la Folder e' un tipo di contenuto di prima
classe nell'albero, distinto dalla pagina, insieme a `whiteboard`, `database` ed
`embed`. Ha un id numerico come le pagine, un `title`, un `parentId` e un
`parentType`, ed e' indirizzabile con `GET /wiki/api/v2/folders/{id}`.

Prova diretta: l'OpenAPI ufficiale della v2 definisce lo schema `FolderSingle`
con i campi `id, type, status, title, parentId, parentType, position, authorId,
ownerId, createdAt, spaceId, version, _links`, e lo schema `ParentContentType`
come enum:

```
["page", "whiteboard", "database", "embed", "folder"]
```

Cioe': **una pagina puo' avere una folder come padre, e l'API v2 lo dichiara
esplicitamente nel campo `parentType`.** E' l'informazione su cui si regge tutta
la ricostruzione dell'albero fatta da `confluence-v2.ts`.

Fonti:
- OpenAPI v2 (scaricabile e ispezionabile): <https://dac-static.atlassian.com/cloud/confluence/openapi-v2.v3.json>
- Gruppo Folder: <https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-folder/>

**Accertato.** Su **Server / Data Center** le folder non esistono. Il riferimento
CQL di Server/DC elenca come tipi di contenuto solo `page`, `blogpost`,
`comment`, `attachment` — nessun `folder` — e la v2 (`/wiki/api/v2`) e' un
endpoint solo Cloud.
Fonte: <https://developer.atlassian.com/server/confluence/cql-field-reference/>

> Conseguenza sul codice: `detectV2()` non prova nemmeno la v2 quando la radice
> v1 rilevata **non** e' `/wiki/rest/api`. Su Server/DC il comportamento e'
> identico a prima di questa modifica.

---

## 2. CQL: `type` si', `ancestor` no

**Accertato — `type` supporta `folder` su Cloud.** La pagina "CQL fields" di
Confluence Cloud elenca per il campo `Type`: *"Supported content types are: page,
blogpost, comment, attachment, whiteboard, database, embed, folder"*.
Fonte: <https://developer.atlassian.com/cloud/confluence/cql-fields/>

**Accertato — `ancestor` NON funziona con id non-pagina.** La richiesta pubblica
CONFCLOUD-80607, *"Supporting Ancestor Function in CQL for Non-Page Content"*,
descrive esattamente il problema: *"the CQL option does not support the Ancestor
function for non-page content types such as whiteboards, databases, embeds, and
folders"*.
Fonte: <https://jira.atlassian.com/browse/CONFCLOUD-80607>

> Conseguenza sul codice: `--root <id-di-folder>` con la v1 restituisce
> legittimamente **zero risultati** anche con l'id giusto. Non e' un errore di
> battitura dell'utente: e' un limite dell'API. Per questo il fallback e'
> automatico e non un suggerimento a schermo.

**Accertato — la ricerca v1 non attraversa le folder.** Segnalazione con risposta
sulla community: `/wiki/rest/api/content/search` *"does not retrieve the pages
within folders"*; la risposta accettata indirizza agli endpoint v2 dei figli di
folder.
Fonte: <https://community.atlassian.com/forums/Confluence-questions/Unable-to-retrieve-pages-within-folders-using-the-REST-API/qaq-p/2951617>

> Questo e' il caso **piu' pericoloso dei due**, ed e' il motivo per cui il
> fetch non si limita a ripiegare sulla v2 quando la v1 torna vuota: se la v1
> restituisce qualcosa ma la v2 conta piu' pagine nello stesso sottoalbero, la
> v1 stava per produrre un export incompleto che sembrava completo. Lo script
> se ne accorge, lo dice, e passa alla v2.

---

## 3. API v2: gli endpoint che servono

Tutto quanto segue e' **accertato** leggendo direttamente l'OpenAPI ufficiale
(non la pagina HTML, che nasconde vincoli e default).
Base path: `https://{tenant}.atlassian.net/wiki/api/v2`.

| Endpoint | A cosa serve qui | Parametri verificati |
|---|---|---|
| `GET /spaces?keys=<KEY>` | space key → space **id** (la v2 indirizza per id) | `keys` max 250 valori; risposta include `homepageId` |
| `GET /spaces/{id}` | space id → key (per riempire `spaceKey` nell'export) | — |
| `GET /spaces/{id}/pages` | tutte le pagine di uno space | `depth` ∈ `all` (default) \| `root`; `limit` default 25, **max 250** |
| `GET /pages?space-id=<id>` | idem, con `parentId`/`parentType` | `space-id` max 100 valori; `limit` max 250 |
| `GET /pages?id=a,b,c&body-format=storage` | **corpi a blocchi** | `id` **max 250 valori**; `body-format` ∈ `storage` \| `atlas_doc_format` |
| `GET /pages/{id}`, `GET /folders/{id}` | che cos'e' questo id | `folders/{id}` ha `include-direct-children` (bool, default false) |
| `GET /{tipo}/{id}/descendants` | **tutto il sottoalbero, tipi misti** | `depth` default 2, **min 1, max 10**; `limit` max 250; `cursor` |
| `GET /{tipo}/{id}/direct-children` | figli diretti (qui non usato) | `limit` max 250 |
| `GET /{tipo}/{id}/ancestors` | catena di antenati | **restituisce solo `id` e `type`, senza `title`** |

`{tipo}` ∈ `pages | folders | whiteboards | databases | embeds`.

Scope OAuth dichiarato per i descendants: `read:hierarchical-content:confluence`.

Fonti:
- <https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-descendants/>
- <https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-children/>
- <https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-page/>
- <https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-space/>
- <https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-ancestors/>

### Perche' `/descendants` e non `/ancestors`

`/{tipo}/{id}/ancestors` sembrerebbe la via diretta per `pathTitles`, ma
restituisce **solo `id` e `type`**: servirebbe una chiamata per antenato solo per
sapere come si chiama. `/descendants` invece da' `id`, `title`, `type`,
`parentId` e `depth` per ogni nodo in una volta sola: l'albero si ricostruisce in
locale e i titoli ci sono gia'. Meno chiamate e nessun buco.

### Il campo `depth` della risposta

**Accertato.** Lo schema `DescendantsResponse` documenta `depth` come *"Depth of
the descendant in the content tree **relative to the content specified in the
request**"*. Era un difetto (CONFCLOUD-81371, risolto), oggi e' relativo.
Fonte: <https://jira.atlassian.com/browse/CONFCLOUD-81371>

> Conseguenza sul codice: `fetchDescendants` puo' fidarsi di `depth` per capire
> chi e' rimasto al bordo dei 10 livelli e ripartire da li'. Testato in locale:
> una catena di 25 livelli viene ricostruita per intero in 3 chiamate, con le
> profondita' corrette (10 → 20 → 25).

---

## 4. Paginazione v2 vs v1

**Accertato.**

| | v1 | v2 |
|---|---|---|
| Meccanismo | `start` + `limit` (offset) | **cursore opaco** |
| Dove sta il "prossimo" | `_links.next` | `_links.next` **e** header `Link` |
| Forma | URL relativo | URL **relativo**, es. `/wiki/api/v2/pages?limit=5&cursor=<token>` |
| Fine dei risultati | `next` assente | `next` assente **e** header `Link` assente |

Citazione dall'introduzione ufficiale: *"This relative URL will also be available
under the `_links.next` property of paginated responses"*, con esempio di header
`</wiki/api/v2/pages?limit=5&cursor=<cursor token>>; rel="next"`.
Fonte: <https://developer.atlassian.com/cloud/confluence/rest/v2/intro/>

> Conseguenza sul codice: `next` va riattaccato all'**origine del sito**
> (`https://tenant.atlassian.net`), non alla radice v2, altrimenti `/wiki`
> finisce doppio. E' quello che fa `resolveNext()` in `confluence-v2.ts`.
> Nel loop c'e' anche un contatore di sicurezza: un cursore che non avanza non
> deve poter girare all'infinito.

---

## 5. Cosa fa lo script, in breve

| Comando | Strada |
|---|---|
| `--discover` (senza space) | v1 `/space` — invariato |
| `--discover --space KEY` | censimento tipi con v1, poi **albero reale con v2** (folder + pagine annidate); se la v2 manca, ripiega sul vecchio elenco di rami |
| `--probe --root <id>` | v1 CQL; se torna vuoto → v2 (dichiarato a schermo) |
| `--fetch --root <id>` | v1 CQL; se vuoto → v2. Se la v1 torna qualcosa ma la v2 conta **piu'** pagine → avviso + v2 |
| `--fetch --space KEY` | **solo v1, invariato** — nessuna chiamata v2 (verificato sui log del server finto) |
| `--cql "..."` | solo v1: un CQL esplicito e' una scelta dell'utente, non si sostituisce |
| `--no-v2` | disattiva la strada v2, per riprodurre il comportamento v1 puro |

Come viene costruito l'albero in `--discover --space`:
1. tutte le pagine da `GET /pages?space-id=<id>` (hanno gia' `parentId` e `parentType`);
2. ogni `parentId` non ancora noto viene chiesto a `GET /folders/{id}`, che a sua
   volta dichiara il proprio padre → si risale finche' la chiusura e' completa
   (tetto di 500 lookup, dichiarato a schermo se scatta).

**Limite noto e dichiarato anche a schermo:** una folder **vuota** (o che contiene
solo whiteboard/database) non compare, perche' nessuna pagina la nomina come
antenato. Per la misura di entropia non serve; se un giorno servisse, la via e'
`GET /pages/{homepageId}/descendants`, che elenca anche i contenitori vuoti al
costo di una visita completa.

---

## 6. Da confermare al primo run reale

Queste cose **non** sono verificabili senza un'istanza vera. Sono elencate in
ordine di rischio.

## CONFERMATO SUL CAMPO (primo run reale)

Su uno spazio aziendale reale, `--discover --space` ha riportato:

```
ricerca v1  →  797 page
albero v2   →  826 pagine
```

**La ricerca v1 non vede 29 pagine su 826 (~3,5%).** L'ipotesi "la CQL non
attraversa le Folder" non e' piu' teorica: e' misurata. Senza la strada v2 e senza
il confronto fra le due, l'export sarebbe stato incompleto **senza produrre alcun
errore** — il caso peggiore, perche' avrebbe falsato ogni metrica a valle senza
lasciare traccia.

Confermato nello stesso run:
- le Folder esistono come tipo di contenuto distinto (105 nel censimento v1);
- l'albero v2 si ricostruisce correttamente e `--root` funziona con id di Folder;
- il censimento v1 **restituisce** righe di tipo `folder` (assunzione A5: vera).

| # | Assunzione | Come accorgersene | Se sbagliata |
|---|---|---|---|
| A1 | Il token e' un API token Cloud con scope sufficienti per la v2 (`read:page`, `read:folder`, `read:hierarchical-content`). Un token classico non-granulare dovrebbe ereditare i permessi dell'utente. | `--discover --space KEY` stampa `API v2 non disponibile: accesso negato alla v2 (403)…` | Rigenerare il token, o usare `--space` come ripiego (funziona in v1 puro) |
| A2 | `GET /pages?space-id=` restituisce **anche** le pagine annidate dentro folder, non solo quelle con padre-pagina. E' la premessa di tutto l'albero del discover. La documentazione dice "all pages in a space" e non menziona eccezioni, ma non l'ho visto girare. | Il numero di pagine dell'albero v2 e' molto minore del censimento v1 | Sostituire la sorgente con `GET /pages/{homepageId}/descendants` (stessa struttura dati, gia' supportata da `fetchDescendants`) |
| A3 | Chiedere `GET /pages/{id}` con l'id di una **folder** restituisce 404 (e non 200 con un oggetto strano). `resolveNode` prova i tipi in ordine e si affida a questo. | `--probe --root <folder>` dice "tipo page" su qualcosa che nell'UI e' una cartella | Invertire l'ordine dei tentativi in `resolveNode`, o discriminare sul campo `type` della risposta |
| A4 | La v1 `expand=ancestors` **non** elenca le folder fra gli antenati. Non l'ho trovato documentato in nessun senso. | Nell'export via strada v1, `pathTitles` salta un livello rispetto all'UI | Nessuna azione: la strada v2 calcola il percorso per conto suo e non dipende da questo |
| A5 | La CQL v1 `space = "KEY"` restituisce anche righe con `type: folder` (il censimento del discover ci conta). Il campo `type` supporta `folder`, ma `content/search` potrebbe filtrarle. | Il censimento v1 non mostra la riga `folder` anche se le folder esistono | Nessuna: e' solo informativo, l'albero vero arriva dalla v2 |
| A6 | CONFCLOUD-80607 risulta *Closed / Done* (risolto 2025-02-20). Se `ancestor` fosse stato esteso alle folder, `--root <folder>` funzionerebbe gia' in v1 e la v2 non servirebbe. **Non l'ho potuto verificare**: le suggestion Atlassian vengono chiuse "Done" anche quando sono duplicati o scartate. | `--root <folder>` restituisce risultati gia' dalla v1 | Nessuna: sarebbe una buona notizia, il codice usa comunque la v1 quando basta |
| A7 | Il campo CQL `parent = <id>` (documentato, diverso da `ancestor`) potrebbe funzionare con gli id di folder. Non l'ho verificato e non e' usato dal codice. | — | Eventuale semplificazione futura, non una correzione |

### Verifiche gia' fatte, e come

Contro un finto server Confluence in locale (albero `QA Home > Quality > Domains
> Clinic/Payments > pagine`, con la v1 volutamente cieca alle folder):

- `--discover --space QA` → stampa l'albero annidato con folder e pagine, e la
  tabella delle folder con il conteggio pagine ricorsivo;
- `--probe --root <folder>` → v1 vuota, fallback v2 dichiarato, testo estratto,
  percorso corretto;
- `--fetch --root <folder>` → 2 pagine, `pathTitles: ["Clinic"]`, `branch: Clinic`;
- `--fetch --root <pagina>` → v1 vede 1 pagina, la v2 ne conta 5 → avviso di
  export incompleto e passaggio automatico alla v2;
- `--fetch --space QA` → **nessuna chiamata v2** nei log del server finto;
- id inesistente → messaggio "ID INESISTENTE"; id con 403 → "PERMESSI";
  `--no-v2` → messaggio dedicato. Nessuno stack trace in nessun caso;
- `detectV2` sulle quattro condizioni (Server/DC, 401/403, 404, ok);
- paginazione a cursore e ricostruzione di una catena profonda 25 livelli
  (oltre il tetto `depth = 10`).
