# Piano — Demo anti-entropia

Ogni task dice perche' esiste, cosa produce e come si verifica. I task segnati
**UMANO** richiedono la macchina aziendale o una decisione: l'assistente puo'
prepararli, non chiuderli.

Prima di chiudere qualunque task:

```bash
npx tsc --noEmit -p tsconfig.json
npm run check:all
npm run rules:check
```

## Gia' fatto

- [x] Baseline misurata sul corpus reale (reuse ratio 0,72 e 0,85)
- [x] Ciclo del catalogo: lettura, raggruppamento, coda di approvazione, pubblicazione
- [x] Recorder con traccia semantica, URL per gesto, barra verificata al montaggio
- [x] Verifiche su elementi non interattivi (titoli, messaggi)
- [x] Nomi dei passi a fine sessione, con confini proposti per identita' di pagina
- [x] Inventario durante la registrazione, con fusione degli inventari
- [x] Generatore deterministico: feature, Page Object, step — compila
- [x] Compito per l'assistente con candidati in due classi
- [x] Benchmark a sette misure, arena per il confronto senza regole, referto
- [x] Bersagli multipli con login dichiarato, `BDD_TARGET`, diagnosi della macchina
- [x] Regole e agenti per Kiro generati da una sorgente, hook di validazione
- [x] Protocollo delle prove sul campo; `npm run test:bersaglio` valido in ogni shell;
      il referto conta verifiche sui testi e nominazione dei passi
- [x] Opzioni degli script in forma nuda (`label=x`), lette da `scripts/lib/args.ts`;
      `check:args` blocca le copie e i comandi suggeriti nella forma che si perde

## Da fare

- [ ] 1. **UMANO** — Registrazione vera con verifiche
  - Perche': tutto il resto aspetta una sessione con passi nominati e verifiche; le
    registrazioni esistenti ne sono prive.
  - Cosa: `npm run record <bersaglio>` sul flusso d'ordine. "Verifica" su cio' che
    conferma ogni passo (3-4 in tutto). Nomi dei passi in inglese a fine sessione.
  - Verifica: il riepilogo mostra almeno 3 intenti nominati, almeno 2 verifiche, e le
    pagine inventariate.
  - Protocollo e cosa riportare: `docs/anti-entropy/10-prove-sul-campo.md`, P1
  - _Requisiti: R2_

- [ ] 2. Generare dalla registrazione e farla girare verde
  - Dipende da: 1, e da 3 se compare il buco multi-dominio
  - Cosa: `npm run generate`, poi `npm run test:bersaglio <bersaglio>` — valido in
    ogni shell, a differenza di `BDD_TARGET=... npm test` che in PowerShell non funziona.
  - Protocollo e cosa riportare: `docs/anti-entropy/10-prove-sul-campo.md`, P2
  - Verifica: il test passa; `npm run benchmark label=deterministico` compila con
    0 passi senza glue e 0 selettori negli step.
  - _Requisiti: R3, R8_

- [ ] 3. **UMANO decide** — Percorso su due domini
  - Perche': le Page Object hanno percorsi relativi a un solo indirizzo; quelle del
    secondo dominio navigherebbero sul primo.
  - Opzione A, se il flusso vetrina -> applicazione va testato intero:
    - [ ] 3.1 `origins` nel bersaglio, es. `{ "vetrina": "${VETRINA_URL}" }`
    - [ ] 3.2 `pageIdentity` associa ogni host a una chiave di origine
    - [ ] 3.3 le Page Object generate dichiarano `readonly origin = "vetrina"`
    - [ ] 3.4 `BasePage.navigate()` risolve l'origine dalla configurazione del bersaglio
    - [ ] 3.5 caso di controllo con una registrazione finta su due domini
  - Opzione B: registrare separatamente le due parti. Nessun codice.
  - _Requisiti: R3.4, R8_

- [ ] 4. **UMANO decide** — Segmenti numerici: id o passo
  - Perche': `/questions/1` e `/questions/3` oggi finiscono sulla stessa Page Object.
    Giusto per il dettaglio di un ordine, sbagliato per un questionario a domande
    diverse.
  - Se passo: configurazione per bersaglio (es. `segmentiPasso: ["questions"]`) letta
    da `looksLikeId` e `pageIdentity`; caso di controllo con entrambe le letture.
  - _Requisiti: R3.4_

- [ ] 5. Una sessione in un comando
  - Perche': oggi servono cinque comandi in ordine, e un tester non li ricorda.
  - [ ] 5.1 `scripts/sessione.ts` e `npm run sessione <bersaglio>` — argomento nudo,
    niente flag (vedi `lezioni.md`)
  - [ ] 5.2 Verifica di mappa: confronta i componenti necessari alla registrazione con
    i metodi delle Page Object gia' generate; riusa quelle che coprono tutto, aggiunge
    solo i mancanti, non rimuove mai un metodo esistente
  - [ ] 5.3 Conformita': `validate:steps` e le misure di `lib/benchmark.ts` sul Gherkin
    prodotto — passi gia' nel catalogo, passi nuovi, conformita' media
  - [ ] 5.4 Referto finale, solo numeri
  - [ ] 5.5 Se un passo fallisce: fermarsi, dire quale e come riprendere, senza perdere
    la registrazione gia' salvata
  - [ ] 5.6 Caso di controllo end-to-end con le fixture di `test-fixtures/generate/`
  - _Requisiti: R5_

- [ ] 6. Ancorare il catalogo ai componenti
  - Perche': e' il limite principale adesso. Zero step su 100 dichiarano componenti,
    quindi la classe di candidati piu' affidabile e' sempre vuota.
  - Dipende da: 1
  - Cosa: da ogni passo nominato di una registrazione, proporre l'ancoraggio
    (`components`) allo step di catalogo corrispondente. **Proposta in coda, non
    scrittura diretta**: l'approvazione e' umana (vedi
    `docs/anti-entropy/06-rituale.md`).
  - Verifica: dopo l'approvazione, `npm run diagnosi` mostra step ancorati > 0.
  - _Requisiti: R4.1_

- [ ] 7. Verifiche tipizzate
  - Perche': in produzione non si verifica che un elemento esista, ma che la pagina si
    sia aggiornata. Oggi ogni verifica diventa "la pagina mostra X".
  - Cosa: dopo "Verifica", la barra chiede il tipo — mostra un valore (predefinito),
    e' comparso, e' sparito, si e' navigato — e il generatore emette l'attesa giusta.
  - _Requisiti: R2.2, R3_

- [ ] 8. Confronto con e senza regole
  - Dipende da: 2
  - Cosa: procedura in `docs/anti-entropy/07-assistente.md`. **Modello fissato**, non
    Auto. Senza regole solo nell'arena.
  - Prima di misurare: l'arena sta dentro al repository (`reports/arena/`). Non e'
    verificato che Kiro, aperto li' dentro, non risalga alle regole della cartella
    madre. Chiedigli quali regole ha in contesto: se ne nomina anche una, l'arena va
    creata fuori dal repository, altrimenti "senza regole" misura "con regole".
  - Verifica: `npm run benchmark confronta` con tre righe; referto committato.
  - Protocollo: `docs/anti-entropy/10-prove-sul-campo.md`, P8
  - _Requisiti: R6_

- [ ] 9. Agenti Kiro riconosciuti anche da riga di comando
  - Perche': la documentazione di Kiro segnala che CLI e IDE possono volere formati
    diversi per gli agenti.
  - Cosa: verificare che `kiro-cli` veda `bdd-generate` e `bdd-authoring`. Se no,
    adattare il generatore in `scripts/sync-rules.ts`, non i file generati.
  - Insieme a P7: automatismi e agenti riconosciuti nell'IDE.
  - _Requisiti: R4.3_

- [ ] 10. Piano della demo e slide — **da non lasciare per ultimo**
  - Cosa: `docs/anti-entropy/03-piano-demo.md` e' la scaletta; aggiornarla con i
    numeri veri (task 2 e 8) e con l'argomento accessibilita' (i campi senza
    etichetta).
  - Si puo' cominciare subito dagli atti 1-3.
  - _Requisiti: R1, R6, R9_

- [ ] 11. **UMANO decide** — 3 o 4 layer
  - `CLAUDE.md` dice 4; il generatore ne produce 3, come il POC aziendale.

- [ ] 12. (tagliabile) Due pulsanti nell'app desktop: genera, lancia
  - Il primo da tagliare se il tempo stringe.

## Prove sul campo — UMANO

Il protocollo di ciascuna — perche', come, quando va bene, cosa riportare — e' in
`docs/anti-entropy/10-prove-sul-campo.md`. P1, P2 e P8 coincidono con i task 1, 2 e 8.
Gli esiti si scrivono nella tabella in fondo a quel documento: solo numeri e si'/no.

- [ ] P3. Kiro segue le regole anche senza file aperti — cinque minuti. Prima prova
      2026-09-11 parziale, regole corrette: si ripete dopo il pull
- [ ] P4. Un collega usa il recorder senza spiegazioni a voce — la prova del vincolo V3
- [ ] P5. Quanto dura una sessione salvata
- [ ] P6. Le pagine difficili: modulo lungo, lista con azioni per riga, modale aperto
- [ ] P7. Automatismi e agenti riconosciuti nell'IDE
- [ ] P9. Pubblicare il catalogo accanto agli scenari — **serve il via libera** (Q9)
