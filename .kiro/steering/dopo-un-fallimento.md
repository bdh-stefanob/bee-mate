---
inclusion: fileMatch
fileMatchPattern: 'reports/failures/**'
---

# Uno scenario e' fallito: come si corregge

Il dossier sta in `reports/failures/<scenario>-<data>/`:

- `fallimento.md` — il passo fallito, l'errore, la pagina, il comando per rilanciare;
- `aria.yml` — l'albero di accessibilita' della pagina **al momento del fallimento**;
- `screenshot.png` — come appariva.

**Non serve il web.** Il dossier contiene cio' che c'era sulla pagina: leggi
`aria.yml` per capire cosa vedeva il test, invece di aprire l'ambiente.

## Cosa si fa

1. Trova lo step (`src/steps/`) col testo del passo fallito, poi il metodo della
   Page Object che chiama.
2. Confronta il componente cercato con `aria.yml`. Le cause, dalla piu' frequente:
   nome cambiato; avviso o modale in mezzo (es. «Resume order»); pagina diversa
   da quella registrata.
3. Correggi nella Page Object o nell'azione. **Mai selettori negli step.**
   Un avviso intermittente si chiude "se c'e'" (`dismissIfPresent`), non si
   rende obbligatorio.
4. Rilancia solo quello scenario con il comando del dossier. Se passa, hai finito;
   se fallisce, ne nasce un dossier nuovo.

## Quando fermarsi

Se `aria.yml` mostra una pagina molto diversa da quella che il test si aspetta,
non indovinare: dillo, e serve rilanciare lo scout su quell'indirizzo. Non
inventare locator che nessun dossier conferma.
