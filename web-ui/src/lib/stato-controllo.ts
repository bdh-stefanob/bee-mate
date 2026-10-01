/**
 * stato-controllo.ts
 * ------------------
 * I due dati che la schermata Controllo e la barra laterale mostrano — gli
 * ambienti e la diagnosi della macchina — e le azioni che li rileggono.
 *
 * Sostituisce `eventi-ambienti.ts` (F3): la' chi cambiava l'elenco avvisava, e
 * chi lo mostrava rifaceva la SUA lettura della stessa rotta. Ora la lettura e'
 * una, e i due componenti guardano lo stesso dato.
 *
 * Le azioni stanno qui e non nei componenti: una funzione di modulo ha sempre
 * la stessa identita', quindi passarla a una riga `memo` non la fa ridisegnare.
 */
import { creaRisorsa } from './risorsa';
import type { VoceDiagnosi } from './controllo';

export interface AmbienteVisibile {
  nome: string;
  url: string;
  /** Ha gia' un blocco di accesso (scritto a mano o derivato da una registrazione)? */
  haLogin?: boolean;
  /** I nomi ${VAR} che questo ambiente referenzia (url compreso). Mai i valori. */
  variabiliRichieste?: string[];
  /** Il sottoinsieme di sopra che non e' ancora in .env. Mai i valori. */
  variabiliMancanti?: string[];
  /** C'e' gia' un file di sessione salvato su disco per questo ambiente? */
  haSessione?: boolean;
}

export interface Configurazione {
  /** Solo i nomi: e' cio' che serve al selettore nella barra laterale. */
  bersagli: string[];
  ambienti: AmbienteVisibile[];
}

export interface Diagnosi {
  pronto: boolean;
  voci: VoceDiagnosi[];
}

async function leggiJson<T>(rotta: string): Promise<T> {
  const risposta = await fetch(rotta);
  const corpo = (await risposta.json()) as T;
  if (!risposta.ok) throw new Error(`${rotta}: ${risposta.status}`);
  return corpo;
}

export const configurazione = creaRisorsa<Configurazione>(async () => {
  const corpo = await leggiJson<Partial<Configurazione>>('/api/configurazione');
  return { bersagli: corpo.bersagli ?? [], ambienti: corpo.ambienti ?? [] };
});

export const diagnosi = creaRisorsa<Diagnosi>(() => leggiJson<Diagnosi>('/api/controllo'));

/**
 * Dopo qualunque modifica fatta dalla schermata Controllo — un ambiente
 * aggiunto, eliminato o corretto, una credenziale scritta, un accesso
 * registrato, un rimedio andato a buon fine.
 *
 * La diagnosi (che lancia uno script, quasi un secondo) si rifa' solo se
 * qualcuno la sta guardando: fuori dalla schermata Controllo si rileggera'
 * da sola alla prossima apertura.
 */
export function dopoUnaModifica(): void {
  void configurazione.ricarica();
  if (diagnosi.osservata()) void diagnosi.ricarica();
}
