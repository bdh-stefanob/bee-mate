# Referti

Qui vivono le misure fatte su altre macchine, in una forma **committabile**.

`reports/` e' gitignorato e deve restarlo: un dizionario di un'applicazione
aziendale contiene nomi di componenti, di funzionalita' e indirizzi reali, e
questo repository e' pubblico con due remote sulla stessa storia. Un dato che
finisce qui e' a un push dall'esserlo davvero.

Ma allora chi misura su una macchina e discute su un'altra dovrebbe ricopiare i
numeri a mano — e ricopiare a mano significa non farlo. Da qui questa cartella.

```bash
npm run referto -- --nome collaudo
```

## La regola, che e' strutturale e non una promessa

`scripts/referto.ts` **non copia mai una stringa presa dai dati in ingresso**.
Ogni riga che produce e' un numero calcolato li' dentro, o un'etichetta scritta
in quel sorgente. Le pagine si chiamano "pagina 1", "pagina 2".

Non e' che stia attento a non far uscire i nomi: e' che i nomi non attraversano
il codice. Una regola che si puo' violare per distrazione non e' una garanzia.

## Cosa NON va messo qui, mai

- Il codice generato da un'applicazione aziendale: porta nomi di pagine e di
  componenti. Va nel repository aziendale.
- Le frasi Gherkin scritte su casi reali.
- Gli indirizzi degli ambienti, anche solo dentro a un esempio.
- Qualunque cosa copiata a mano da `reports/`.

Se serve incollare qualcosa che non passa da `npm run referto`, la domanda da
farsi e' una sola: **questa riga si puo' leggere da fuori l'azienda?**
