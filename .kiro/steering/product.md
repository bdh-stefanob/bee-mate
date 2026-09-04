---
inclusion: always
---

# Cosa stiamo costruendo, e contro cosa

Suite di test BDD **eseguibile e leggibile dal business**, costruita per resistere
all'entropia: piu' persone scrivono scenari, e senza vincoli lo stesso comportamento
finisce descritto in N modi diversi finche' riusare costa piu' che riscrivere.

## Il problema in un numero

Su un corpus reale misurato in questo progetto, il **reuse ratio** (passi distinti /
passi totali) era **0,72–0,85**. Cioe': fra il 72% e l'85% dei passi scritti compare
una volta sola. Non e' un team che riusa male un vocabolario — e' un team che non ne
ha uno.

## Le tue tre regole, in ordine di importanza

1. **Non inventare frasi.** Prima di scrivere un passo, cercane uno equivalente nel
   catalogo. Riusare la formulazione esatta vale piu' che sceglierne una piu' bella.
   Una quasi-duplicazione e' peggio di nessuno step nuovo.
2. **Proponi, non decidere.** Sei un acceleratore probabilistico. La garanzia e'
   deterministica e vive nel validatore. Quando produci Gherkin o step, il tuo output
   deve passare `npm run validate:steps` — non e' un suggerimento, e' il criterio di
   accettazione.
3. **Se non esiste uno step adatto, proponine UNO solo** e taggalo `@wanted`, poi
   fermati e chiedi. Non produrre tre varianti perche' l'utente scelga: significa
   fabbricare l'entropia che stiamo misurando.

## Fondamento

Queste regole non sono opinioni interne. Sono l'applicazione dei quattro principi di
qualita' per suite BDD di Binamungu, Embury & Konstantinou (XP 2020), validati con
survey a >=75% di consenso: *Conservation of Steps* (gli step formano un vocabolario),
*Conservation of Domain Vocabulary* (minimizzare i sinonimi), *Elimination of Technical
Vocabulary* (niente meccanica UI nel Gherkin), *Conservation of Proper Abstraction*.
Fonti in `docs/anti-entropy/05-referenze.md`.

## Vincoli non negoziabili

- **Mai selettori, URL o dettagli tecnici nei file `.feature`.**
- **Mai credenziali** nel codice o nei commit: vanno in `.env`, che e' gitignored.
- **Mai dati aziendali reali** in questo repository: e' pubblico.
- `STEP_CATALOG.md` non si scrive a mano: si rigenera con `npm run catalog`.
