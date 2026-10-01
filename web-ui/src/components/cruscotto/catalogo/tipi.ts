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

export interface ComportamentoStep {
  /** Le chiamate alle Page Object nel corpo dello step, in ordine — assente se il corpo non e' interpretabile. */
  chiamate?: string[];
  /** Il corpo grezzo del gestore. */
  corpo: string;
}

/** Lo stato di uno step nel catalogo su disco (`CatalogStep.status`). */
export type StatoStep = 'implemented' | 'wanted' | 'deprecated' | 'proposed';

export interface StepCatalogo {
  espressione: string;
  documentato: boolean;
  /** Opzionali e additivi: una risposta senza questi campi resta valida. */
  stato?: StatoStep;
  /** La frase per il tester (`doc.intent`), se il catalogo la porta. */
  intento?: string;
  /** L'applicazione a cui appartiene: nome reale, oppure `common`/`generated`. */
  app: string;
  componenti: ComponenteCatalogo[];
  usatoIn: UsoScenario[];
  /** Cosa fa quando gira, se leggibile: vedi `ComportamentoStep`. */
  comportamento?: ComportamentoStep;
}

export interface ComponenteConStep {
  role: string;
  name: string;
  page?: string;
  /** Presente solo quando le occorrenze dichiarano pagine diverse: non fuse, elencate. */
  pagineAmbigue?: string[];
  step: string[];
  /** Le applicazioni degli step che dichiarano questo componente. */
  apps: string[];
}

export interface RispostaCatalogo {
  step: StepCatalogo[];
  componenti: ComponenteConStep[];
}

export type MotivoCoppia = 'testo-quasi-uguale' | 'stessi-componenti' | 'applicazioni-diverse';

/** Cio' che la riconciliazione porta di ogni lato di una coppia: la vista leggera del motore, senza `usatoIn`. */
export interface StepPerConfronto {
  espressione: string;
  documentato: boolean;
  app: string;
  componenti: ComponenteCatalogo[];
}

export interface CoppiaRiconciliazione {
  id: string;
  motivo: MotivoCoppia;
  spiegazione: string;
  a: StepPerConfronto;
  b: StepPerConfronto;
  /** true = stesso componente dietro le due frasi (doppione da fondere).
   *  false = componenti diversi (equivoco di denominazione, da distinguere),
   *  oppure applicazioni diverse (`motivo === 'applicazioni-diverse'`: solo
   *  informazione, nessun gesto offerto). */
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

/** GET /api/catalogo/fondi?da=...&a=... — anteprima di sola lettura della fusione. */
export interface AnteprimaFusione {
  equivalenti: boolean;
  corpoDa: string | null;
  corpoA: string | null;
  definizionePersa: string;
  fileFeatureCoinvolti: number;
  righeCoinvolte: number;
  scenariCoinvolti: UsoScenario[];
  /** presente solo quando la GET risponde con un errore (frase non trovata, ecc.) */
  errore?: string;
}

export interface RispostaFusione {
  ok?: boolean;
  errore?: string;
  fileFeatureAggiornati?: number;
  definizioneRimossa?: string;
  equivalenti?: boolean;
  catalogoRigenerato?: boolean;
  /** presenti solo su errore 'corpi_diversi': i due comportamenti, da mostrare al tester. */
  corpoDa?: string | null;
  corpoA?: string | null;
}

export interface StatoAnnullamentoFusione {
  disponibile: boolean;
  quando?: string;
  da?: string;
  a?: string;
}

/**
 * L'esito dell'ultima modifica al vocabolario, tenuto dalla scheda (non dalla
 * coppia: la coppia sparisce appena la lista si rilegge, e con lei il messaggio).
 */
export interface EsitoOperazione {
  tipo: 'fusione' | 'distinzione' | 'annullata' | 'ripristino';
  da?: string;
  a?: string;
  righe?: number;
  /** false = il catalogo non si e' rigenerato da solo: i numeri potrebbero essere vecchi. */
  catalogoRigenerato?: boolean;
  /** Solo la fusione si annulla con un pulsante. */
  annullabile: boolean;
  /** Cambia a ogni esito nuovo: e' cio' che riporta il focus sulla striscia. */
  id: number;
}
