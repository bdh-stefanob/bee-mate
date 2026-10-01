import { creaRisorsa, type Risorsa } from './risorsa';
import type { RispostaScenari } from './esiti-tipi';

/**
 * Gli scenari e il loro testo, tenuti FUORI dai componenti (come
 * `stato-controllo.ts`): uno solo per finestra, e tornando sulla pagina i dati
 * di prima restano a schermo mentre si rileggono.
 */

/** Esportata per i test: una risposta senza la forma attesa e' un errore, mai un elenco vuoto. */
export async function leggiScenari(): Promise<RispostaScenari> {
  const risposta = await fetch('/api/scenari');
  if (!risposta.ok) throw new Error(`/api/scenari: ${risposta.status}`);
  const corpo = (await risposta.json()) as Partial<RispostaScenari>;
  // "Nessuno scenario" e' una notizia (e porta a "Registra il primo"): non si
  // deduce dall'assenza di un campo.
  if (!Array.isArray(corpo.file)) throw new Error('/api/scenari: risposta inattesa');
  return {
    file: corpo.file,
    soloDescritti: typeof corpo.soloDescritti === 'number' ? corpo.soloDescritti : 0,
    esiti: corpo.esiti === 'illeggibile' ? 'illeggibile' : 'ok',
  };
}

export const scenari = creaRisorsa<RispostaScenari>(leggiScenari);

/**
 * Dopo un'esecuzione conclusa, un salvataggio o una generazione: garantisce una
 * lettura PARTITA dopo la modifica, cosi' tornando sulla pagina l'esito nuovo
 * c'e' gia' e non c'e' un attimo di quello vecchio. I componenti chiamano questa,
 * non importano lo store.
 */
export function dopoUnCambioDegliScenari(): void {
  void scenari.ricarica();
}

/** Piu' di cosi' non serve a nessuno: un tester guarda qualche scenario alla volta. */
export const MASSIMO_TESTI_IN_CACHE = 30;

const testi = new Map<string, Risorsa<string>>();

/** Solo per i test. */
export function svuotaCacheTesti(): void {
  testi.clear();
}

/**
 * Il testo di un file `.feature`, da `GET /api/download` (che ha gia' le
 * guardie su percorso, estensione e collegamenti simbolici). La chiave e'
 * `file@impronta`: quando il file cambia cambia l'impronta, e la voce vecchia
 * non si serve piu', senza che nessuno debba invalidare niente. `fetch` ignora
 * il `Content-Disposition: attachment`.
 */
export function risorsaTesto(file: string, impronta: string): Risorsa<string> {
  const chiave = `${file}@${impronta}`;
  const presente = testi.get(chiave);
  if (presente) return presente;

  const nuova = creaRisorsa<string>(async () => {
    const risposta = await fetch(`/api/download?file=${encodeURIComponent(file)}`);
    if (!risposta.ok) throw new Error(`/api/download: ${risposta.status}`);
    return risposta.text();
  });
  testi.set(chiave, nuova);
  while (testi.size > MASSIMO_TESTI_IN_CACHE) {
    const piuVecchia = testi.keys().next().value;
    if (piuVecchia === undefined) break;
    testi.delete(piuVecchia);
  }
  return nuova;
}
