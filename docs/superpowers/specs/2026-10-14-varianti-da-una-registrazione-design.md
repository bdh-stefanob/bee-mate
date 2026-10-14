# Varianti da una registrazione — design

> Bozza del 2026-10-14, da approvare. Viene dopo
> [`2026-10-14-utility-per-comportamento-design.md`](2026-10-14-utility-per-comportamento-design.md):
> le varianti devono poter arrivare in fondo al flusso, e oggi ci arriva solo lo
> script di esplorazione.

## L'idea in una riga

**Il tester registra un ordine; il sistema sa quali altre scelte c'erano su
ogni pagina e ne ricava uno *Scenario Outline*: una registrazione, molti test.**

## Perche'

Il messaggio della demo e' «si registra uno scenario e si replicano esecuzione e
parametri con poco effort». Oggi i parametri sono i valori digitati (il CAP, il
nome utente). Le scelte fatte cliccando — la dose, «with» o «without coaching» —
restano murate nello scenario, anche se la pagina ne offriva altre e il
dizionario le ha gia' inventariate tutte.

Gli strumenti di registrazione registrano un percorso. Questa funzionalita'
registra un percorso e ne deriva i vicini.

## Cos'e' una variante

Una scelta registrata ha **sorelle**: gli altri componenti con lo stesso ruolo,
sotto la stessa intestazione, sulla stessa pagina. Sulla pagina prodotti di
`clinic`, sotto «Wegovy», la dose `7.2mg` ha per sorelle `0.25mg`, `0.5mg`,
`1.5mg`, `4mg`... Il registratore salva gia' l'intestazione di ogni gesto, e il
dizionario della pagina gia' contiene tutti i componenti con la loro: le sorelle
si trovano senza aprire un browser.

Una variante e' lo stesso scenario con una sorella al posto della scelta
registrata.

## Le regole

| # | Regola | Perche' |
|---|---|---|
| V1 | **Solo opzioni che il sito ha mostrato**, sulla stessa pagina e sotto la stessa intestazione. Mai inventate. | Una variante inventata e' un test che fallisce per colpa nostra |
| V2 | **Il valore registrato e' sempre il primo esempio.** | Lo scenario originale resta dentro, ed e' quello che si sa che funziona |
| V3 | **Il tester sceglie quali scelte far variare**, dal cruscotto («prova anche le altre»). Niente di automatico in prima versione. | Non ogni scelta e' una dimensione interessante; e il tester sa quali lo sono |
| V4 | **Una scelta che cambia il flusso non e' una variante** («I'm new» invece di «ritorno»). Si segnala, non si genera. | Porta a pagine che la registrazione non ha mai visto |
| V5 | **Tetto alle combinazioni** (proposta: 12 esempi). Due dimensioni si combinano a coppie, non tutte contro tutte. | Niente esplosione da centinaia di test |

## Cosa produce

```gherkin
Scenario Outline: the user completes the second order
  ...
  When the user select the medication <dose>
  ...
  Examples:
    | dose   |
    | 7.2mg  |   # la registrata
    | 0.25mg |
    | 0.5mg  |
```

La frase resta quella del tester (decisione U3); la scelta diventa un parametro
che lo step passa alla utility.

## Definizione di fatto: le quattro prove

Vale per questa funzionalita' e, proposta, per ogni funzionalita' nuova.

1. **Controllo automatico, senza browser** (`check:generate`): con il dizionario
   vero della pagina prodotti e la registrazione del 14/10, il generatore produce
   tutte e sole le sorelle mostrate, la registrata per prima, il tetto rispettato,
   «I'm new» escluso e segnalato.
2. **App finta** (`check:app-finta`): tutte le varianti passano; **una variante
   costruita apposta per essere rifiutata fallisce**, con il dossier. Se passasse,
   il test non verificherebbe niente.
3. **QA vero, due volte di fila**: almeno tre varianti reali (dosi diverse,
   with/without coaching). Ogni fallimento classificato col dossier: limite del
   sito o difetto nostro.
4. **Il numero**: varianti generate / verdi / verdi anche al secondo giro, scritto
   nel rapporto di esecuzione.

## Dipendenze

- Le utility di base (accesso, avvisi, questionario, farmacia, pagamento, foto),
  perche' ogni variante deve arrivare in fondo.
- La utility di scelta del prodotto deve ricevere la scelta come parametro.

## Domande aperte

| # | Domanda | Proposta |
|---|---|---|
| Q1 | Dove il tester indica «prova anche le altre»: in registrazione o dopo, nel cruscotto? | Dopo, nella revisione dello scenario salvato: registrando e' gia' concentrato sul flusso |
| Q2 | Una variante che il sito rifiuta (dose non ordinabile per quell'utente) e' un fallimento o un esito atteso? | Un esito da dichiarare: la riga degli esempi porta «atteso: rifiutato» |
| Q3 | Le varianti girano sullo stesso utente, una dopo l'altra? | Si', con l'ordine in sospeso gestito dall'avviso; in parallelo solo con utenti diversi |
