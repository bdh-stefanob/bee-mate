/**
 * fusione-step.ts
 * ----------------
 * Il doppione (stesso componente, due frasi) va fuso, non solo diagnosticato:
 * il tester lo ha chiesto esplicitamente. Fondere e' piu' della riscrittura di
 * `riscrittura-step.ts` (che sposta una frase, ma si aspetta che la
 * destinazione NON esista ancora): qui la destinazione esiste sempre, perche'
 * e' l'altra meta' del doppione — quindi in piu' bisogna:
 *
 *   1. far sparire la DEFINIZIONE perdente (non basta smettere di chiamarla:
 *      lasciarla li' morta e' rumore, e un domani qualcuno la richiama);
 *   2. non farlo alla cieca se le due definizioni fanno cose diverse.
 *
 * Funzioni pure, stesso stile di `riscrittura-step.ts`: nessun accesso al
 * disco, cosi' si verificano con testo inventato. Chi chiama (la rotta) decide
 * quando scrivere e come garantire il tutto-o-niente.
 *
 * LIMITE EREDITATO: solo frasi senza parametri (vedi `riscrittura-step.ts`).
 *
 * LIMITE DICHIARATO sul confronto dei corpi: `normalizzaCorpo` toglie
 * commenti e spazi per il confronto, con un parser a stati sufficiente per
 * distinguere codice da stringhe/commenti nei file di step generati (stile
 * omogeneo, mai backtick annidati). Non e' un parser JS completo: basta a
 * decidere "uguale/diverso" per il gesto di fusione, non a validare sintassi.
 */

import { haParametri } from './riscrittura-step';

export class FusioneNonSupportata extends Error {}

function escapeRegExp(testo: string): string {
  return testo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function assicuraSenzaParametri(espressione: string, ruolo: 'perdente' | 'vincente'): void {
  if (haParametri(espressione)) {
    throw new FusioneNonSupportata(
      `la frase "${ruolo}" ha un parametro ({string}/{int}/...): la fusione non e' supportata`
    );
  }
}

/**
 * Trova, a partire da `indiceApertura` (un carattere `(`, `{` o `[`), il
 * carattere che chiude quella stessa parentesi — ignorando cio' che sta dentro
 * stringhe (`'`, `"`, `` ` ``) e commenti (`//`, `/* ... *​/`), cosi' una
 * graffa dentro una stringa non fa sballare il conteggio. Non distingue il
 * TIPO di parentesi (tanto il codice sorgente e' ben formato): basta il
 * bilanciamento.
 */
function trovaChiusura(testo: string, indiceApertura: number): number | null {
  let profondita = 0;
  type Stato = 'normale' | 'singola' | 'doppia' | 'template' | 'commentoRiga' | 'commentoBlocco';
  let stato: Stato = 'normale';
  for (let i = indiceApertura; i < testo.length; i++) {
    const c = testo[i];
    const precedente = testo[i - 1];
    if (stato === 'commentoRiga') {
      if (c === '\n') stato = 'normale';
      continue;
    }
    if (stato === 'commentoBlocco') {
      if (precedente === '*' && c === '/') stato = 'normale';
      continue;
    }
    if (stato === 'singola') {
      if (c === "'" && precedente !== '\\') stato = 'normale';
      continue;
    }
    if (stato === 'doppia') {
      if (c === '"' && precedente !== '\\') stato = 'normale';
      continue;
    }
    if (stato === 'template') {
      if (c === '`' && precedente !== '\\') stato = 'normale';
      continue;
    }
    // stato === 'normale'
    if (c === "'") { stato = 'singola'; continue; }
    if (c === '"') { stato = 'doppia'; continue; }
    if (c === '`') { stato = 'template'; continue; }
    if (c === '/' && testo[i + 1] === '/') { stato = 'commentoRiga'; continue; }
    if (c === '/' && testo[i + 1] === '*') { stato = 'commentoBlocco'; continue; }
    if (c === '(' || c === '{' || c === '[') { profondita++; continue; }
    if (c === ')' || c === '}' || c === ']') {
      profondita--;
      if (profondita === 0) return i;
      continue;
    }
  }
  return null;
}

interface Occorrenza {
  /** indice della parola chiave (Given/When/Then) */
  indice: number;
  /** indice della '(' di apertura della chiamata */
  apertura: number;
}

function localizzaOccorrenze(testo: string, espressione: string): Occorrenza[] {
  const escaped = escapeRegExp(espressione);
  const pattern = new RegExp(`(Given|When|Then)(\\()\\s*(['"])${escaped}\\3`, 'g');
  const risultati: Occorrenza[] = [];
  let m: RegExpExecArray | null;
  while ((m = pattern.exec(testo))) {
    risultati.push({ indice: m.index, apertura: m.index + m[1].length });
  }
  return risultati;
}

/** Toglie commenti e collassa gli spazi: due corpi scritti in modo diverso ma equivalenti non devono sembrare diversi. */
function normalizzaCorpo(corpo: string): string {
  return corpo
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\/\/[^\n]*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Vero se i due corpi (testo del gestore, come restituito da `estraiDefinizione`/`rimuoviDefinizione`) sono lo stesso comportamento. */
export function corpiEquivalenti(a: string, b: string): boolean {
  return normalizzaCorpo(a) === normalizzaCorpo(b);
}

export interface DefinizioneStep {
  /** Quante chiamate Given/When/Then con questa frase esistono nel file: 0, 1 (il caso atteso) o piu' (ambiguo). */
  trovate: number;
  /** Presente solo quando trovate === 1: il corpo della funzione gestore, per il confronto con `corpiEquivalenti`. */
  corpoFunzione?: string;
}

/**
 * Legge (senza modificare nulla) la definizione di `espressione` in un file
 * `.steps.ts`: quante volte compare e, se una sola, il corpo del suo gestore.
 * Serve a leggere il lato "vincente" della fusione (che non va toccato) e a
 * preparare l'anteprima prima di scrivere.
 */
export function estraiDefinizione(testo: string, espressione: string): DefinizioneStep {
  assicuraSenzaParametri(espressione, 'vincente');
  const occorrenze = localizzaOccorrenze(testo, espressione);
  if (occorrenze.length !== 1) return { trovate: occorrenze.length };

  const { apertura } = occorrenze[0];
  const fineChiamata = trovaChiusura(testo, apertura);
  if (fineChiamata === null) return { trovate: occorrenze.length };

  const indiceGraffa = testo.indexOf('{', apertura);
  if (indiceGraffa === -1 || indiceGraffa > fineChiamata) {
    // Gestore senza corpo a blocco (es. arrow espressione singola): si usa
    // l'intera chiamata come "corpo" da confrontare, meglio di niente.
    return { trovate: 1, corpoFunzione: testo.slice(apertura + 1, fineChiamata) };
  }
  const fineGraffa = trovaChiusura(testo, indiceGraffa);
  if (fineGraffa === null) return { trovate: 1, corpoFunzione: testo.slice(apertura + 1, fineChiamata) };

  return { trovate: 1, corpoFunzione: testo.slice(indiceGraffa + 1, fineGraffa) };
}

/**
 * Il punto dove inizia davvero il blocco da togliere: se la chiamata e'
 * preceduta, senza altro in mezzo, da un commento `/** ... *​/` (il JSDoc con
 * `@intent`), quel commento sparisce insieme alla chiamata — altrimenti
 * resterebbe un JSDoc orfano che documenta uno step che non esiste piu'.
 */
function inizioBloccoDaRimuovere(testo: string, inizioRigaChiamata: number): number {
  const primaDellaRiga = testo.slice(0, inizioRigaChiamata);
  const chiusuraCommento = primaDellaRiga.lastIndexOf('*/');
  if (chiusuraCommento === -1) return inizioRigaChiamata;

  const traChiusuraERiga = primaDellaRiga.slice(chiusuraCommento + 2);
  if (!/^\s*$/.test(traChiusuraERiga)) return inizioRigaChiamata; // non adiacente: non e' il commento di questa chiamata

  const aperturaCommento = primaDellaRiga.lastIndexOf('/**', chiusuraCommento);
  if (aperturaCommento === -1) return inizioRigaChiamata;

  const inizioRigaCommento = primaDellaRiga.lastIndexOf('\n', aperturaCommento) + 1;
  return inizioRigaCommento;
}

/**
 * Toglie, da un file `.steps.ts`, la definizione di `espressione` — commento
 * `@intent` sopra compreso, se adiacente — e ricuce lo spazio lasciato senza
 * righe vuote doppie. Non tocca il file se la frase non compare esattamente
 * una volta: zero e' "non trovata" (chi chiama decide se e' un errore), piu'
 * di una e' un'ambiguita' che questa funzione non arbitra, per lo stesso
 * motivo di `riscriviDefinizione`.
 */
export function rimuoviDefinizione(
  testo: string,
  espressione: string
): { testo: string; rimosse: number; corpoFunzione?: string } {
  assicuraSenzaParametri(espressione, 'perdente');

  const eol = testo.includes('\r\n') ? '\r\n' : '\n';
  const normalizzato = testo.replace(/\r\n/g, '\n');

  const occorrenze = localizzaOccorrenze(normalizzato, espressione);
  if (occorrenze.length !== 1) {
    return { testo, rimosse: occorrenze.length };
  }

  const { indice, apertura } = occorrenze[0];
  const definizione = estraiDefinizione(normalizzato, espressione);

  const fineChiamata = trovaChiusura(normalizzato, apertura);
  if (fineChiamata === null) {
    return { testo, rimosse: 0 };
  }

  // Fine della riga della chiamata: subito dopo il ';' se c'e', altrimenti
  // subito dopo la ')' di chiusura.
  let fineIstruzione = fineChiamata + 1;
  while (normalizzato[fineIstruzione] === ' ' || normalizzato[fineIstruzione] === '\t') fineIstruzione++;
  if (normalizzato[fineIstruzione] === ';') fineIstruzione++;
  if (normalizzato[fineIstruzione] === '\n') fineIstruzione++; // la riga della chiamata sparisce con lei

  const inizioRigaChiamata = normalizzato.lastIndexOf('\n', indice) + 1;
  const inizioBlocco = inizioBloccoDaRimuovere(normalizzato, inizioRigaChiamata);

  const prima = normalizzato.slice(0, inizioBlocco);
  const dopo = normalizzato.slice(fineIstruzione);
  // Non piu' di una riga vuota nel punto di giunzione: la stessa regola che
  // il tester vede altrove nei file generati.
  const ricucito = (prima + dopo).replace(/\n{3,}/g, '\n\n');

  return {
    testo: ricucito.replace(/\n/g, eol),
    rimosse: 1,
    corpoFunzione: definizione.corpoFunzione,
  };
}
