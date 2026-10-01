import * as fs from 'fs';
import * as path from 'path';
import {
  validaCompito,
  validaPropostaOggetto,
  type Compito,
  type Origin,
} from './suggerimenti-contratto';
import { proponiConRegole, vistaSuggerimenti, type RigaVista } from './suggerimenti-regole';
import {
  annulla,
  applica,
  ErroreApplicazione,
  type EsitoFile,
  type EsitoGiudice,
  type Giudici,
  type Scelta,
} from './suggerimenti-applica';

/**
 * I suggerimenti, dal lato del server: leggono l'ultima generazione, scrivono i file
 * del contratto sotto `reports/assistente/<id>/` (gitignorato: niente esce) e
 * chiamano `applica`/`annulla`. Le rotte sono sottili e chiamano queste funzioni:
 * niente script lanciati, niente comandi nuovi nell'elenco chiuso.
 *
 * Dalla finestra arrivano solo l'id (una forma, non un percorso) e le scelte
 * (numero di passo e frase). Quali file toccare lo dice il manifesto della
 * generazione, che si legge qui sul server.
 */

const MANIFESTO = path.join('reports', 'cruscotto', 'generazione-manifesto.json');
const CARTELLA_PROPOSTE = path.join('reports', 'assistente');
const ID_VALIDO = /^[0-9]{8}-[0-9]{6}-[0-9a-f]{4}$/;

export type RispostaSuggerimenti =
  | { stato: 'nessuno' }
  | {
      stato: 'pronte';
      id: string;
      origin: Origin;
      righe: RigaVista[];
      /** Quante righe si possono applicare: se e' zero il riquadro non compare. */
      applicabili: number;
    }
  | { stato: 'applicate'; id: string; usate: number };

export type RispostaApplicazione =
  | { esito: 'applicato'; usate: number; origineFile: Origin }
  | { esito: 'rifiutato-dai-giudici'; giudici: Array<{ nome: string; ok: boolean }> };

interface Manifesto {
  compito?: unknown;
  files?: Array<{ path?: string; origin?: string }>;
}

function leggiManifesto(radice: string): Manifesto | null {
  try {
    return JSON.parse(fs.readFileSync(path.join(radice, MANIFESTO), 'utf-8')) as Manifesto;
  } catch {
    return null;
  }
}

function compitoDelManifesto(m: Manifesto | null): Compito | null {
  if (!m?.compito) return null;
  const e = validaCompito(m.compito);
  return e.ok ? e.compito : null;
}

function percorsiDelManifesto(m: Manifesto): { feature?: string; steps?: string } {
  const p = (m.files ?? []).map((f) => (f.path ?? '').replace(/\\/g, '/'));
  return {
    feature: p.find((x) => x.startsWith('src/features/generated/') && x.endsWith('.feature')),
    steps: p.find((x) => x.startsWith('src/steps/generated/') && x.endsWith('.steps.ts')),
  };
}

function cartellaDi(radice: string, id: string): string {
  if (!ID_VALIDO.test(id)) throw new ErroreApplicazione('id-non-valido', 'identificativo non valido');
  return path.join(radice, CARTELLA_PROPOSTE, id);
}

function leggiEsito(cartella: string): EsitoFile | null {
  try {
    return JSON.parse(fs.readFileSync(path.join(cartella, 'esito.json'), 'utf-8')) as EsitoFile;
  } catch {
    return null;
  }
}

/** Prepara i suggerimenti dell'ultimo scenario generato: compito e proposta, su disco, e la vista. */
export function preparaSuggerimenti(radice: string): RispostaSuggerimenti {
  const compito = compitoDelManifesto(leggiManifesto(radice));
  if (!compito) return { stato: 'nessuno' };

  const cartella = cartellaDi(radice, compito.id);
  const esito = leggiEsito(cartella);
  if (esito?.esito === 'applicato') {
    return { stato: 'applicate', id: compito.id, usate: esito.conteggi.accettate };
  }

  const proposta = proponiConRegole(compito);
  const valida = validaPropostaOggetto(proposta, compito);
  if (valida.tipo !== 'valida') return { stato: 'nessuno' };

  const righe = vistaSuggerimenti(compito, valida.righe);
  const applicabili = righe.filter((r) => r.motivoNonApplicabile === null).length;
  // Niente da offrire, niente riquadro: non si disturba chi non ha niente da scegliere.
  if (applicabili === 0) return { stato: 'nessuno' };

  fs.mkdirSync(cartella, { recursive: true });
  fs.writeFileSync(path.join(cartella, 'compito.json'), JSON.stringify(compito, null, 2));
  fs.writeFileSync(path.join(cartella, 'proposta.json'), JSON.stringify(proposta, null, 2));
  return { stato: 'pronte', id: compito.id, origin: valida.origin, righe, applicabili };
}

export async function applicaSuggerimenti(
  radice: string,
  corpo: { id: string; scelte: Scelta[] },
  giudici: Giudici
): Promise<RispostaApplicazione> {
  const cartella = cartellaDi(radice, corpo.id);
  const manifesto = leggiManifesto(radice);
  const corrente = compitoDelManifesto(manifesto);

  // Una generazione piu' recente ha cambiato il compito: le scelte non valgono piu'.
  if (!manifesto || !corrente || corrente.id !== corpo.id) {
    throw new ErroreApplicazione('scaduta', 'il catalogo o lo scenario sono cambiati dopo i suggerimenti');
  }

  // Il compito e la proposta si rileggono dal disco e si rivalidano: sono file, e un
  // file si puo' aver cambiato (o non c'e' mai stato).
  let compito: Compito;
  let propostaGrezza: unknown;
  try {
    const c = validaCompito(JSON.parse(fs.readFileSync(path.join(cartella, 'compito.json'), 'utf-8')));
    if (!c.ok) throw new Error('compito non valido');
    compito = c.compito;
    propostaGrezza = JSON.parse(fs.readFileSync(path.join(cartella, 'proposta.json'), 'utf-8'));
  } catch {
    throw new ErroreApplicazione('compito-non-trovato', 'non trovo i suggerimenti: chiedili di nuovo');
  }
  const proposta = validaPropostaOggetto(propostaGrezza, compito);
  if (proposta.tipo === 'scaduta') throw new ErroreApplicazione('scaduta', 'i suggerimenti sono scaduti');
  if (proposta.tipo === 'rifiutata') throw new ErroreApplicazione('compito-non-trovato', 'i suggerimenti non sono leggibili');

  const { feature, steps } = percorsiDelManifesto(manifesto);
  if (!feature || !steps) throw new ErroreApplicazione('file-non-trovato', 'non trovo lo scenario appena generato');

  const r = await applica({ radice, cartella, featureRel: feature, stepsRel: steps, compito, proposta, scelte: corpo.scelte, giudici });
  if (r.esito === 'rifiutato-dai-giudici') {
    return { esito: 'rifiutato-dai-giudici', giudici: r.giudici.map((g: EsitoGiudice) => ({ nome: g.nome, ok: g.ok })) };
  }

  // L'origine dei file sta nel manifesto, accanto a quella di tutti gli altri.
  if (r.origineFile === 'assistito' && manifesto.files) {
    for (const f of manifesto.files) {
      const p = (f.path ?? '').replace(/\\/g, '/');
      if (p === feature || p === steps) f.origin = 'assistito';
    }
    fs.writeFileSync(path.join(radice, MANIFESTO), JSON.stringify(manifesto, null, 2));
  }
  return { esito: 'applicato', usate: r.sostituzioni.length, origineFile: r.origineFile };
}

export async function annullaSuggerimenti(radice: string, id: string): Promise<{ esito: 'annullato' }> {
  const r = await annulla({ radice, cartella: cartellaDi(radice, id) });
  // Annullate le scelte, i file tornano a essere quelli di prima anche nel manifesto.
  const manifesto = leggiManifesto(radice);
  if (manifesto?.files) {
    const { feature, steps } = percorsiDelManifesto(manifesto);
    for (const f of manifesto.files) {
      const p = (f.path ?? '').replace(/\\/g, '/');
      if ((p === feature || p === steps) && f.origin === 'assistito') f.origin = 'deterministico';
    }
    fs.writeFileSync(path.join(radice, MANIFESTO), JSON.stringify(manifesto, null, 2));
  }
  return r;
}
