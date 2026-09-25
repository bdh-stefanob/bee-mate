/**
 * Forme JSON del contratto `.superpowers/sdd/2026-09-22-cruscotto-tester/contratto-catalogo.md`.
 *
 * Questi tipi descrivono cosa risponde il motore (le rotte `/api/catalogo*`),
 * costruito in parallelo da un altro lavoro. Non sono un duplicato dei tipi in
 * `@/lib/types` (quelli descrivono il catalogo su disco, in inglese, per il
 * vecchio portale): questi sono la forma esatta del contratto, in italiano,
 * e vivono qui perche' il perimetro di questo lavoro non include `src/lib`.
 */

export interface ComponenteCatalogo {
  role: string;
  name: string;
  page?: string;
}

export interface UsoScenario {
  file: string;
  scenario: string;
  riga: number;
}

export interface StepCatalogo {
  espressione: string;
  documentato: boolean;
  componenti: ComponenteCatalogo[];
  usatoIn: UsoScenario[];
}

export interface ComponenteConStep {
  role: string;
  name: string;
  page?: string;
  step: string[];
}

export interface RispostaCatalogo {
  step: StepCatalogo[];
  componenti: ComponenteConStep[];
}

export type MotivoCoppia = 'testo-quasi-uguale' | 'stessi-componenti';

export interface CoppiaRiconciliazione {
  id: string;
  motivo: MotivoCoppia;
  spiegazione: string;
  a: StepCatalogo;
  b: StepCatalogo;
  /** true = stesso componente dietro le due frasi (doppione da fondere).
   *  false = componenti diversi (equivoco di denominazione, da distinguere). */
  stessoComponente: boolean;
}

export interface RispostaRiconciliazione {
  coppie: CoppiaRiconciliazione[];
}

export interface RichiestaRiconcilia {
  da: string;
  a: string;
}

export interface RispostaRiconcilia {
  ok: boolean;
  errore?: string;
}
