/**
 * suggerimenti-misura.ts
 * ----------------------
 * Lo strumento che conta: quanto valgono i suggerimenti, con un numero e non con
 * un'impressione. Funzioni pure sull'insieme d'oro e sulle decisioni di un braccio.
 *
 * Cosa fa la fetta 1: misura il braccio R (le regole del catalogo). E' il metro per
 * il giorno in cui qualcuno chiedera' "e l'assistente cosa aggiunge?": lo stesso
 * insieme, le stesse misure, un altro braccio. Il criterio d'ingresso (sezione 6
 * della spec, soglie confermate dal proprietario il 2026-10-01) e' scritto qui
 * PRIMA di qualunque misura e non si cambia dopo averne vista una.
 *
 * L'INSIEME D'ORO
 * Lo etichetta una persona tecnica SENZA vedere le proposte (prima l'oro, poi le
 * proposte: altrimenti ci si ancora al giudizio di chi propone). Per ogni passo: la
 * voce giusta del catalogo, oppure `null` = "nessuna voce del catalogo dice questa
 * cosa". `oro` e' obbligatorio: un'etichetta che manca non vale "nessuna".
 * Un quinto dei passi lo etichetta una seconda persona (`secondoGiudizio`): l'accordo
 * fra le due dice quanto e' soggettivo il metro.
 *
 * Le misure sono calcolabili senza chiedere un parere. Quando un denominatore e'
 * zero il numero NON ESISTE (`null`), non vale 0 e non vale 1: un numero con
 * l'aria giusta e il significato sbagliato e' il danno peggiore.
 *
 * Il referto che esce da qui e' di soli numeri e di identificativi: nessuna frase
 * dei passi, perche' le frasi sono dati dell'applicazione.
 */

import type { ClasseCandidato, Compito } from './suggerimenti-contratto';
import { proponiConRegole } from './suggerimenti-regole';

export const SOGLIE = {
  /** Precisione minima, per il braccio scelto. */
  precisione: 0.9,
  /** Astensione minima. */
  astensione: 0.8,
  /** Quanta copertura in piu' delle regole, in punti assoluti, per valere le parti in movimento. */
  guadagnoCopertura: 0.15,
  /** Stabilita' minima fra le esecuzioni dello stesso compito. */
  stabilita: 0.8,
  /** Di quanto la precisione puo' stare sotto quella delle regole. */
  tolleranzaPrecisione: 0.02,
} as const;

/** Composizione minima dell'insieme perche' un risultato non sia solo aneddotico. */
export const COMPOSIZIONE = { passi: 60, daRegistrazioni: 30, registrazioni: 3, quotaNessuna: 0.25 } as const;

// ---------------------------------------------------------------------------
// L'insieme d'oro
// ---------------------------------------------------------------------------

export interface CandidatoOro {
  voce: string;
  classe: ClasseCandidato;
  somiglianza?: number;
}

export interface PassoOro {
  id: string;
  fonte: 'registrazione' | 'wiki';
  /** Da quale registrazione viene, quando la fonte e' una registrazione. */
  registrazione?: string;
  etichetta: string;
  candidati: CandidatoOro[];
  /** La voce giusta secondo la persona che ha etichettato, o `null`: nessuna voce la dice. */
  oro: string | null;
  /** Il giudizio di una seconda persona, su un quinto dei passi. `null` vale "nessuna". */
  secondoGiudizio?: string | null;
}

export interface InsiemeOro {
  schema: 1;
  nome: string;
  /** Un insieme finto, per provare il calcolo: non e' mai una misura. */
  esempio: boolean;
  passi: PassoOro[];
}

export type EsitoInsieme = { ok: true; insieme: InsiemeOro } | { ok: false; motivo: string };

function oggetto(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}
function soloChiavi(x: Record<string, unknown>, ammesse: readonly string[]): boolean {
  return Object.keys(x).every((k) => ammesse.includes(k));
}

export function validaInsiemeOro(x: unknown): EsitoInsieme {
  const no = (motivo: string): EsitoInsieme => ({ ok: false, motivo });
  if (!oggetto(x) || !soloChiavi(x, ['schema', 'nome', 'esempio', 'passi'])) return no('forma');
  if (x.schema !== 1 || typeof x.nome !== 'string' || typeof x.esempio !== 'boolean' || !Array.isArray(x.passi)) return no('forma');
  const ids = new Set<string>();
  const passi: PassoOro[] = [];
  for (const p of x.passi) {
    if (!oggetto(p) || !soloChiavi(p, ['id', 'fonte', 'registrazione', 'etichetta', 'candidati', 'oro', 'secondoGiudizio'])) return no('passo');
    if (typeof p.id !== 'string' || p.id.length === 0 || ids.has(p.id)) return no('id');
    ids.add(p.id);
    if (p.fonte !== 'registrazione' && p.fonte !== 'wiki') return no('fonte');
    if (p.registrazione !== undefined && typeof p.registrazione !== 'string') return no('registrazione');
    if (typeof p.etichetta !== 'string' || !Array.isArray(p.candidati)) return no('passo');
    // L'etichetta mancante non vale "nessuna": la chiave deve esserci.
    if (!('oro' in p) || (p.oro !== null && typeof p.oro !== 'string')) return no('oro');
    if ('secondoGiudizio' in p && p.secondoGiudizio !== null && typeof p.secondoGiudizio !== 'string') return no('secondoGiudizio');
    const candidati: CandidatoOro[] = [];
    for (const c of p.candidati) {
      if (!oggetto(c) || !soloChiavi(c, ['voce', 'classe', 'somiglianza'])) return no('candidato');
      if (typeof c.voce !== 'string' || (c.classe !== 'stessi-componenti' && c.classe !== 'formulazione-simile')) return no('candidato');
      if (c.somiglianza !== undefined && typeof c.somiglianza !== 'number') return no('candidato');
      candidati.push({ voce: c.voce, classe: c.classe, ...(c.somiglianza !== undefined ? { somiglianza: c.somiglianza } : {}) });
    }
    passi.push({
      id: p.id,
      fonte: p.fonte,
      ...(p.registrazione !== undefined ? { registrazione: p.registrazione } : {}),
      etichetta: p.etichetta,
      candidati,
      oro: p.oro as string | null,
      ...('secondoGiudizio' in p ? { secondoGiudizio: p.secondoGiudizio as string | null } : {}),
    });
  }
  return { ok: true, insieme: { schema: 1, nome: x.nome, esempio: x.esempio, passi } };
}

// ---------------------------------------------------------------------------
// Le decisioni di un braccio
// ---------------------------------------------------------------------------

/** Per ogni passo: la voce proposta, o `null` = "nessuna". */
export type Decisioni = Map<string, string | null>;

/** Il braccio R: la regola che costa zero, applicata ai candidati dell'insieme. */
export function braccioRegole(insieme: InsiemeOro): Decisioni {
  const compito: Compito = {
    schema: 1,
    id: '00000000-000000-0000',
    funzione: 'frasi',
    sorgente: 'registrazione',
    variante: 'A',
    catalogo: { impronta: 'sha256:0', voci: 0 },
    passi: insieme.passi.map((p, i) => ({
      n: i + 1,
      parola: 'When',
      etichetta: p.etichetta,
      anche: [],
      candidati: p.candidati.map((c) => ({
        voce: c.voce, classe: c.classe, stato: 'wanted', parametri: false,
        ...(c.somiglianza !== undefined ? { somiglianza: c.somiglianza } : {}),
      })),
    })),
  };
  const decisioni: Decisioni = new Map();
  for (const r of proponiConRegole(compito).proposte) {
    const passo = insieme.passi[r.passo - 1];
    decisioni.set(passo.id, r.scelta === 'voce' ? r.voce : null);
  }
  return decisioni;
}

// ---------------------------------------------------------------------------
// Le misure
// ---------------------------------------------------------------------------

export type EsitoPasso = 'giusta' | 'sbagliata' | 'astenuta-bene' | 'doveva-astenersi' | 'persa';

export interface Misura {
  passi: number;
  /** Passi che hanno ricevuto una voce. */
  proposte: number;
  giuste: number;
  /** Fra le proposte con una voce, quante giuste. */
  precisione: number | null;
  /** Passi che hanno una voce giusta secondo l'oro. */
  conVoceGiusta: number;
  /** Fra i passi che hanno una voce giusta, quanti l'hanno ricevuta. */
  copertura: number | null;
  senzaVoceGiusta: number;
  astenuti: number;
  /** Fra i passi senza voce giusta, quanti hanno ricevuto "nessuna". */
  astensione: number | null;
  /** La voce giusta e' fra i candidati? Se e' bassa nessuna scelta puo' aiutare. */
  richiamoRosa: number | null;
  /** Proposte con una voce che una persona ha accettato. */
  accettate: number;
  /** Fra le accettate, quelle sbagliate (distorsione da automazione). */
  falsiAccetti: number;
  tassoFalsiAccetti: number | null;
  perPasso: Array<{ id: string; esito: EsitoPasso }>;
}

const rapporto = (n: number, d: number): number | null => (d === 0 ? null : n / d);

export function misura(insieme: InsiemeOro, decisioni: Decisioni, opzioni: { accettate?: ReadonlySet<string> } = {}): Misura {
  const ids = new Set(insieme.passi.map((p) => p.id));
  for (const id of decisioni.keys()) if (!ids.has(id)) throw new Error(`decisione per un passo che non esiste: ${id}`);
  for (const id of ids) if (!decisioni.has(id)) throw new Error(`manca la decisione per il passo ${id}: non si misura a meta'`);

  let proposte = 0, giuste = 0, conVoceGiusta = 0, senzaVoceGiusta = 0, astenuti = 0, nellaRosa = 0;
  let accettate = 0, falsiAccetti = 0;
  const perPasso: Misura['perPasso'] = [];

  for (const p of insieme.passi) {
    const scelta = decisioni.get(p.id) ?? null;
    let esito: EsitoPasso;
    if (p.oro !== null) {
      conVoceGiusta++;
      if (p.candidati.some((c) => c.voce === p.oro)) nellaRosa++;
    } else {
      senzaVoceGiusta++;
    }
    if (scelta !== null) {
      proposte++;
      if (p.oro === null) esito = 'doveva-astenersi';
      else if (p.oro === scelta) { esito = 'giusta'; giuste++; }
      else esito = 'sbagliata';
      if (opzioni.accettate?.has(p.id)) {
        accettate++;
        if (esito !== 'giusta') falsiAccetti++;
      }
    } else if (p.oro === null) {
      astenuti++;
      esito = 'astenuta-bene';
    } else {
      esito = 'persa';
    }
    perPasso.push({ id: p.id, esito });
  }

  return {
    passi: insieme.passi.length,
    proposte,
    giuste,
    precisione: rapporto(giuste, proposte),
    conVoceGiusta,
    copertura: rapporto(giuste, conVoceGiusta),
    senzaVoceGiusta,
    astenuti,
    astensione: rapporto(astenuti, senzaVoceGiusta),
    richiamoRosa: rapporto(nellaRosa, conVoceGiusta),
    accettate,
    falsiAccetti,
    tassoFalsiAccetti: rapporto(falsiAccetti, accettate),
    perPasso,
  };
}

/** Accordo fra i due giudici dell'insieme, sui soli passi che il secondo ha etichettato. */
export function accordoFraGiudici(insieme: InsiemeOro): { confrontati: number; concordi: number; accordo: number | null } {
  const doppi = insieme.passi.filter((p) => p.secondoGiudizio !== undefined);
  const concordi = doppi.filter((p) => p.secondoGiudizio === p.oro).length;
  return { confrontati: doppi.length, concordi, accordo: rapporto(concordi, doppi.length) };
}

/**
 * Quando un risultato e' solo aneddotico: l'insieme non ha la composizione minima
 * (60 passi, 30 da almeno 3 registrazioni vere, almeno il 25% di "nessuna") o e'
 * dichiarato un esempio.
 */
export function giudizioComposizione(insieme: InsiemeOro): { sufficiente: boolean; motivi: string[] } {
  const motivi: string[] = [];
  if (insieme.esempio) motivi.push("l'insieme e' un esempio finto: serve a provare il calcolo, non a misurare");
  if (insieme.passi.length < COMPOSIZIONE.passi) motivi.push(`servono almeno ${COMPOSIZIONE.passi} passi, ce ne sono ${insieme.passi.length}`);
  const dalleRegistrazioni = insieme.passi.filter((p) => p.fonte === 'registrazione');
  const registrazioni = new Set(dalleRegistrazioni.map((p) => p.registrazione ?? '').filter(Boolean));
  if (dalleRegistrazioni.length < COMPOSIZIONE.daRegistrazioni || registrazioni.size < COMPOSIZIONE.registrazioni) {
    motivi.push(
      `servono almeno ${COMPOSIZIONE.daRegistrazioni} passi da almeno ${COMPOSIZIONE.registrazioni} registrazioni vere ` +
        `(ci sono ${dalleRegistrazioni.length} da ${registrazioni.size})`
    );
  }
  const quota = insieme.passi.length === 0 ? 0 : insieme.passi.filter((p) => p.oro === null).length / insieme.passi.length;
  if (quota < COMPOSIZIONE.quotaNessuna) {
    motivi.push(`servono almeno il ${COMPOSIZIONE.quotaNessuna * 100}% di passi senza voce giusta, per provare l'astensione (c'e' il ${Math.round(quota * 100)}%)`);
  }
  return { sufficiente: motivi.length === 0, motivi };
}

/** Quota di passi con la stessa decisione in tutte le esecuzioni. Con una sola, niente da confrontare. */
export function stabilita(esecuzioni: readonly Decisioni[]): number | null {
  if (esecuzioni.length < 2) return null;
  const ids = [...esecuzioni[0].keys()];
  if (ids.length === 0) return null;
  const uguali = ids.filter((id) => esecuzioni.every((e) => e.get(id) === esecuzioni[0].get(id))).length;
  return uguali / ids.length;
}

/** Intervallo di Wilson al 95%: quanto si puo' dire con questi numeri. */
export function intervalloWilson(k: number, n: number): [number, number] {
  if (n === 0) return [0, 1];
  const z = 1.96;
  const p = k / n;
  const d = 1 + (z * z) / n;
  const centro = (p + (z * z) / (2 * n)) / d;
  const mezzo = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / d;
  return [Math.max(0, centro - mezzo), Math.min(1, centro + mezzo)];
}

// ---------------------------------------------------------------------------
// Il criterio d'ingresso
// ---------------------------------------------------------------------------

export interface MisureBraccio {
  precisione: number | null;
  copertura: number | null;
  astensione: number | null;
  stabilita?: number | null;
}

const EPS = 1e-9;

export interface EsitoCriterio {
  /** P >= 0,90 e A >= 0,80. `null` = non calcolabile. */
  sicurezza: boolean | null;
  /** C supera quella delle regole di almeno 0,15, con P non inferiore a quella delle regole meno 0,02. */
  valore: boolean | null;
  /** S >= 0,80. */
  stabilita: boolean | null;
  /** Passa solo se passano tutti: un numero che manca non e' un si'. */
  passa: boolean;
}

/**
 * Il criterio di ingresso per un braccio assistente, contro le regole. (Gli altri
 * punti — nessuna regressione, falsi accetti, modello fissato, avversari — si
 * verificano con altri strumenti.)
 */
export function criterioDiIngresso(assistente: MisureBraccio, regole: MisureBraccio): EsitoCriterio {
  const tutti = (...v: Array<number | null | undefined>): boolean => v.every((x) => typeof x === "number");
  const sicurezza = tutti(assistente.precisione, assistente.astensione)
    ? assistente.precisione! >= SOGLIE.precisione - EPS && assistente.astensione! >= SOGLIE.astensione - EPS
    : null;
  const valore = tutti(assistente.copertura, regole.copertura, assistente.precisione, regole.precisione)
    ? assistente.copertura! - regole.copertura! >= SOGLIE.guadagnoCopertura - EPS &&
      assistente.precisione! >= regole.precisione! - SOGLIE.tolleranzaPrecisione - EPS
    : null;
  const stab = typeof assistente.stabilita === 'number' ? assistente.stabilita >= SOGLIE.stabilita - EPS : null;
  return { sicurezza, valore, stabilita: stab, passa: sicurezza === true && valore === true && stab === true };
}

// ---------------------------------------------------------------------------
// Il referto
// ---------------------------------------------------------------------------

const num = (x: number | null): string => (x === null ? 'n/d' : x.toFixed(3));

function conIntervallo(k: number, n: number): string {
  if (n === 0) return 'n/d';
  const [a, b] = intervalloWilson(k, n);
  return `${(k / n).toFixed(3)} (${k}/${n}, intervallo al 95%: ${a.toFixed(2)}-${b.toFixed(2)})`;
}

/** Un referto di soli numeri: niente frasi dei passi, niente voci del catalogo. */
export function formattaMisura(m: Misura): string {
  return [
    `passi                  ${m.passi}`,
    `precisione             ${conIntervallo(m.giuste, m.proposte)}`,
    `copertura              ${conIntervallo(m.giuste, m.conVoceGiusta)}`,
    `astensione             ${conIntervallo(m.astenuti, m.senzaVoceGiusta)}`,
    `richiamo della rosa    ${num(m.richiamoRosa)}`,
    `falsi accetti          ${m.accettate === 0 ? 'n/d' : `${m.falsiAccetti}/${m.accettate}`}`,
  ].join('\n');
}
