import type { Contenuto } from './contenuto-scenario';
import type { Messaggio } from './convalida-scenario';
import type { Operazione, PassoRimasto, ScenarioToccato } from './piano-modifica';

/**
 * Le chiamate che la finestra fa alle rotte `/api/scenari/{contenuto,anteprima,
 * modifica,annulla}`. Solo `import type` dai moduli del server: qui non entra
 * `fs`, questo file gira nel browser.
 *
 * Una risposta con un errore NON lancia: lancia solo la rete (un `fetch` che
 * fallisce), e chi chiama la traduce in "non riesco a parlare con il programma".
 */

export interface Anteprima {
  ok: boolean;
  blocchi: Messaggio[];
  avvisi: Messaggio[];
  conseguenze: { scenari: ScenarioToccato[] };
  /** Tocca altro oltre a questo scenario (rinomina, sposta, elimina): chiede conferma. */
  tocca: boolean;
  scrive: number;
  marcatoreTolto: boolean;
  /** Dove sta lo scenario dopo (sposta); `null` se si elimina. */
  fileDopo: string | null;
  /** Elimina: i passi che vanno con lo scenario e quelli che restano, e perche'. */
  passi?: { vanno: string[]; restano: PassoRimasto[] };
}

export interface EsitoModifica {
  ok: true;
  testo: string;
  versione: string;
  fileToccati: number;
  scenari: ScenarioToccato[];
  avvisi: Messaggio[];
  marcatoreTolto: boolean;
  /** `null` = non serviva; `false` = serviva e non e' riuscita. */
  catalogoRigenerato: boolean | null;
  /** Lo scenario dopo la modifica: cambia se si e' spostato, `null` se si e' eliminato. */
  file: string | null;
  eliminato: boolean;
  passi?: { vanno: string[]; restano: PassoRimasto[] };
}

export interface EsitoAnnulla {
  ok: true;
  fileToccati: number;
  /** Lo scenario di prima, da riaprire (dopo aver annullato uno spostamento o un'eliminazione). */
  file: string;
  attuale: { testo: string; versione: string } | null;
  catalogoRigenerato: boolean | null;
}

export interface ErroreServer {
  errore: string;
  ragione?: string;
  dettagli?: Messaggio[];
  controllo?: { motivo: string; passi: string[] };
  attuale?: { testo: string; versione: string };
}

export type Risposta<T> = { ok: true; corpo: T } | { ok: false; stato: number; corpo: ErroreServer };

async function chiama<T>(url: string, metodo: 'GET' | 'POST', corpo?: unknown): Promise<Risposta<T>> {
  const risposta = await fetch(url, {
    method: metodo,
    ...(metodo === 'POST'
      ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo ?? {}) }
      : {}),
  });
  let json: unknown = {};
  try {
    json = await risposta.json();
  } catch {
    /* corpo non leggibile: vale l'errore generico */
  }
  if (risposta.ok) return { ok: true, corpo: json as T };
  const e = (json ?? {}) as Partial<ErroreServer>;
  return { ok: false, stato: risposta.status, corpo: { ...e, errore: typeof e.errore === 'string' ? e.errore : 'errore' } };
}

export const leggiContenutoDalServer = (file: string) =>
  chiama<Contenuto>(`/api/scenari/contenuto?file=${encodeURIComponent(file)}`, 'GET');

/** Le applicazioni con i loro flussi: per proporre dove spostare uno scenario. */
export const leggiCartelleDalServer = () =>
  chiama<{ cartelle: Array<{ app: string; flussi: string[] }> }>('/api/scenari/cartelle', 'GET');

export const chiediAnteprima =(op: Operazione) => chiama<Anteprima>('/api/scenari/anteprima', 'POST', op);

export const chiediModifica = (op: Operazione) => chiama<EsitoModifica>('/api/scenari/modifica', 'POST', op);

export const chiediAnnulla = () => chiama<EsitoAnnulla>('/api/scenari/annulla', 'POST', {});
