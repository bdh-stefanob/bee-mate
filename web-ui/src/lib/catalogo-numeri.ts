import type {
  ComponenteConStep,
  CoppiaRiconciliazione,
  RispostaCatalogo,
  StepCatalogo,
  StepPerConfronto,
  UsoScenario,
} from '@/components/cruscotto/catalogo/tipi';

/**
 * catalogo-numeri.ts
 * ------------------
 * I numeri dell'intestazione del Catalogo e il giudizio sulle coppie. Puro:
 * tutto cio' che la pagina conta o classifica sta qui, cosi' si prova senza
 * browser (vitest gira solo in ambiente node).
 */

export interface NumeriCatalogo {
  totale: number;
  pronti: number;
  richiesti: number;
  /** Proposti, superati e quelli senza stato: perche' pronti + richiesti + altri === totale. */
  altri: number;
  /** Gli STEP con almeno un componente (non i riferimenti ai componenti). */
  ancorati: number;
  /** I componenti distinti della mappa. */
  componenti: number;
}

export function numeriCatalogo(catalogo: Pick<RispostaCatalogo, 'step' | 'componenti'>): NumeriCatalogo {
  let pronti = 0;
  let richiesti = 0;
  let ancorati = 0;
  for (const s of catalogo.step) {
    if (s.stato === 'implemented') pronti++;
    else if (s.stato === 'wanted') richiesti++;
    if (s.componenti.length > 0) ancorati++;
  }
  const totale = catalogo.step.length;
  return { totale, pronti, richiesti, altri: totale - pronti - richiesti, ancorati, componenti: catalogo.componenti.length };
}

/** Gli scenari eseguibili: null mentre si carica NON e' 0 (la casella mostra lo scheletro, non uno zero falso). */
export function numeroScenari(file: readonly { scenari: readonly unknown[] }[] | null): number | null {
  if (file === null) return null;
  return file.reduce((somma, f) => somma + f.scenari.length, 0);
}

// ---------------------------------------------------------------- coppie

export type GruppoCoppia = 'doppione' | 'equivoco' | 'da-verificare' | 'informativa';

/**
 * Il gruppo di una coppia. Il caso che serve distinguere con cura: testo quasi
 * uguale ma almeno uno dei due SENZA componente. Il motore lo manda con
 * `stessoComponente: false` e dice "non si puo' concludere"; chiamarlo
 * "equivoco di denominazione" sarebbe un'affermazione piu' forte della sua.
 */
export function classificaCoppia(coppia: Pick<CoppiaRiconciliazione, 'motivo' | 'stessoComponente' | 'a' | 'b'>): GruppoCoppia {
  if (coppia.motivo === 'applicazioni-diverse') return 'informativa';
  if (coppia.stessoComponente) return 'doppione';
  if (coppia.a.componenti.length === 0 || coppia.b.componenti.length === 0) return 'da-verificare';
  return 'equivoco';
}

export interface NumeriCoppie {
  /** Doppioni + equivoci: le coppie su cui si puo' agire. E' il numero che puo' tornare a zero. */
  azionabili: number;
  doppioni: number;
  equivoci: number;
  daVerificare: number;
  soloSapere: number;
}

export function numeriCoppie(coppie: readonly Pick<CoppiaRiconciliazione, 'motivo' | 'stessoComponente' | 'a' | 'b'>[]): NumeriCoppie {
  const n = { doppioni: 0, equivoci: 0, daVerificare: 0, soloSapere: 0 };
  for (const c of coppie) {
    const g = classificaCoppia(c);
    if (g === 'doppione') n.doppioni++;
    else if (g === 'equivoco') n.equivoci++;
    else if (g === 'da-verificare') n.daVerificare++;
    else n.soloSapere++;
  }
  return { azionabili: n.doppioni + n.equivoci, ...n };
}

/** Un lato di coppia con gli scenari che lo usano, presi dal catalogo gia' letto. */
export type LatoArricchito = StepPerConfronto & { usatoIn: UsoScenario[] };

export type CoppiaArricchita = Omit<CoppiaRiconciliazione, 'a' | 'b'> & { a: LatoArricchito; b: LatoArricchito };

/**
 * `GET /api/catalogo/riconciliazione` non porta `usatoIn`: lo si prende
 * incrociando l'espressione con il catalogo. Frase non trovata: nessun uso.
 */
export function arricchisciCoppia(coppia: CoppiaRiconciliazione, step: readonly StepCatalogo[]): CoppiaArricchita {
  const usi = new Map<string, UsoScenario[]>();
  for (const s of step) usi.set(s.espressione, s.usatoIn);
  const lato = (s: StepPerConfronto): LatoArricchito => ({ ...s, usatoIn: usi.get(s.espressione) ?? [] });
  return { ...coppia, a: lato(coppia.a), b: lato(coppia.b) };
}

function usoComplessivo(c: CoppiaArricchita): number {
  return c.a.usatoIn.length + c.b.usatoIn.length;
}

export interface CoppieRaggruppate {
  doppioni: CoppiaArricchita[];
  equivoci: CoppiaArricchita[];
  daVerificare: CoppiaArricchita[];
  informative: CoppiaArricchita[];
}

/** I quattro gruppi, ognuno per uso complessivo decrescente (consolidare cio' che si usa di piu' rende di piu'), a parita' per id. */
export function raggruppaCoppie(coppie: readonly CoppiaArricchita[]): CoppieRaggruppate {
  const g: CoppieRaggruppate = { doppioni: [], equivoci: [], daVerificare: [], informative: [] };
  for (const c of coppie) {
    const gruppo = classificaCoppia(c);
    if (gruppo === 'doppione') g.doppioni.push(c);
    else if (gruppo === 'equivoco') g.equivoci.push(c);
    else if (gruppo === 'da-verificare') g.daVerificare.push(c);
    else g.informative.push(c);
  }
  const ordine = (a: CoppiaArricchita, b: CoppiaArricchita) => usoComplessivo(b) - usoComplessivo(a) || a.id.localeCompare(b.id);
  for (const lista of Object.values(g)) lista.sort(ordine);
  return g;
}

/**
 * Quanti scenari DISTINTI dipendono dal componente: l'unione degli `usatoIn`
 * dei suoi step. Uno scenario che passa da due step conta una volta; due
 * scenari con lo stesso nome in file diversi sono due. Step citati ma assenti
 * dal catalogo: ignorati.
 */
export function impattoComponente(componente: Pick<ComponenteConStep, 'step'>, step: readonly StepCatalogo[]): number {
  const perEspressione = new Map<string, StepCatalogo>();
  for (const s of step) perEspressione.set(s.espressione, s);
  const scenari = new Set<string>();
  for (const espressione of componente.step) {
    for (const uso of perEspressione.get(espressione)?.usatoIn ?? []) scenari.add(`${uso.file}\u0000${uso.scenario}`);
  }
  return scenari.size;
}

/** Gli scenari distinti (file + nome) dietro un componente, per il dettaglio della riga. */
export function scenariDelComponente(componente: Pick<ComponenteConStep, 'step'>, step: readonly StepCatalogo[]): { file: string; scenario: string }[] {
  const perEspressione = new Map<string, StepCatalogo>();
  for (const s of step) perEspressione.set(s.espressione, s);
  const visti = new Map<string, { file: string; scenario: string }>();
  for (const espressione of componente.step) {
    for (const uso of perEspressione.get(espressione)?.usatoIn ?? []) {
      visti.set(`${uso.file}\u0000${uso.scenario}`, { file: uso.file, scenario: uso.scenario });
    }
  }
  return [...visti.values()];
}

// ------------------------------------------------------------ aggiornamento

export type EsitoAggiornamento = 'in-corso' | 'ok' | 'fallita' | 'mai-eseguito';

/**
 * Quando la pagina deve rileggere catalogo e coppie da sola: solo quando
 * l'aggiornamento passa da "in corso" a "ok". Prima la tabella restava col
 * numero vecchio e il banner diceva solo "aggiornato".
 */
export function dopoAggiornamento(prima: EsitoAggiornamento | null, dopo: EsitoAggiornamento | null): boolean {
  return prima === 'in-corso' && dopo === 'ok';
}
