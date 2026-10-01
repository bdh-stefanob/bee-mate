import type { ComponenteConStep, StatoStep, StepCatalogo, StepPerConfronto } from '@/components/cruscotto/catalogo/tipi';
import { impattoComponente } from './catalogo-numeri';

/**
 * catalogo-filtri.ts
 * ------------------
 * Ricerca, filtri, ordinamenti e finestra delle liste del Catalogo. Puro: la
 * pagina li chiama con `useMemo`, i test li provano senza browser.
 */

/** Sopra questa soglia compare la barra degli strumenti: con tre voci una ricerca e' rumore. */
export const SOGLIA_FILTRI = 8;
/** Quante righe si disegnano per volta ("Mostra altri 50"). */
export const PASSO_FINESTRA = 50;

export function mostraFiltri(voci: number): boolean {
  return voci > SOGLIA_FILTRI;
}

/** Minuscole e senza accenti, per confrontare "Perché" con "perche". */
export function normalizza(testo: string): string {
  return testo.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}

/** Tutte le parole della ricerca devono comparire in almeno uno dei testi. Ricerca vuota: vero. */
function corrisponde(testi: readonly (string | undefined)[], q: string): boolean {
  const parole = normalizza(q).split(/\s+/).filter((p) => p.length > 0);
  if (parole.length === 0) return true;
  const pagliaio = testi.filter((t): t is string => !!t).map(normalizza).join('\n');
  return parole.every((p) => pagliaio.includes(p));
}

function confrontaAz(a: string, b: string): number {
  const na = normalizza(a);
  const nb = normalizza(b);
  return na < nb ? -1 : na > nb ? 1 : 0;
}

// ------------------------------------------------------------------- step

/** Gli stati come si scrivono nell'indirizzo (e come li legge il tester). */
export type StatoUrl = 'pronto' | 'richiesto' | 'proposto' | 'superato';

export const STATI_URL: readonly StatoUrl[] = ['pronto', 'richiesto', 'proposto', 'superato'];

export const STATO_DA_URL: Record<StatoUrl, StatoStep> = {
  pronto: 'implemented',
  richiesto: 'wanted',
  proposto: 'proposed',
  superato: 'deprecated',
};

export type OrdineStep = 'az' | 'usi' | 'senza-componente';

export const ORDINI_STEP: readonly OrdineStep[] = ['az', 'usi', 'senza-componente'];

export interface VistaStep {
  q: string;
  app: string | null;
  stato: StatoUrl | null;
  senzaComponente: boolean;
  ordina: OrdineStep;
}

export const VISTA_STEP_VUOTA: VistaStep = { q: '', app: null, stato: null, senzaComponente: false, ordina: 'az' };

export function filtraStep(step: readonly StepCatalogo[], vista: VistaStep): StepCatalogo[] {
  const stato = vista.stato ? STATO_DA_URL[vista.stato] : null;
  const risultato = step.filter((s) => {
    if (vista.app !== null && s.app !== vista.app) return false;
    if (stato !== null && s.stato !== stato) return false;
    if (vista.senzaComponente && s.componenti.length > 0) return false;
    return corrisponde([s.espressione, s.intento, ...s.componenti.flatMap((c) => [c.name, c.page])], vista.q);
  });
  const az = (a: StepCatalogo, b: StepCatalogo) => confrontaAz(a.espressione, b.espressione);
  // Array.prototype.sort e' stabile: a parita' resta l'ordine del catalogo.
  if (vista.ordina === 'usi') {
    const algunoUsato = risultato.some((s) => s.usatoIn.length > 0);
    return algunoUsato ? risultato.sort((a, b) => b.usatoIn.length - a.usatoIn.length) : risultato.sort(az);
  }
  if (vista.ordina === 'senza-componente') {
    return risultato.sort((a, b) => Number(a.componenti.length > 0) - Number(b.componenti.length > 0) || az(a, b));
  }
  return risultato.sort(az);
}

/** Quanti step per stato, sul catalogo INTERO (i pulsanti portano il conteggio). */
export function conteggiStato(step: readonly StepCatalogo[]): Record<StatoUrl, number> {
  const n: Record<StatoUrl, number> = { pronto: 0, richiesto: 0, proposto: 0, superato: 0 };
  for (const s of step) {
    for (const k of STATI_URL) if (STATO_DA_URL[k] === s.stato) n[k]++;
  }
  return n;
}

/** Le applicazioni presenti, in ordine alfabetico: il filtro compare solo se sono piu' di una. */
export function applicazioniDi(step: readonly { app: string }[]): string[] {
  return [...new Set(step.map((s) => s.app))].sort(confrontaAz);
}

// ------------------------------------------------------------- componenti

export type OrdineComponenti = 'step' | 'scenari' | 'az';

export const ORDINI_COMPONENTI: readonly OrdineComponenti[] = ['step', 'scenari', 'az'];

export interface VistaComponenti {
  q: string;
  app: string | null;
  ambigua: boolean;
  ordina: OrdineComponenti;
}

export const VISTA_COMPONENTI_VUOTA: VistaComponenti = { q: '', app: null, ambigua: false, ordina: 'step' };

export function filtraComponenti(
  componenti: readonly ComponenteConStep[],
  step: readonly StepCatalogo[],
  vista: VistaComponenti
): ComponenteConStep[] {
  const risultato = componenti.filter((c) => {
    if (vista.app !== null && !c.apps.includes(vista.app)) return false;
    if (vista.ambigua && !(c.pagineAmbigue && c.pagineAmbigue.length > 0)) return false;
    return corrisponde([c.name, c.role, c.page, ...(c.pagineAmbigue ?? []), ...c.step], vista.q);
  });
  if (vista.ordina === 'az') return risultato.sort((a, b) => confrontaAz(a.name, b.name));
  if (vista.ordina === 'scenari') {
    const impatto = new Map(risultato.map((c) => [c, impattoComponente(c, step)] as const));
    return risultato.sort((a, b) => impatto.get(b)! - impatto.get(a)! || b.step.length - a.step.length);
  }
  return risultato.sort((a, b) => b.step.length - a.step.length);
}

// ----------------------------------------------------------------- coppie

export interface VistaCoppie {
  q: string;
  app: string | null;
}

export const VISTA_COPPIE_VUOTA: VistaCoppie = { q: '', app: null };

export function filtraCoppie<T extends { a: Pick<StepPerConfronto, 'espressione' | 'app'>; b: Pick<StepPerConfronto, 'espressione' | 'app'> }>(
  coppie: readonly T[],
  vista: VistaCoppie
): T[] {
  return coppie.filter((c) => {
    if (vista.app !== null && c.a.app !== vista.app && c.b.app !== vista.app) return false;
    return corrisponde([c.a.espressione, c.b.espressione], vista.q);
  });
}

// ---------------------------------------------------------------- finestra

export function tagliaFinestra<T>(voci: readonly T[], quante: number): T[] {
  return voci.slice(0, quante);
}

export function ampliaFinestra(quante: number, totale: number): number {
  return Math.min(quante + PASSO_FINESTRA, totale);
}

/** Quanti filtri sono attivi (la ricerca conta): decide se mostrare "Togli i filtri". */
export function filtriAttivi(vista: { q: string; app: string | null; stato?: unknown; senzaComponente?: boolean; ambigua?: boolean }): number {
  return (
    (vista.q.trim() ? 1 : 0) +
    (vista.app !== null ? 1 : 0) +
    (vista.stato ? 1 : 0) +
    (vista.senzaComponente ? 1 : 0) +
    (vista.ambigua ? 1 : 0)
  );
}
