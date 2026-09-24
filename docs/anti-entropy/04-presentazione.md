# 04 — La presentazione

> **Cosa decide questo documento:** con quali materiali si presenta l'idea, a
> chi, e cosa c'e' in ciascuno. La sceneggiatura della demo dal vivo resta in
> `03-piano-demo.md` e comanda: le slide la accompagnano, non la sostituiscono.
>
> I contenuti vengono da `docs/PANORAMICA.md`. Se un numero cambia li', cambia
> anche qui.

---

## Tre pubblici, tre materiali

| Pubblico | Cosa deve portarsi via | Materiale | Durata |
|---|---|---|---|
| **Senior / management** | il problema e' misurato, il rimedio costa quindici minuti al mese, serve un proprietario | **slide** + demo dal vivo | 20 min + 10 di domande |
| **Chi non era in sala**, o vuole rileggere | il processo per intero, con le ragioni | **documento Word** | lettura di 15 minuti |
| **Tester** | cosa cambia per me domani: niente, tranne due pulsanti | **scheda di una pagina** + `GUIDA-CRUSCOTTO.md` | 2 minuti |

Stesso messaggio in tutti e tre; cambia solo quanto dettaglio.

---

## Il messaggio, in tre righe

1. **Non abbiamo un vocabolario comune**, e lo possiamo dimostrare con i numeri.
2. **Un catalogo che converge da solo**, con un rituale di 15 minuti al mese,
   lo crea senza bloccare nessuno e senza cambiare dove si scrive.
3. **L'esecuzione manuale diventa gia' specifica e automazione**: chi conosce il
   business contribuisce senza imparare Gherkin.

**Una sola richiesta:** un proprietario del consolidamento, 15 minuti al mese.

---

## Le slide

Undici slide per venti minuti. Gli atti sono quelli di `03-piano-demo.md`.

| # | Titolo (e' l'affermazione, non l'argomento) | Contenuto | Atto |
|---|---|---|---|
| 1 | **Non abbiamo un vocabolario comune** | titolo, sottotitolo, nome del metodo | — |
| 2 | **85 passi su 100 sono scritti da zero** | reuse ratio 0,72 e 0,85; cosa significa 1,0 | 1 |
| 3 | **Non sono duplicati: manca il linguaggio** | il clustering assorbe solo il 14%; 246 intenzioni su 353 compaiono una volta sola | 1 |
| 4 | **107 frasi coprirebbero il 57% di cio' che scriviamo** | l'aritmetica, rifacibile in sala; due rami scollegati | 1 |
| 5 | **Un catalogo, e un editor che lo conosce** | *demo*: autocomplete vincolato, step sconosciuto sottolineato, variante nota con la forma suggerita | 2 |
| 6 | **Nessuno aspetta un'approvazione** | convergenza a valle: si scrive liberamente, una volta al mese si elegge la forma Gold. L'entropia sale prima di scendere, e lo diciamo | 3 |
| 7 | **15 minuti al mese, 2-3 persone** | il calendario del rituale (-3 giorni → riunione → refactor); si scrive solo per dissentire; report per area, **mai per persona** | 3 |
| 8 | **Il test manuale e' gia' la specifica** | *demo* o video: Registra → cosa ha capito → Genera il test | 4 |
| 9 | **L'AI propone, i giudici decidono** | tabella deterministico / AI; validatore, compilatore, dry-run. Se l'assistente manca, il test resta | 4 |
| 10 | **Da qui in poi e' automazione** | *demo* o video: Esecuzione, passi che diventano verdi. Tagliabile | 5 |
| 11 | **Cosa chiediamo: un proprietario** | una persona, 15 minuti al mese. Nient'altro: zero licenze, zero server | — |

**In appendice** (si mostrano solo se chiesti):

- A1 — Cosa **non** e': non sostituisce la wiki ne' Jira, non scrive sulle
  pagine di nessuno, non e' un framework da mantenere, non dipende da un vendor AI.
- A2 — I dati non escono: frasi reali solo sulla macchina, nei referti solo numeri.
- A3 — Accessibilita' come sottoprodotto: 88-90% sulle pagine di lavoro, e i
  campi senza etichetta trovati dallo scout.
- A4 — Le risposte alle domande prevedibili (tabella in `03-piano-demo.md`).
- A5 — Architettura: il diagramma delle componenti di `PANORAMICA.md` §5.

### Regole di forma

- **Il titolo della slide e' l'affermazione.** Chi legge solo i titoli ha capito
  la presentazione.
- **Un numero grande per slide**, non una tabella, nelle slide 2-4.
- **Nessun nome di persona**, di schermata o di componente reale. Le aree si
  chiamano "ramo A" e "ramo B".
- **Le demo hanno sempre un video di riserva**, registrato il giorno prima.
- Palette neutra, la stessa del cruscotto: blu `#1A56DB`, verde `#067647`,
  rosso `#B42318`, testo `#101828`.

---

## Il documento Word

Titolo: **Un linguaggio comune per i casi di test — proposta e processo**.
Circa 8 pagine. Si legge senza aver visto la presentazione.

| Sezione | Contenuto | Fonte |
|---|---|---|
| 1. Sintesi | mezza pagina: problema, proposta, richiesta | `PANORAMICA.md` §1 |
| 2. Il problema, misurato | i numeri, come sono stati misurati, cosa **non** dicono | §2, `README.md` F11-F13 |
| 3. Il metodo | le quattro idee e il principio deterministico | §3, `02-design.md` |
| 4. Il processo | i tre cicli con il diagramma; chi fa cosa | §4, §6 |
| 5. Il rituale | calendario, ruoli, cosa si decide e come | `06-rituale.md` |
| 6. Gli strumenti | cruscotto, portale, validatore, assistente: una riga di "cosa fa" ciascuno, con una schermata | §5, `GUIDA-CRUSCOTTO.md` |
| 7. Dati e sicurezza | cosa resta sulla macchina, credenziali, sola lettura | §7, `08-prova-su-altra-macchina.md` |
| 8. Stato e prossimi passi | cosa e' provato, cosa manca, decisioni aperte | §8, §9 |
| 9. La richiesta | il proprietario del consolidamento | `03-piano-demo.md` |
| Appendice | glossario (step, Gold, `@wanted`, reuse ratio, traccia, bersaglio) e fonti | `05-referenze.md` |

---

## La scheda per i tester

Una pagina:

1. **Cosa cambia per te:** scrivi dove scrivi oggi. Se usi l'app, l'editor ti
   suggerisce frasi gia' usate da altri.
2. **Se vuoi contribuire all'automazione:** Registra → fai il test → dai un nome
   ai passi → Verifica cio' che conferma → Genera il test.
3. **Cosa non ti chiediamo:** Gherkin, codice, un terminale.
4. **Chi decide le frasi comuni:** un gruppo di 2-3 persone, una volta al mese,
   e tu puoi obiettare in anticipo.

---

## Cosa serve ancora per andare in scena

| Cosa | Stato |
|---|---|
| Numeri dell'atto 1 | ✅ misurati |
| Demo atto 2 (portale) | ✅ gira in locale |
| Demo atto 3 (coda e report) | ✅ su export gia' scaricato |
| Demo atto 4 (Registra) | ✅ dal cruscotto · video di riserva da registrare |
| Demo atto 5 (Esecuzione) | 🟡 5 passi su 11: serve il task 14, oppure si mostra un flusso senza liste |
| Schermate per slide e documento | ⬜ da catturare dal cruscotto (dati di un'app di pratica, mai aziendali) |
| Slide | ⬜ |
| Documento Word | ⬜ |
| Scheda tester | ⬜ |
| Confronto con e senza regole (slide 9, opzionale) | ⬜ dipende da P8 |
