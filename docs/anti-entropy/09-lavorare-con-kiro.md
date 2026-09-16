# Lavorare con Kiro su questo progetto

Tutto cio' che serve a Kiro per continuare il lavoro sta nel repository. Non c'e'
niente da spiegargli a voce: se manca qualcosa, manca nei file, e va aggiunto li'.

## Cosa legge, e quando

| Cosa | Dove | Quando lo vede |
|---|---|---|
| Il metodo e come si lavora | `.kiro/steering/` — `product`, `bdd-authoring`, `step-catalog`, `metodo-di-lavoro` | **sempre** |
| Le trappole tecniche gia' pagate | `.kiro/steering/lezioni.md` | quando tocca un file `.ts` |
| Architettura e generazione | `.kiro/steering/automation-layers`, `from-recording` | quando tocca `src/` |
| Il piano, con i criteri di chiusura | `.kiro/specs/demo-anti-entropia/` | quando apri la spec |
| Lo stato vivo e le decisioni | `docs/anti-entropy/README.md` | quando lo legge: lo steering glielo indica |
| Due agenti | `.kiro/agents/` — `bdd-authoring` (niente scrittura senza il tuo si'), `bdd-generate` | quando li scegli |
| Due automatismi | `.kiro/hooks/` — valida al salvataggio, rigenera il catalogo | da soli |

`.kiro/steering/` e `.kiro/agents/` si **generano** da `.amazonq/rules/` e
`.amazonq/cli-agents/` con `npm run rules:sync`. Per cambiare una regola si cambia la
sorgente — anche quando lo fai fare a Kiro.

## Come si parte

**Dall'IDE** — apri `.kiro/specs/demo-anti-entropia/tasks.md`: ogni task si avvia da
li', e Kiro legge requisiti e design da solo.

**Da riga di comando**, per un task preciso:

```powershell
kiro-cli chat "Esegui il task 5 di .kiro/specs/demo-anti-entropia/tasks.md. Prima leggi requirements.md e design.md."
```

Frasi di partenza che funzionano:

- *"Leggi docs/anti-entropy/README.md e dimmi a che punto siamo e cosa blocca."*
- *"Esegui il task N della spec. Scrivi prima il caso di controllo, poi il codice."*
- *"Ecco l'output del recorder: [solo i numeri]. Cosa ti dice?"*
- *"Rivedi questo scenario contro il catalogo"* — con l'agente `bdd-authoring`, che
  non modifica file senza che tu dica di si'. **Non lanciarlo con
  `--trust-all-tools`** (e nell'IDE non in Autopilot): quel flag gli ridà la shell,
  verificato il 2026-09-16. Il limite e' l'approvazione, non l'assenza di strumenti.

## Dopo ogni lavoro di Kiro, tre controlli tuoi

1. **Passa?**

   ```powershell
   npx tsc --noEmit -p tsconfig.json; npm run check:all; npm run rules:check
   ```

2. **Niente di aziendale nel commit.** `git diff --cached` prima di ogni commit:
   niente indirizzi, nomi di prodotto, valori digitati. Il repository e' pubblico.

3. **Il messaggio di commit spiega perche'.** Se non lo spiega, fallo riscrivere: fra
   un mese il perche' e' l'unica cosa che non si ricostruisce dal codice.

## Le quattro cose da non lasciargli fare

- **Modificare `.kiro/steering/` o `.kiro/agents/` direttamente.** Vengono riscritti
  alla sincronizzazione successiva.
- **Committare `reports/`**, o codice generato dall'applicazione aziendale.
- **Suggerire comandi con un flag dopo `npm run x --`.** Su certe macchine il flag
  non arriva, e il comando fa altro in silenzio.
- **Misurare con il modello su Auto.** Per il confronto con e senza regole il modello
  va fissato, altrimenti si misurano i modelli invece delle regole.

## Tenere viva la conoscenza

Quando Kiro — o tu — scopre una trappola nuova, va in `.amazonq/rules/lezioni.md`, con
l'incidente che l'ha insegnata. Quando si prende una decisione, va in
`docs/anti-entropy/README.md` con il suo perche'. Quando un task si chiude, si spunta in
`tasks.md`.

E' cosi' che il progetto non dipende da nessuna conversazione: ne' da questa, ne' dalle
prossime.
