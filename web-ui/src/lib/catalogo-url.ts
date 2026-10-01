import {
  ORDINI_COMPONENTI,
  ORDINI_STEP,
  STATI_URL,
  VISTA_COMPONENTI_VUOTA,
  VISTA_COPPIE_VUOTA,
  VISTA_STEP_VUOTA,
  type OrdineComponenti,
  type OrdineStep,
  type StatoUrl,
  type VistaComponenti,
  type VistaCoppie,
  type VistaStep,
} from './catalogo-filtri';

/**
 * catalogo-url.ts
 * ---------------
 * I filtri di ogni scheda da e verso l'indirizzo, e `urlCatalogo` per i link
 * che arrivano da altre pagine. Puro. Regole:
 *  - un valore sconosciuto si IGNORA (non svuota la lista): un link vecchio
 *    o scritto a mano non deve mostrare "nessun risultato";
 *  - i valori di default non si scrivono, e l'ordine dei parametri e' fisso:
 *    lo stesso stato da' sempre lo stesso indirizzo.
 */

function comeParametri(p: string | URLSearchParams): URLSearchParams {
  return new URLSearchParams(typeof p === 'string' ? p : p.toString());
}

function ammesso<T extends string>(valore: string | null, ammessi: readonly T[]): T | null {
  return valore !== null && (ammessi as readonly string[]).includes(valore) ? (valore as T) : null;
}

function testo(p: URLSearchParams, chiave: string): string {
  return p.get(chiave) ?? '';
}

// ------------------------------------------------------------------- step

export function parseVistaStep(parametri: string | URLSearchParams): VistaStep {
  const p = comeParametri(parametri);
  return {
    q: testo(p, 'q'),
    app: p.get('app') || null,
    stato: ammesso<StatoUrl>(p.get('stato'), STATI_URL),
    senzaComponente: p.get('senza-componente') === '1',
    ordina: ammesso<OrdineStep>(p.get('ordina'), ORDINI_STEP) ?? VISTA_STEP_VUOTA.ordina,
  };
}

export function serializzaVistaStep(v: VistaStep): string {
  const p = new URLSearchParams();
  if (v.q.trim()) p.set('q', v.q);
  if (v.app) p.set('app', v.app);
  if (v.stato) p.set('stato', v.stato);
  if (v.senzaComponente) p.set('senza-componente', '1');
  if (v.ordina !== VISTA_STEP_VUOTA.ordina) p.set('ordina', v.ordina);
  return p.toString();
}

// ------------------------------------------------------------- componenti

export function parseVistaComponenti(parametri: string | URLSearchParams): VistaComponenti {
  const p = comeParametri(parametri);
  return {
    q: testo(p, 'q'),
    app: p.get('app') || null,
    ambigua: p.get('ambigua') === '1',
    ordina: ammesso<OrdineComponenti>(p.get('ordina'), ORDINI_COMPONENTI) ?? VISTA_COMPONENTI_VUOTA.ordina,
  };
}

export function serializzaVistaComponenti(v: VistaComponenti): string {
  const p = new URLSearchParams();
  if (v.q.trim()) p.set('q', v.q);
  if (v.app) p.set('app', v.app);
  if (v.ambigua) p.set('ambigua', '1');
  if (v.ordina !== VISTA_COMPONENTI_VUOTA.ordina) p.set('ordina', v.ordina);
  return p.toString();
}

// ----------------------------------------------------------------- coppie

export function parseVistaCoppie(parametri: string | URLSearchParams): VistaCoppie {
  const p = comeParametri(parametri);
  return { q: testo(p, 'q'), app: p.get('app') || VISTA_COPPIE_VUOTA.app };
}

export function serializzaVistaCoppie(v: VistaCoppie): string {
  const p = new URLSearchParams();
  if (v.q.trim()) p.set('q', v.q);
  if (v.app) p.set('app', v.app);
  return p.toString();
}

// -------------------------------------------------------------- urlCatalogo

export interface OpzioniUrlCatalogo {
  scheda: 'step' | 'componenti' | 'da-sistemare';
  q?: string;
  app?: string;
  stato?: StatoUrl;
  senzaComponente?: boolean;
  ambigua?: boolean;
  ordina?: string;
}

/**
 * `/catalogo?scheda=...` con i filtri: cosi' la pagina Scenari o l'Esecuzione
 * puntano a "questo step nel catalogo" senza scrivere a mano l'indirizzo.
 * `scheda` si scrive sempre.
 */
export function urlCatalogo(o: OpzioniUrlCatalogo): string {
  const p = new URLSearchParams();
  p.set('scheda', o.scheda);
  if (o.q?.trim()) p.set('q', o.q);
  if (o.app) p.set('app', o.app);
  if (o.stato) p.set('stato', o.stato);
  if (o.senzaComponente) p.set('senza-componente', '1');
  if (o.ambigua) p.set('ambigua', '1');
  if (o.ordina) p.set('ordina', o.ordina);
  return `/catalogo?${p.toString()}`;
}
