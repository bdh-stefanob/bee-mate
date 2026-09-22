/**
 * Scrive una variabile in .env conservando il resto del file.
 *
 * Perche' una funzione pura e non una scrittura diretta: cosi' si puo'
 * verificare che sostituisca invece di duplicare — un .env con la stessa chiave
 * due volte ha un comportamento che dipende da chi lo legge, e il sintomo
 * (credenziali che "a volte" non funzionano) non assomiglia alla causa.
 */
const CHIAVE_VALIDA = /^[A-Z][A-Z0-9_]{0,60}$/;

export function scriviVariabile(contenutoEnv: string, chiave: string, valore: string): string {
  if (!CHIAVE_VALIDA.test(chiave)) throw new Error(`chiave non valida: ${JSON.stringify(chiave)}`);
  if (/[\r\n]/.test(valore)) throw new Error('il valore non puo\' contenere un a capo');

  // Il fine riga si conserva: un .env in CRLF resta in CRLF (rilievo 2).
  const eol = contenutoEnv.includes('\r\n') ? '\r\n' : '\n';
  const righe = contenutoEnv.split(/\r\n|\n/);

  const indiciEsistenti: number[] = [];
  righe.forEach((r, idx) => {
    if (r.startsWith(`${chiave}=`)) indiciEsistenti.push(idx);
  });

  let risultato: string[];
  if (indiciEsistenti.length > 0) {
    // Si sostituisce solo la prima occorrenza; le altre si rimuovono, non
    // restano a fianco con un valore vecchio (rilievo 1).
    const [primo, ...duplicati] = indiciEsistenti;
    righe[primo] = `${chiave}=${valore}`;
    risultato = righe.filter((_, idx) => !duplicati.includes(idx));
  } else {
    const senzaCodaVuota = righe[righe.length - 1] === '' ? righe.slice(0, -1) : righe;
    risultato = [...senzaCodaVuota, `${chiave}=${valore}`];
  }

  // Il file termina sempre con un a capo (rilievo 3).
  if (risultato[risultato.length - 1] !== '') {
    risultato = [...risultato, ''];
  }

  return risultato.join(eol);
}

/**
 * I nomi dei bersagli, senza gli indirizzi: quelli non servono alla finestra.
 * Un file malformato o di forma inattesa (es. un array) non è un guasto del
 * server: si comporta come un file assente, elenco vuoto (rilievo 4).
 */
export function bersagliDaFile(json: string): string[] {
  let dati: unknown;
  try {
    dati = JSON.parse(json);
  } catch {
    return [];
  }
  if (typeof dati !== 'object' || dati === null || Array.isArray(dati)) {
    return [];
  }
  return Object.keys(dati as Record<string, unknown>).filter((k) => !k.startsWith('_'));
}
