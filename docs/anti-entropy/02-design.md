# 02 — Design del sistema

> **Stato (2026-09-24):** la Sezione 1 e' l'architettura adottata. Le sezioni 2-7
> non sono state scritte qui come design: i blocchi sono stati costruiti e
> documentati ciascuno nel suo file, indicato sotto. Il quadro d'insieme
> aggiornato e' in [`../OVERVIEW.md`](../OVERVIEW.md).

---

## Approccio scelto: B — Osservatorio + Oracolo

Erano sul tavolo tre approcci:

| | Contenuto | Costo | Rischio demo | Dipendenze esterne |
|---|---|---|---|---|
| **A — Osservatorio** | Solo P1: misura + catalogo + linee guida | ~3-4 gg | quasi nullo | zero |
| **B — Osservatorio + Oracolo** ✅ | A + libreria .md/AI + scout + 1 scenario end-to-end | ~8-10 gg | medio, isolato | tool AI, ambiente QA |
| **C — Pipeline completa** | + authoring UI, scrittura su Jira, gate CI, run in pipeline | settimane | alto | 3 approvazioni |

**Scelto B**, con **A costruito per primo come nucleo autoconsistente**: se il giorno
della demo il tool AI non parte o l'ambiente e' giu', si mostra A e la presentazione
regge lo stesso. Nessun single point of failure.

**C resta una slide di roadmap, non codice.** Costruirlo significherebbe arrivare alla
demo con tutto al 70% invece che con una cosa al 100%.

---

## Sezione 1 — Architettura e confini

### I quattro blocchi

```
         CONFLUENCE  ── dove i tester scrivono oggi, e continueranno a scrivere
                │  read-only (REST + CQL). L'albero space → pagina → figlie
                │  e' indirizzabile: `ancestor = <pageId>` = la "master folder"
                ▼
   ┌────────────────────────────┐
   │ 1. OSSERVATORIO            │  parsing tollerante → normalizzazione
   │    "quanta entropia c'e'"  │  → clustering per similarita'
   └──────────┬─────────────────┘  → METRICHE + CANDIDATI STEP
              │  curation (gatekeeper: una sessione, non un processo continuo)
              ▼
   ┌────────────────────────────┐
   │ 2. CENTRO DI VERITA'       │  step-catalog.json + glossario + linee guida
   │    "come si scrive"        │  ripubblicato IN CONFLUENCE, dove i tester
   │                            │  gia' sono (nessun nuovo strumento)
   └──────────┬─────────────────┘
              │ consumato da
      ┌───────┴────────┐
      ▼                ▼
┌──────────────┐  ┌───────────────────┐
│ 3. ORACOLO   │  │ 4. MOLTIPLICATORE │
│  libreria .md│  │  scout → dizionario│
│  + tool AI   │  │  pagine/componenti │
│  assiste la  │  │  → POM             │
│  scrittura   │  │                    │
└───────┬──────┘  └─────────┬─────────┘
        └────────┬──────────┘
                 ▼
        ┌──────────────────┐
        │ VALIDATORE       │  deterministico, unico gate
        │ conforme? si'/no │  + "intendevi questo step?"
        └──────────────────┘
```

### Il principio portante

L'AI (blocco 3) e la generazione (blocco 4) sono acceleratori **probabilistici**; il
validatore e' l'unica garanzia ed e' **deterministico**. L'AI non valida mai se stessa:
produce, e il validatore giudica. E' `ROADMAP.md` §2 applicato a un contesto senza
automazione.

### Le interfacce tra i blocchi

Una sola, e **esiste gia'**: `step-catalog.json`, schema v2 di questo scaffold
(`app`, `area`, `status`, `replacedBy`, `requester`, `assignee`, `paramEnums`, tag
lifecycle `@wanted` / `@deprecated`). Ogni blocco lo legge o lo scrive; nessuno conosce
gli interni degli altri.

Conseguenze pratiche:

- i blocchi si costruiscono, si dimostrano e si rompono **indipendentemente**;
- se il blocco 3 salta in demo, gli altri tre non se ne accorgono;
- **buona parte del blocco 2 e' gia' costruita** (generatore `STEP_CATALOG.md`, web-ui,
  estensione VS Code, schema, tag lifecycle). Il lavoro nuovo e' quasi tutto nel blocco 1.

### Il ribaltamento rispetto alla proposta iniziale

Poiche' i test case sono **scritti ma non automatizzati** (F1) e vivono in pagine wiki
libere senza plugin di test management (F2, F3b), il catalogo non puo'
essere generato dal codice come previsto in `CONTRIBUTING.md` ("generated from code,
never written by hand"). Diventa **contract-first**: e' il catalogo la sorgente, e
l'automazione — quando arrivera' — ne e' un *consumer*.

Non e' un ripiego: e' lo stesso modello di un'API contract-first, e da' un argomento
pulito in presentazione ("gli step sono un contratto approvato; l'automazione lo
implementa"). Ma **rompe un principio scritto del progetto** e come tale va dichiarato.

Secondo ribaltamento, sulla sequenza:

> **Fase 1 = misurare, non imporre.** Un job legge le pagine da Confluence, le normalizza,
> li confronta col catalogo e produce un report. Nessuno cambia strumento, nessuno cambia
> abitudine, zero attrito, zero costo — e si ottiene il numero "prima" il giorno stesso.
> Fase 2 = si pubblicano catalogo e linee guida. Fase 3 = si rimisura.
> La riduzione di entropia diventa un grafico, non un'opinione.

### Il ruolo reale di scout/codegen in un contesto senza automazione

Non semina step (vedi `01-analisi-criticita.md` §2). Semina il **dizionario di risorse
e pagine**: per ogni pagina, l'elenco `role` + `name` degli elementi realmente presenti.

Quello e' il vocabolario **ancorato alla realta'** su cui l'assistente AI propone step
che esistono davvero sulla pagina, invece di inventarli. E' il ponte fra P2 e P1, ed e'
la parte originale della proposta.

### Confini — cosa NON e'

Questa e' una slide, non una nota a pie' di pagina. Senza, i senior sentono "tool interno
da manutenere per sempre".

- **Non sostituisce Jira ne' il test management tool.** I tester continuano a scrivere
  dove scrivono.
- **In Fase 1 non scrive su Confluence.** Sola lettura. Azzera meta' delle domande di
  rischio prima che vengano fatte.
- **Non e' un framework di automazione.** L'automazione e' un consumer del catalogo,
  eventuale e successivo.
- **Non richiede accesso al repo per tutti.** Il catalogo si ripubblica in Confluence,
  dove i tester sono gia'.
- **Non dipende da un vendor AI specifico.**
- **Non e' un progetto full-time.** Nucleo: qualche centinaio di righe, zero server,
  zero licenze.

---

## Sezione 2 — Osservatorio

🟡 *Primo stadio costruito, il resto da discutere.*

**Fatto** — lettura ed estrazione (`scripts/confluence-fetch.ts` + `scripts/lib/atlassian.ts`):

- `--discover` risolve il problema "non so dove sono le pagine": elenca gli space, poi
  l'albero dello space con id e conteggi per ramo.
- `--probe` verifica su una pagina reale che l'estrazione funzioni, prima di scaricare tutto.
- `--fetch` scarica il sottoalbero e aggrega **per ramo**, non solo in totale: e' la
  differenza fra "abbiamo entropia" e "l'area X ha un problema che l'area Y non ha".
- Lo storage format di Confluence viene appiattito gestendo i tre posti dove il Gherkin
  finisce davvero: macro di codice (CDATA), paragrafi con `<br/>`, celle di tabella.
  Copertura verificata da `npm run check:extract`.

**Da discutere** — normalizzazione, algoritmo di clustering, formato delle metriche,
derivazione dei candidati step e degli alias.

## Sezione 3 — Centro di verita'

➡️ *Costruito, documentato altrove.* Catalogo con alias, Gold e componenti:
`../STEP-LIFECYCLE.md`, decisioni D13, D17, D20-D22 in `README.md`. Il
consolidamento e la coda: `06-rituale.md`. Canale per chi non ha il repo: app
desktop e pubblicazione sulla wiki (D8, in attesa di Q9). Da costruire:
`catalog-apply` e `catalog-refactor` (task 15).

## Sezione 4 — Oracolo AI

➡️ *Costruito, documentato altrove.* Regole, agenti, compito generato e misura:
`07-assistente.md`; decisioni D12, D23, D27-D30. Dati: i referti portano fuori
solo numeri (`../../referti/LEGGIMI.md`).

## Sezione 5 — Moltiplicatore

➡️ *Costruito, documentato altrove.* Scout, recorder, generazione deterministica:
`../../.kiro/specs/demo-anti-entropia/design.md`; decisioni D9-D11, D23-D26.
Guidabile senza terminale dal cruscotto (`../superpowers/specs/`). Aperti: drift
detection (uno step i cui componenti lo scout non trova piu') e riuso delle Page
Object esistenti alla rigenerazione (task 5.2).

## Sezione 6 — Piano demo

➡️ `03-piano-demo.md` (sceneggiatura) e `../PRESENTATION.md` (materiali).

## Sezione 7 — Rischi e mitigazioni

🟡 *Non scritta come sezione a se'.* I rischi della demo e le loro mitigazioni
sono in `03-piano-demo.md` (ordine dei tagli, video di riserva); quelli del
modello in `06-rituale.md` (proprietario del rituale, entropia che sale prima di
scendere) e in `01-analisi-criticita.md`. Da raccogliere in una tabella unica
se servira' al documento Word.
