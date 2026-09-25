/**
 * ansi.ts
 * -------
 * Ripulisce il testo che arriva da un'esecuzione esterna prima di mostrarlo.
 *
 * Due cose diverse, per due ragioni diverse.
 *
 * I CODICI COLORE. Un messaggio di Cucumber/Playwright puo' arrivare con dentro
 * i codici del terminale (`\x1b[2m...\x1b[22m`): Playwright li applica da solo
 * quando chi lo lancia sembra un terminale a colori. Il cruscotto non e' un
 * terminale: quei codici non diventano mai colore, restano testo grezzo —
 * `[2m` in mezzo a una frase — ed e' quello che il tester vedeva.
 *
 * I PERCORSI ASSOLUTI, e non e' cosmesi. Un errore porta con se' percorsi come
 * `C:\Users\<nome>\...\<cartella del progetto>\src\...`: dentro ci sono il nome
 * di chi usa il computer e quello che il proprietario ha dato alla cartella. In
 * una dimostrazione, aperti i dettagli tecnici, finiscono sul proiettore
 * davanti a tutti. Quel che serve a capire dov'e' il problema e' il percorso
 * DENTRO il progetto; il resto e' rumore che vale la pena togliere.
 */

// eslint-disable-next-line no-control-regex -- e' proprio l'escape ANSI che si cerca
const CODICI_ANSI = /\x1b\[[0-9;]*m/g;

/** Le due forme in cui un percorso puo' comparire: come lo scrive Windows e come lo scrive Node. */
function formeDelPercorso(radice: string): string[] {
  const conBarre = radice.split('\\').join('/');
  const conBarreRovesciate = radice.split('/').join('\\');
  return [...new Set([radice, conBarre, conBarreRovesciate])].filter(Boolean);
}

function accorciaPercorsi(testo: string, radice: string): string {
  if (!radice) return testo;
  let risultato = testo;
  for (const forma of formeDelPercorso(radice)) {
    // Prima la forma con il separatore in coda, cosi' `<radice>/src/x` diventa
    // `src/x` e non `/src/x`; poi la radice nuda, per chi la cita da sola.
    risultato = risultato.split(`${forma}\\`).join('');
    risultato = risultato.split(`${forma}/`).join('');
    risultato = risultato.split(forma).join('');
  }
  return risultato;
}

/**
 * `radice` e' facoltativa: senza, si tolgono solo i codici colore. Chi mostra
 * un messaggio all'utente la passa sempre.
 */
export function rimuoviCodiciAnsi(testo: string, radice = ''): string {
  return accorciaPercorsi(testo.replace(CODICI_ANSI, ''), radice);
}
