import { createHash } from 'crypto';

/**
 * L'impronta di un testo di scenario: sha-1, primi 16 caratteri, con i fine
 * riga portati a `\n`.
 *
 * Una funzione sola, un posto solo: la usano sia l'elenco degli scenari (per
 * dire com'e' il file adesso) sia l'estrazione degli esiti (per dire com'era
 * quando e' girato). Se i due calcoli divergessero, ogni esito risulterebbe
 * "modificato dopo l'ultima prova", o peggio nessuno lo risulterebbe mai.
 *
 * I fine riga sono normalizzati perche' un checkout con `autocrlf` cambia i
 * byte senza cambiare lo scenario, e non deve far sembrare "modificato" cio'
 * che non lo e'.
 */
export function improntaDiTesto(testo: string): string {
  return createHash('sha1').update(testo.replace(/\r\n?/g, '\n'), 'utf-8').digest('hex').slice(0, 16);
}
