# Prove sul campo

Qui dentro — generatore, modelli, misure, controlli — e' dimostrato da casi che girano
a ogni `npm run check:all`. Quello che resta si puo' sapere **solo sull'applicazione
vera, con persone vere**: e' questo elenco.

Ordinate per quanto cambierebbero il piano se andassero male:

```
P1 → P2 → P3 e P7 (cinque minuti, quando vuoi) → P5 → P4 → P6 → P8 → P9
```

**Cosa si riporta, sempre:** i numeri di `npm run referto <nome>` (committabile) e un
si'/no per prova nella tabella in fondo. **Mai** nomi di schermate, componenti,
indirizzi, valori digitati.

---

## P1 — La registrazione con il flusso nuovo

**Perche'.** Nominazione dei passi a fine sessione, verifiche sui testi, inventario
durante la registrazione, controllo della barra: nessuno e' mai stato usato
sull'applicazione vera. L'ultima registrazione vera li precede tutti.

**Come.** `npm run record <bersaglio>`. Il flusso d'ordine, alla tua velocita'.
"Verifica" tre o quattro volte, **almeno una su un testo** (un titolo, un messaggio di
conferma). Alla fine, i nomi dei passi in inglese.

**Va bene se:** barra presente · almeno 3 passi nominati · almeno 2 verifiche, di cui
almeno 1 su un testo · pagine inventariate non meno delle pagine distinte visitate ·
l'applicazione non ti e' sembrata piu' lenta.

**Se va male:**
- tante unioni (`-`) a fine sessione → i confini proposti spezzano troppo: si cambia il
  criterio in `scripts/lib/labelling.ts`;
- una verifica su un testo che non si registra → `describeAny` non copre quel tipo di
  elemento: serve sapere quale (il ruolo, non il nome);
- applicazione rallentata → si alza il ritardo dell'inventario (1,2 s) in `record.ts`.

**Da riportare:** il referto. Adesso conta quante verifiche sono su un testo e com'e'
andata la nominazione (proposti, accettati, rinominati, uniti).

## P2 — Dalla registrazione al test verde

**Come.**

```powershell
npm run generate
npm run test:bersaglio <bersaglio>          # aggiungi "vedi" per guardarlo girare
```

**Va bene se:** compila · gira verde · i buchi dichiarati sono solo di tipi attesi.

**Se va male:**
- buco "piu' domini" → serve la decisione del task 3;
- il test non supera il login → sessione scaduta (vedi P5) o MFA;
- fallisce su un campo numerico → i campi senza etichetta, il cui nome e' "0", vogliono
  un filtro sul contenitore.

**Da riportare:** si'/no compila, si'/no verde, i **tipi** di buco (sono etichette
generiche, come `componente-non-nel-dizionario`), e su che **tipo** di passo fallisce
(navigazione, riconoscimento della pagina, campo, verifica).

## P3 — Kiro segue le regole anche senza file aperti

**Perche'.** La regola "cerca prima nel catalogo" e' sempre attiva per costruzione. Va
visto se lo e' anche nel comportamento.

**Come.** Chat nuova, nessun file aperto: *"Scrivimi uno scenario per il login."* Poi
con l'agente `bdd-authoring`, su un `.feature`: *"Correggilo tu."* Se ti chiede cosa
correggere, rispondi *"applica tu la correzione"*: deve dire che non puo' scrivere. Se si
limita a non farlo, non sappiamo ancora se il limite sugli strumenti c'e'.

**Va bene se:** cerca nel catalogo prima di scrivere · riusa uno step esistente o ne
propone **uno** nuovo `@wanted` · scrive in forma dichiarativa · `bdd-authoring`
propone la modifica ma **non** tocca il file.

**Se va male:** se inventa passi imperativi, l'inclusione sempre attiva non basta e la
regola va imposta anche nel prompt dell'agente; se `bdd-authoring` scrive, il limite
sugli strumenti non viene applicato e il formato dell'agente va rivisto (task 9).

**Da riportare:** si'/no per ciascuna delle quattro cose.

## P4 — Un collega, senza spiegazioni a voce

**Perche'.** E' la prova del vincolo V3, *alla portata dei tester manuali*. Se funziona
solo con te accanto, non funziona.

**Come.** Gli dai il comando e tre righe: *"fai il test come sempre; quando qualcosa ti
conferma che e' andata bene, premi Verifica e cliccala; alla fine dai un nome ai
passi."* Non intervieni: guardi.

**Va bene se:** almeno 2 verifiche senza aiuto · i passi hanno un nome · nessun blocco.

**Se va male:** il punto in cui si e' bloccato **e'** il risultato: e' il prossimo
difetto dell'interfaccia.

**Da riportare:** il referto, e dove si e' bloccato — a parole tue, senza nomi di
schermate.

## P5 — Quanto dura una sessione

**Come.** `npm run session <bersaglio>` oggi. Domani mattina
`npm run test:bersaglio <bersaglio>` senza rifare il login. `npm run diagnosi` dice
l'eta' della sessione.

**Va bene se:** domani passa ancora.

**Se va male:** se una sessione dura poche ore, i test vanno preceduti da un login
automatico (il blocco `login` del bersaglio) o da `npm run session`. Cambia il ritmo di
lavoro, non il metodo.

**Da riportare:** dopo quante ore scade.

## P6 — Le pagine difficili

**Come.** `npm run scout:pausa <url>`, fermandoti ogni volta su una di queste: un modulo
lungo · una lista o tabella con azioni per riga · un modale **aperto**.

**Va bene se:** accessibilita' almeno dell'80% anche li'.

**Se va male:**
- modale → un `alertdialog` **tronca l'albero di accessibilita'**: finche' e' aperto,
  la ricerca per ruolo non vede niente fuori da lui;
- lista → tanti ambigui (venti "Modifica" uguali): servono filtri per riga;
- modulo → campi senza etichetta: e' l'argomento da portare agli sviluppatori.

**Da riportare:** il referto.

## P7 — Automatismi e agenti nell'IDE

**Come.** Salvi un `.feature`: parte `validate:steps`? Salvi una `.steps.ts`: si
rigenera il catalogo? Il pannello agenti vede `bdd-authoring` e `bdd-generate`?

**Da riportare:** tre si'/no.

## P8 — Con e senza regole (dopo P2)

**Come.** La procedura e' in `07-assistente.md`. **Modello fissato**, non Auto. Senza
regole solo nell'arena.

**Da riportare:** `npm run benchmark label=<nome> referto=referto.json` — il file
indicato in `referto=` contiene solo numeri; quelli completi in `reports/benchmark/` no.

## P9 — Pubblicare il catalogo accanto agli scenari (serve il via libera)

**Perche' serve il via libera.** La fase 1 era dichiarata in sola lettura, e pubblicare
e' una scrittura (domanda Q9). Va confermato prima, da chi ha titolo per farlo.

**Come.** Prima **senza** `--apply`: il comando dice cosa farebbe e non scrive niente.
Poi con `--apply`, su una pagina di prova sotto la pagina madre dell'iniziativa. Lo
strumento si rifiuta di scrivere su pagine che non ha creato lui.

**Da riportare:** si'/no. Nessun contenuto.

---

## Esiti

| Prova | Data | Esito | Numeri e note — niente nomi |
|---|---|---|---|
| P1 | | | |
| P2 | | | |
| P3 | 2026-09-11 | parziale | cerca nel catalogo: si' · riusa o propone uno solo: si' (riuso esatto) · dichiarativo: no — 7 passi granulari riusati, lo step d'intento proposto come alternativa · l'agente di sola lettura non scrive: si', ma per scelta, da ripetere chiedendogli di applicare. Suggerisce comandi nella forma che si perde. Corretti regola e comandi (F21, F22, D32): si ripete dopo il pull |
| P4 | | | |
| P5 | | | |
| P6 | | | |
| P7 | | | |
| P8 | | | |
| P9 | | | |
