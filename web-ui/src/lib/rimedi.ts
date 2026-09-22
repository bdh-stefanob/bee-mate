import type { NomeComando } from './esecuzione';

/**
 * Quali rimedi la schermata di controllo puo' avviare da sola.
 *
 * Non sono tutti i comandi che `/api/esegui` accetta, ma solo quelli che non
 * chiedono un bersaglio: dalla riga di una diagnosi non c'e' modo di
 * sceglierlo. Registrazione, scansione, sessione e test ne vogliono uno, e un
 * pulsante che parte e fallisce sempre e' peggio di nessun pulsante — promette
 * una strada che non esiste. Per quelle voci resta il comando da copiare, che
 * funziona davvero.
 *
 * Sta qui e non nel componente perche' e' una regola, non un dettaglio di
 * disegno: e' verificabile da sola, e un caso controlla che ogni nome di
 * questo elenco sappia davvero partire senza parametri.
 */
export const COMANDI_ESEGUIBILI: readonly NomeComando[] = [
  'diagnosi',
  'installa-browser',
  'sincronizza-regole',
];

/** Il nome chiuso, se e' uno che la finestra puo' avviare da sola. */
export function comeComandoEseguibile(nomeChiuso: string | undefined): NomeComando | undefined {
  if (!nomeChiuso) return undefined;
  return (COMANDI_ESEGUIBILI as readonly string[]).includes(nomeChiuso)
    ? (nomeChiuso as NomeComando)
    : undefined;
}
