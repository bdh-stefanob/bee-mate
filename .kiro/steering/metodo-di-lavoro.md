---
inclusion: always
---

# Come si lavora su questo progetto

Stai aiutando a costruire un metodo per ridurre l'**entropia** nei test BDD: piu'
persone scrivono scenari, e senza vincoli lo stesso comportamento finisce descritto in
N modi diversi. Il metodo si chiama **Specification by Demonstration**: un tester
esperto esegue il test a mano, la sessione viene registrata, e da li' si derivano
scenario e automazione.

- **Il piano** — cosa resta da fare, in ordine, con i criteri di chiusura:
  `.kiro/specs/demo-anti-entropia/tasks.md`
- **Lo stato vivo** — fatti accertati, decisioni prese e perche', domande aperte:
  `docs/anti-entropy/README.md`. Ha precedenza su qualunque altra fonte.
- **Le trappole tecniche gia' incontrate**: `lezioni.md`, caricata quando tocchi codice.
- **Le prove ancora da fare sul campo**, e cosa riportarne:
  `docs/anti-entropy/10-prove-sul-campo.md`.

## Cinque principi, in ordine di importanza

1. **Verifica, non supporre.** Prima di affermare come si comporta un file, un comando
   o uno strumento esterno, leggilo o lancialo. Su questo progetto le supposizioni
   plausibili si sono rivelate sbagliate piu' spesso delle altre.

2. **Prima il controllo, poi la correzione.** Per ogni difetto scrivi il caso che lo
   dimostra, in modo che fallisca **nella direzione scomoda**. Poi correggi. Un calcolo
   di punteggio e' stato sbagliato due volte di fila: entrambe le volte l'ha preso un
   caso scritto prima di toccare il codice.

3. **Dichiara i buchi, non colmarli.** Quando uno strumento non sa fare qualcosa, lo
   dice nel suo output (`gaps`, avvisi, referto). Un file che sembra completo e non lo
   e' si scopre in esecuzione, e sembra un altro problema.

4. **Una sola sorgente per ogni cosa.** Tipi, probe del DOM, inventario, regole,
   agenti: una copia sola, le altre si generano o si importano. Due copie divergono in
   silenzio — cioe' riproducono qui dentro il problema che il progetto esiste per
   risolvere.

5. **Un numero sbagliato con l'aria giusta e' il danno peggiore.** I numeri di questo
   progetto finiranno su una slide e da li' in una decisione. Una misura sbagliata non
   si rompe: da' un risultato, con sicurezza, e nessuno in sala puo' accorgersene.

## Dati aziendali: la regola che non si discute

Questo repository e' **pubblico**, e ha due remote sulla stessa storia: un dato che
entra in un commit e' a un push dall'essere pubblico per sempre.

- `reports/` e' gitignorato e contiene tutto cio' che e' reale: registrazioni (con i
  valori digitati), dizionari, sessioni salvate. **Resta sulla macchina.**
- Dalla macchina aziendale esce solo `npm run referto`, che produce numeri e basta.
- Il codice generato da un'applicazione aziendale porta nomi di pagine e componenti:
  va nel repository **aziendale**, mai qui.
- Niente URL, nomi di prodotto o di persona nei documenti, nei commenti, negli esempi.
  Si scrive "l'applicazione clinica", "il sito vetrina", "il questionario".
- Credenziali solo in `.env` come `${VAR}`. Mai stampate a schermo, mai nei log.

Prima di ogni commit: `git diff --cached`, e cerca indirizzi, nomi, valori.

## Comandi da suggerire

La macchina aziendale usa PowerShell. Tre forme li' non funzionano, e le prime due
non danno nemmeno errore — danno un'esecuzione diversa:

- **Un'opzione con i trattini dopo `npm run x --`**: npm la trattiene e lo script
  parte senza. Ogni script accetta la forma nuda, e si suggerisce solo quella:
  `npm run benchmark label=con-regole`, `npm run generate no-rules`,
  `npm run targets env`, `npm run scout clinic scope=main`.
- **`VARIABILE=valore comando`**: e' sintassi bash. Per i test c'e'
  `npm run test:bersaglio <nome>`.
- **`&&` fra due comandi**: nella PowerShell di Windows non c'e'. Un comando per riga.

Se l'opzione che serve non ha una forma nuda, dillo invece di proporre un comando
che sembra funzionare. E se un documento del repository suggerisce una forma
diversa, e' sbagliato il documento: `npm run check:args` lo trova.

## Dove si modificano le regole

`.amazonq/rules/` e' la **sorgente**. `.kiro/steering/` e `.kiro/agents/` sono
**generati** da `npm run rules:sync`. Modificare direttamente i file generati e'
inutile: alla sincronizzazione successiva vengono riscritti, e un file che nella
sorgente non c'e' viene cancellato come orfano.

Il nome della cartella sorgente e' storico: il progetto e' nato pensando ad Amazon Q.
Il motore oggi e' Kiro, ma una sorgente sola vale piu' di un nome giusto.

## Quando un lavoro e' finito

```bash
npx tsc --noEmit -p tsconfig.json   # compila?
npm run check:all                   # i controlli reggono?
npm run rules:check                 # regole e agenti allineati?
```

Se uno fallisce il lavoro non e' finito — non e' "da sistemare poi".

Commit in italiano, Conventional Commits (`feat:`, `fix:`, `docs:`...). Il corpo
spiega **perche'**, non cosa: il cosa si legge nel diff. Quando una scelta devia da
una convenzione, il commit lo dice e dice il motivo.

## Stile

Italiano, diretto, conciso. Onesto sui limiti: se qualcosa non si puo' fare o non e'
stato verificato, dillo e proponi l'alternativa vera. Quando ti sbagli, correggi in
una riga e prosegui.
