import type { FileConEsiti, UltimoEsito } from './esiti-tipi';

/**
 * L'elenco della pagina Scenari: tutto cio' che e' logica sta qui, puro, senza
 * React, cosi' si prova con vitest (che gira solo in ambiente node).
 *
 * L'esito e' per coppia SCENARIO + AMBIENTE (decisione O5): lo stesso scenario
 * puo' essere verde su `staging` e mai provato su `produzione`, e la pagina
 * mostra quello dell'ambiente scelto nella barra laterale.
 */

export type StatoScenario =
  | { tipo: 'passato'; esito: UltimoEsito }
  | { tipo: 'fallito'; esito: UltimoEsito }
  /** C'e' un esito per questo ambiente, ma il testo e' cambiato dopo quella prova. */
  | { tipo: 'modificato'; esito: UltimoEsito }
  /**
   * Mai eseguito su questo ambiente. `altrove` e' la prova piu' recente su un
   * altro ambiente (o su uno sconosciuto), se c'e': e' informazione, mai un esito.
   */
  | { tipo: 'mai'; altrove: UltimoEsito | null };

/** Le tre categorie dei contatori, che sono anche i filtri. */
export type Categoria = 'superati' | 'non-superati' | 'da-eseguire';

/**
 * `esiti` e' ordinato dal piu' recente. Un esito di ambiente sconosciuto
 * (`ambiente: null`, indice ricostruito) NON e' l'esito di nessun ambiente: un
 * verde dell'ambiente sbagliato e' un numero giusto in apparenza.
 */
export function esitoPerAmbiente(esiti: UltimoEsito[], ambiente: string | null): StatoScenario {
  const scelto = ambiente ? esiti.find((e) => e.ambiente === ambiente) : undefined;
  if (!scelto) {
    const altrove = esiti.find((e) => e.ambiente !== ambiente || ambiente === null) ?? null;
    return { tipo: 'mai', altrove };
  }
  if (!scelto.aggiornato) return { tipo: 'modificato', esito: scelto };
  return { tipo: scelto.esito, esito: scelto };
}

export function categoriaDi(stato: StatoScenario): Categoria {
  if (stato.tipo === 'passato') return 'superati';
  if (stato.tipo === 'fallito') return 'non-superati';
  return 'da-eseguire';
}

export interface VoceScenario {
  /** `file` + titolo: l'identita' dell'opzione. */
  chiave: string;
  file: string;
  nome: string;
  riga: number;
  generato: boolean;
  /** Il nome della Feature, per la ricerca. */
  feature: string;
  /** Prima cartella sotto src/features/, o `''`. */
  app: string;
  /** Seconda cartella, o `''`. */
  flusso: string;
  stato: StatoScenario;
  categoria: Categoria;
}

export const chiaveScenario = (file: string, nome: string): string => `${file}\u0000${nome}`;

function appEFlusso(file: string): { app: string; flusso: string } {
  const parti = file.split('/');
  // L'ultimo pezzo e' il nome del file: le cartelle sono quelle prima.
  const cartelle = parti.slice(0, -1);
  return { app: cartelle[0] ?? '', flusso: cartelle[1] ?? '' };
}

/** Appiattisce i file in una voce per scenario, con lo stato per l'ambiente scelto. */
export function costruisciVoci(file: FileConEsiti[], ambiente: string | null): VoceScenario[] {
  const voci: VoceScenario[] = [];
  for (const f of file) {
    const { app, flusso } = appEFlusso(f.file);
    for (const s of f.scenari) {
      const stato = esitoPerAmbiente(s.esiti, ambiente);
      voci.push({
        chiave: chiaveScenario(f.file, s.nome),
        file: f.file,
        nome: s.nome,
        riga: s.riga,
        generato: f.generato,
        feature: f.nome,
        app,
        flusso,
        stato,
        categoria: categoriaDi(stato),
      });
    }
  }
  return voci;
}

export interface GruppoScenari {
  /** `non-salvati`, `senza-app`, `<app>` o `<app>/<flusso>`. */
  chiave: string;
  tipo: 'non-salvati' | 'senza-app' | 'app';
  app: string;
  flusso: string;
  voci: VoceScenario[];
}

/**
 * Primo gruppo, se esiste: i registrati e non ancora salvati. Poi un gruppo per
 * ogni coppia applicazione/flusso in ordine alfabetico; i file senza cartella
 * dell'applicazione per ultimi. Nessun file diventa invisibile solo per come e'
 * collocato. Dentro al gruppo resta l'ordine di arrivo.
 */
export function raggruppa(voci: VoceScenario[]): GruppoScenari[] {
  const nonSalvati: VoceScenario[] = [];
  const senzaApp: VoceScenario[] = [];
  const perChiave = new Map<string, GruppoScenari>();

  for (const v of voci) {
    if (v.generato) {
      nonSalvati.push(v);
      continue;
    }
    if (!v.app) {
      senzaApp.push(v);
      continue;
    }
    const chiave = v.flusso ? `${v.app}/${v.flusso}` : v.app;
    const g = perChiave.get(chiave);
    if (g) g.voci.push(v);
    else perChiave.set(chiave, { chiave, tipo: 'app', app: v.app, flusso: v.flusso, voci: [v] });
  }

  const gruppi = [...perChiave.values()].sort(
    (a, b) => a.app.localeCompare(b.app) || a.flusso.localeCompare(b.flusso)
  );
  const out: GruppoScenari[] = [];
  if (nonSalvati.length) out.push({ chiave: 'non-salvati', tipo: 'non-salvati', app: '', flusso: '', voci: nonSalvati });
  out.push(...gruppi);
  if (senzaApp.length) out.push({ chiave: 'senza-app', tipo: 'senza-app', app: '', flusso: '', voci: senzaApp });
  return out;
}

/** Minuscole e senza accenti: "funzionalita" trova "Funzionalità". */
export function normalizza(testo: string): string {
  return testo.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/**
 * Tutte le parole devono comparire, in qualunque ordine, nel titolo, nel nome
 * della Feature, nell'applicazione o nel flusso. Non nel testo dei passi.
 * Niente espressioni regolari: quello che il tester scrive e' testo.
 */
export function cerca(voci: VoceScenario[], testo: string): VoceScenario[] {
  const parole = normalizza(testo).split(/\s+/).filter(Boolean);
  if (parole.length === 0) return voci;
  return voci.filter((v) => {
    const pagliaio = normalizza(`${v.nome} ${v.feature} ${v.app} ${v.flusso}`);
    return parole.every((p) => pagliaio.includes(p));
  });
}

export function filtraPerCategoria(voci: VoceScenario[], categoria: Categoria | null): VoceScenario[] {
  return categoria === null ? voci : voci.filter((v) => v.categoria === categoria);
}

export interface Riepilogo {
  superati: number;
  nonSuperati: number;
  daEseguire: number;
  totale: number;
}

/** Conta quello che riceve: chi chiama gli passa TUTTI gli scenari, non quelli che la ricerca lascia. */
export function riepiloga(voci: VoceScenario[]): Riepilogo {
  let superati = 0;
  let nonSuperati = 0;
  let daEseguire = 0;
  for (const v of voci) {
    if (v.categoria === 'superati') superati++;
    else if (v.categoria === 'non-superati') nonSuperati++;
    else daEseguire++;
  }
  return { superati, nonSuperati, daEseguire, totale: voci.length };
}

export interface Richiesta {
  file?: string;
  scenario?: string;
}

export type Selezione =
  | { tipo: 'scelto'; chiave: string; file: string; nome: string; riga: number }
  | { tipo: 'non-trovato' }
  | { tipo: 'nessuno' };

const comeSelezione = (v: VoceScenario): Selezione => ({
  tipo: 'scelto',
  chiave: v.chiave,
  file: v.file,
  nome: v.nome,
  riga: v.riga,
});

/**
 * Cosa mostrare a destra, dai parametri dell'indirizzo (non fidati: servono
 * solo a scegliere dentro l'elenco che il server ha gia' dato).
 *
 * - `file` che non esiste piu': "non trovato". Mai un altro scenario al suo
 *   posto: un link che dice una cosa e ne mostra un'altra e' peggio di uno rotto.
 * - `file` esistente, titolo mancante o cambiato: il primo del file.
 * - niente: il primo dell'elenco visibile se la pagina e' larga, nessuno se e' stretta.
 *
 * `tutte` e' l'elenco intero (cercare non deve far "sparire" uno scenario
 * aperto); `visibili` e' quello che si vede, nell'ordine dei gruppi.
 */
export function risolviSelezione(
  tutte: VoceScenario[],
  visibili: VoceScenario[],
  richiesta: Richiesta,
  larga: boolean
): Selezione {
  if (richiesta.file) {
    const delFile = tutte.filter((v) => v.file === richiesta.file);
    if (delFile.length === 0) return { tipo: 'non-trovato' };
    const esatta = richiesta.scenario ? delFile.find((v) => v.nome === richiesta.scenario) : undefined;
    return comeSelezione(esatta ?? delFile[0]);
  }
  if (larga) {
    const primo = raggruppa(visibili)[0]?.voci[0];
    if (primo) return comeSelezione(primo);
  }
  return { tipo: 'nessuno' };
}

export type Tasto = 'giu' | 'su' | 'home' | 'fine';

/**
 * La regola delle frecce nell'elenco. `righe` e' la sequenza appiattita di
 * intestazioni di gruppo e opzioni; si ritorna l'indice dell'opzione su cui
 * portare il fuoco. Le intestazioni si saltano, e ai capi ci si ferma (niente
 * giro continuo). -1 se non c'e' nessuna opzione.
 */
export function prossimoIndice(righe: readonly ('gruppo' | 'opzione')[], corrente: number, tasto: Tasto): number {
  const opzioni = righe.flatMap((r, i) => (r === 'opzione' ? [i] : []));
  if (opzioni.length === 0) return -1;
  if (tasto === 'home') return opzioni[0];
  if (tasto === 'fine') return opzioni[opzioni.length - 1];
  if (tasto === 'giu') return opzioni.find((i) => i > corrente) ?? opzioni[opzioni.length - 1];
  const prima = [...opzioni].reverse().find((i) => i < corrente);
  return prima ?? opzioni[0];
}

/** `/scenari?file=<percorso>&scenario=<titolo>`: l'indirizzo che punta a uno scenario. */
export function indirizzoScenario(file: string, nome: string): string {
  const p = new URLSearchParams({ file, scenario: nome });
  return `/scenari?${p.toString()}`;
}

export function leggiRichiesta(parametri: URLSearchParams): Richiesta {
  const file = parametri.get('file');
  const scenario = parametri.get('scenario');
  return { ...(file ? { file } : {}), ...(scenario ? { scenario } : {}) };
}
