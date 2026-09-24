# Roadmap — BDD Automation Scaffold

> Documento di lavoro per l'agente (Claude Code, Kiro) e per chi entra sul
> progetto. Dice **cosa costruire dopo**, in che **ordine**, e soprattutto
> **cosa NON costruire**. Leggerlo prima di proporre architetture o feature.
>
> Il quadro completo (problema, metodo, processo, componenti) e' in
> [`docs/PANORAMICA.md`](docs/PANORAMICA.md). Qui ci sono solo le priorita'.
>
> Aggiornato al 2026-09-24.

---

## 1. Dove siamo

Il progetto e' passato per tre fasi:

| Fase | Periodo | Obiettivo | Esito |
|---|---|---|---|
| **M1 — Scaffold e app di authoring** | giugno 2026 | dimostrare alla manager un catalogo condiviso di step al posto del blocco note | ✅ app desktop con catalogo ed editor vincolato, validatore, estensione VS Code, import di scenari, sincronizzazione Jira |
| **Anti-entropia** | 3-22 settembre | misurare l'entropia dei casi di test reali e farla convergere; Specification by Demonstration | ✅ catena completa: lettura della wiki → misura → catalogo → registrazione → generazione → test. Dettaglio in `docs/anti-entropy/` |
| **Cruscotto per il tester** | 22-24 settembre | rendere la catena usabile senza terminale | ✅ MVP delle tre schermate, rifinito dall'uso. Spec in `docs/superpowers/specs/` |

**Il prossimo traguardo e' la demo ai senior** (meta' ottobre 2026): la
sceneggiatura e' in `docs/anti-entropy/03-piano-demo.md`, i materiali in
`docs/anti-entropy/04-presentazione.md`.

---

## 2. Principio fondamentale: calibrazione deterministica

> Il riuso degli step NON deve dipendere dalla buona volonta' o dalla memoria
> dei tester, ne' da suggerimenti probabilistici di un modello.

La garanzia vive in meccanismi deterministici:

1. **Autocomplete vincolato**: gli editor (app desktop, VS Code) suggeriscono
   SOLO step presenti in `step-catalog.json`. Si consulta il catalogo, non si
   genera niente.
2. **Validazione strutturale**: ogni step di un `.feature` viene confrontato con
   il catalogo. Esatto → ok. Simile a uno esistente → avviso con il suggerimento.
   Nuovo → blocca (hook di pre-commit).
3. **Giudici del codice**: `tsc`, dry-run di Cucumber, `validate:steps`. L'AI
   produce, i giudici decidono (D6).

**Evoluzione di settembre (D17):** le varianti non si bloccano piu' mentre si
scrive nella wiki. Si registrano e si fanno convergere dopo, con il rituale
mensile che elegge la forma Gold. Il blocco resta sul repository; sulla wiki
c'e' la misura.

Gli LLM (Kiro, Amazon Q, Copilot, Claude) servono a **velocizzare**, non a
**garantire**.

---

## 3. Architettura

```
                        step-catalog.json  (fonte unica)
                                 |
   +-----------------+-----------+-----------+------------------+
   |                 |                       |                  |
 Wiki (dove si      App desktop            VS Code            Assistente
 scrive oggi)       - cruscotto            - estensione        - regole
 - osservatorio       Controllo            - hook pre-commit   - agenti
 - coda + rituale     Registra                                 - compito
 - pubblicazione      Esecuzione                                 generato
   (Q9)             - portale
                      catalogo, editor
   |                 |                       |                  |
   +-----------------+-----------+-----------+------------------+
                                 |
             Repository: features/ → steps/ → actions/ → pages/
                                 |
                  Esecuzione (Playwright + Cucumber)
```

Il dettaglio di ogni componente, con dove vive nel codice, e' in
`docs/PANORAMICA.md` §5.

---

## 4. Prossimi passi, in ordine

L'ordine viene dalla demo: prima cio' che la sblocca, poi cio' che la rende
credibile, poi il resto.

| # | Cosa | Perche' adesso | Stima | Riferimento |
|---|---|---|---|---|
| 1 | **Pulizia**: lockfile di `web-ui` allineato; i due casi di test legati alla macchina resi portabili | `npm ci` fallisce su una macchina pulita | ½ g | — |
| 2 | **Riga dentro una lista** — il recorder registra cosa distingue la riga, il generatore produce un locator a due livelli | e' dove si ferma il test generato: sblocca l'atto 5 | 1-2 g | task 14 |
| 3 | **Materiali della presentazione**: slide, documento Word, scheda tester | "da non lasciare per ultimo" | 1,5 g | `04-presentazione.md` |
| 4 | **Chiudere il rituale**: `catalog-apply` (registra le decisioni) e `catalog-refactor` (riscrive le varianti, anteprima obbligatoria) | senza, il rituale elegge le Gold ma non le porta negli scenari: l'atto 3 resta una promessa | 1-2 g | `06-rituale.md` passi 4-5 |
| 5 | **Contenuto del catalogo**: eleggere le prime Gold dal corpus | 127 voci su 137 sono `@wanted`; la rosa dei candidati resta spesso vuota | 1 g | `03-piano-demo.md` |
| 6 | **Verifiche tipizzate** — valore, comparso, sparito, navigato | alza la qualita' delle asserzioni generate | ½-1 g | task 7, D16 |
| 7 | Scenario gia' nel repository che non passa il validatore | blocca chi lo tocca e spinge al bypass | ½ g | task 13 |
| 8 | Estensione VS Code impacchettata (`.vsix`) | oggi si installa solo da sorgente | ½ g | vecchio 5.6 |

**In attesa di una decisione** (vedi §6): percorso su due domini (task 3),
segmenti numerici (task 4), 3 o 4 layer (task 11), eseguibile senza repository
(U3).

**In attesa della macchina aziendale:** prove sul campo P3-P9
(`docs/anti-entropy/10-prove-sul-campo.md`). La piu' importante e' **P4**: un
collega usa il cruscotto senza spiegazioni.

---

## 5. Cosa NON fare

- ❌ **Dashboard custom dei run**: l'esito si legge nel cruscotto e nel reporter
  di Cucumber.
- ❌ **AI generativa libera per i tester nell'editor**: rompe la calibrazione.
  L'autocomplete consulta soltanto il catalogo. L'AI serve per i draft, vincolata
  dal compito generato.
- ❌ **Selettori dentro gli step**: rispetta i layer (vedi `CONTRIBUTING.md`).
- ❌ **Step duplicati "per velocita'"**: c'e' l'hook di pre-commit.
- ❌ **Scrivere a mano `STEP_CATALOG.md`**: si genera.
- ❌ **Generare il corpo delle step definition con un modello**: il generatore
  deterministico produce lo scheletro, la logica non si inferisce dal testo.
- ❌ **Backend con database**: tutto da `step-catalog.json` e dai file su disco.
- ❌ **Refactor di massa automatico**: anteprima e diff obbligatori, sempre (D19).
- ❌ **Nominare persone** in report, code o slide: l'attribuzione e' per area (D15).
- ❌ **Comandi arbitrari dalla finestra**: il cruscotto accetta solo un elenco
  chiuso di nomi con parametri tipizzati, mai una stringa da eseguire.
- ❌ **Un comando dove puo' esserci un pulsante**: il tester non vede mai un
  terminale.
- ❌ **Portare fuori dalla macchina dati dell'applicazione**: registrazioni,
  dizionari e sessioni restano in `reports/` (gitignorato); fuori escono solo i
  referti numerici.
- ❌ **Credenziali nei file degli ambienti o nei commit**: solo `${VARIABILE}`,
  con i valori in `.env`.

---

## 6. Decisioni aperte

L'elenco completo, con chi decide, e' in `docs/PANORAMICA.md` §9. Le principali:

- **U1** nome del prodotto · **U2** dove finisce il lavoro del tester · **U3**
  eseguibile senza repository · **U4** prodotto per altri
- **T3** due domini · **T4** segmenti numerici · **T11** 3 o 4 layer
- **Q5** chi possiede il rituale · **Q9** pubblicare sulla wiki · **Q10** remote
  aziendale

---

## 7. Quick start per l'agente

Quando apri una sessione su questo repo:

1. Leggi `docs/PANORAMICA.md` per il quadro, `CONTRIBUTING.md` per le regole
   architetturali, questo file per le priorita'.
2. Se ti chiedono una feature o uno scenario: prima `npm run catalog`, poi
   proponi solo step esistenti. Step nuovi → `@wanted` e conferma del team.
3. Se ti chiedono di lavorare sul cruscotto: la spec e' in
   `docs/superpowers/specs/2026-09-22-cruscotto-tester-design.md`, le lezioni
   pagate nei messaggi di commit del branch `cruscotto-tester`.
4. Se ti chiedono di cambiare l'architettura: chiedi conferma esplicita.
5. Prima di chiudere un lavoro: `npx tsc --noEmit`, `npm run check:all`,
   `npm run rules:check` nella radice; `npm test` e `npm run build` in `web-ui`.

**Convenzione commit:** Conventional Commits (`feat:`, `fix:`, `chore:`,
`docs:`, `test:`).

---

## Appendice — La roadmap di giugno, voce per voce

Per chi ritrova riferimenti ai vecchi numeri.

| Voce | Cosa era | Stato |
|---|---|---|
| 5.0a | Import di scenari in testo | ✅ `scripts/import-scenarios.ts`, import dall'app |
| 5.0b | App web di authoring | ✅ diventata l'app desktop (Next.js + Electron) |
| 5.0c | Revisione UI/UX | ❔ nessuna traccia di una revisione formale; il cruscotto ha requisiti di accessibilita' nella sua spec, verificati a mano |
| 5.1 | Sito statico del catalogo | ⏭ non fatto: il catalogo si consulta nell'app e si pubblica sulla wiki (D8) |
| 5.2 | Hook di pre-commit | ✅ `.husky/pre-commit` → `validate:steps`, con avviso di somiglianza |
| 5.3 | Skill `feature-author` | ⏭ sostituita dagli agenti Kiro (`bdd-generate`, `bdd-authoring`) e dal compito generato |
| 5.4 | Setup VS Code documentato | 🟡 l'estensione copre il completamento; nessun `.vscode/` versionato |
| 5.5 | Reporter HTML pubblicato | ⏭ superato: l'esito si legge nel cruscotto |
| 5.6 | Estensione VS Code | 🟡 completamento, diagnostica, hover, albero; manca il pacchetto `.vsix` |
| 5.7 | Harvest da `.feature` esistenti | ✅ in altra forma: `analyze:corpus` e `catalog:sync` lavorano sulla wiki e sulle cartelle di `.feature` |
| 5.8 | Integrazione Jira | ✅ `jira:sync`, `jira:fetch` |
