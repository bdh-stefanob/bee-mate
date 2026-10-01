import type { FileScenari, ScenarioEseguibile } from './scenari';
import type { PassoFallito } from './esiti-da-messaggi';

/**
 * I tipi della risposta di `GET /api/scenari`, senza codice: li importano sia la
 * rotta sia la pagina (che gira nel browser e non deve portarsi dietro `fs`).
 * Si importano con `import type`, che sparisce alla compilazione.
 */

/** Come e' andata una prova di uno scenario su un ambiente. */
export interface UltimoEsito {
  esito: 'passato' | 'fallito';
  /** ISO: la fine dello scenario. */
  quando: string;
  durataMs: number;
  /** Il nome dell'ambiente; `null` = sconosciuto (indice ricostruito dai vecchi file). */
  ambiente: string | null;
  /** L'id dell'esecuzione: il futuro "Vedi la schermata" parte da qui. */
  esecuzione: string;
  /** `false` = il testo dello scenario e' cambiato dopo quella prova. */
  aggiornato: boolean;
  passoFallito?: PassoFallito;
}

export interface ScenarioConEsiti extends ScenarioEseguibile {
  /** Uno per ambiente su cui e' stato provato, il piu' recente per primo. Vuoto = mai eseguito qui. */
  esiti: UltimoEsito[];
}

export interface FileConEsiti extends Omit<FileScenari, 'scenari'> {
  scenari: ScenarioConEsiti[];
}

export interface RispostaScenari {
  file: FileConEsiti[];
  /** Quanti scenari sono solo descritti (@non-automatizzato), in tutti i file. */
  soloDescritti: number;
  /** `illeggibile`: il file degli esiti c'e' ma non si legge. */
  esiti: 'ok' | 'illeggibile';
}
