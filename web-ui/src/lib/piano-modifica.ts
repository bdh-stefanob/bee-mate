import * as fs from 'fs';
import * as path from 'path';
import { createHash } from 'crypto';
import type { CatalogStep } from './types';
import { walkFeatures } from './features';
import { improntaDiTesto } from './impronta-scenario';
import { espressioneInRegex, trovaUsatoIn } from './catalogo';
import { individuaCoppie } from './riconciliazione';
import { pianificaRinomina } from './rinomina-passo';
import { haParametri } from './riscrittura-step';
import { leggiPassi, titoloDi, togliMarcatore } from './modifica-scenario';
import { MARCATORE } from './marcatore';
import {
  convalidaTesto,
  controlloVero,
  type EsitoControlloVero,
  type Messaggio,
} from './convalida-scenario';
import {
  giudicaRinominabile,
  leggiCatalogoPassi,
  percorsoFeature,
  ragioneNonModificabile,
} from './contenuto-scenario';
import { ErrorePiano, type RadiciModifica } from './errore-piano';

export { ErrorePiano } from './errore-piano';
export type { RadiciModifica } from './errore-piano';

/**
 * Pianificare e applicare una modifica a uno scenario salvato
 * (docs/superpowers/specs/2026-10-01-modifica-scenari-e-dismissione-portale-design.md,
 * A3, A4 e A6). Stessa meccanica di `suggerimenti-applica.ts`, non una seconda:
 *
 *  - `pianifica` legge il disco e NON scrive: restituisce cosa si scriverebbe, con
 *    i blocchi e gli avvisi del controllo rapido e le conseguenze (quali scenari
 *    diventano "tuoi"). Si calcola tutto prima di scrivere un solo file.
 *  - `applica` rilegge i file subito prima di scrivere (se uno e' cambiato dal
 *    piano: `conflitto`, niente scritto), salva l'istantanea, scrive ogni file in un
 *    temporaneo accanto e lo rinomina, lancia il controllo vero e, se boccia o se
 *    una scrittura fallisce a meta', ripristina ogni file byte per byte.
 *  - `annulla` rimette le istantanee, ma solo se ogni file e' ancora com'era dopo
 *    la modifica (`cambiato-dopo`: non si cancella il lavoro di un altro).
 *
 * REGOLA DEL MARCATORE: chi modifica rende suo il file. Ogni `.feature` e
 * `.steps.ts` riscritto davvero perde la riga del marcatore di generazione; le
 * Page Object non si toccano mai (questo modulo non ne scrive nemmeno una); una
 * bozza non ancora salvata (`generated/`) tiene il suo marcatore, perche' senza non
 * si potrebbe piu' salvare. Nessun tag cambia.
 */

export type Operazione =
  | { operazione: 'testo'; file: string; versione: string; testo: string }
  | { operazione: 'rinomina'; file: string; versione: string; da: string; a: string };

export interface FileDelPiano {
  /** Relativo alla radice del repository, con `/`. Mai mostrato al tester. */
  rel: string;
  categoria: 'feature' | 'steps';
  vecchio: string;
  nuovo: string;
  /** Aveva il marcatore e adesso no. */
  perdeMarcatore: boolean;
}

export interface ScenarioToccato {
  /** Relativo a `src/features/`. */
  file: string;
  nome: string;
  /** Con questa modifica diventa "tuo": non lo riscrive piu' la generazione. */
  diventaTuo: boolean;
}

export interface Piano {
  operazione: Operazione['operazione'];
  /** Lo scenario aperto, relativo a `src/features/`. */
  file: string;
  /** L'impronta dello scenario aperto com'era quando si e' pianificato. */
  versionePrima: string;
  scritture: FileDelPiano[];
  /** I `.feature` toccati (relativi a `src/features/`): il controllo vero guarda quelli. */
  featureToccati: string[];
  /** Lo scenario aperto dopo la modifica. */
  testoAperto: string;
  marcatoreTolto: boolean;
  blocchi: Messaggio[];
  avvisi: Messaggio[];
  conseguenze: { scenari: ScenarioToccato[] };
  /** Dopo la scrittura il catalogo va rigenerato (cambia una definizione). */
  rigeneraCatalogo: boolean;
  /**
   * Rinomina: la frase vecchia e la nuova. Prima di rigenerare il catalogo si toglie la
   * vecchia voce se e' `wanted` (vedi `catalogo-voci.ts`); annullando, la nuova.
   */
  frasi?: { da: string; a: string };
}

// ---------------------------------------------------------------------------
// Utilita'
// ---------------------------------------------------------------------------

const sha = (testo: string | Buffer): string => createHash('sha256').update(testo).digest('hex');
const slash = (p: string): string => p.replace(/\\/g, '/');

const eolDi = (testo: string): string => (testo.includes('\r\n') ? '\r\n' : '\n');
const normalizzato = (testo: string): string => testo.replace(/\r\n?/g, '\n');

/** Il testo con i fine riga del file letto: scrivere non deve cambiarli. */
function conEolDi(riferimento: string, testo: string): string {
  const n = normalizzato(testo);
  return eolDi(riferimento) === '\r\n' ? n.replace(/\n/g, '\r\n') : n;
}

function leggiFile(assoluto: string): string | null {
  try {
    return fs.readFileSync(assoluto, 'utf-8');
  } catch {
    return null;
  }
}

function eInGenerated(file: string): boolean {
  return file.split('/')[0] === 'generated';
}

function nomeScenario(testo: string, rel: string): string {
  return titoloDi(testo) || path.basename(rel, '.feature');
}

/** Frasi che il file usava e non usa piu', e che nessun altro scenario usa: restano nel catalogo, e lo si dice. */
function passiNonPiuUsati(
  radici: RadiciModifica,
  catalogo: CatalogStep[],
  file: string,
  prima: string,
  dopo: string
): Messaggio[] {
  const fraseDopo = new Set(leggiPassi(dopo).map((p) => p.frase));
  const tolte = [...new Set(leggiPassi(prima).map((p) => p.frase))].filter((f) => !fraseDopo.has(f));
  if (tolte.length === 0) return [];

  const usi = trovaUsatoIn(catalogo, radici.featuresDir);
  const avvisi: Messaggio[] = [];
  for (const frase of tolte) {
    const trovati = catalogo.filter((s) => espressioneInRegex(s.expression).test(frase));
    if (trovati.length !== 1) continue;
    const espressione = trovati[0].expression;
    const regex = espressioneInRegex(espressione);
    if ([...fraseDopo].some((f) => regex.test(f))) continue;
    const altrove = (usi.get(espressione) ?? []).some((u) => u.file !== file);
    if (!altrove) avvisi.push({ codice: 'non-piu-usato', frase: espressione });
  }
  return avvisi;
}

// ---------------------------------------------------------------------------
// Il piano
// ---------------------------------------------------------------------------

export function pianifica(radici: RadiciModifica, op: Operazione): Piano {
  if (typeof op.file !== 'string' || typeof op.versione !== 'string') {
    throw new ErrorePiano('richiesta', 400, 'richiesta non valida');
  }
  const assoluto = percorsoFeature(radici, op.file);
  const corrente = fs.readFileSync(assoluto, 'utf-8');

  if (improntaDiTesto(corrente) !== op.versione) {
    throw new ErrorePiano('conflitto', 409, 'lo scenario e\' cambiato mentre lo modificavi');
  }
  const ragione = ragioneNonModificabile(op.file, corrente);
  if (ragione) throw new ErrorePiano('non-modificabile', 403, 'questo scenario non si modifica da qui', { ragione });

  return op.operazione === 'testo' ? pianificaTesto(radici, op, corrente) : pianificaRinominaPasso(radici, op, corrente);
}

function pianoVuoto(op: Operazione, corrente: string): Piano {
  return {
    operazione: op.operazione,
    file: op.file,
    versionePrima: improntaDiTesto(corrente),
    scritture: [],
    featureToccati: [],
    testoAperto: corrente,
    marcatoreTolto: false,
    blocchi: [],
    avvisi: [],
    conseguenze: { scenari: [] },
    rigeneraCatalogo: false,
  };
}

function pianificaTesto(radici: RadiciModifica, op: Extract<Operazione, { operazione: 'testo' }>, corrente: string): Piano {
  if (typeof op.testo !== 'string') throw new ErrorePiano('richiesta', 400, 'richiesta non valida');
  const piano = pianoVuoto(op, corrente);
  // Nessuna differenza: non si scrive niente e il marcatore resta.
  if (normalizzato(op.testo) === normalizzato(corrente)) return piano;

  const catalogo = leggiCatalogoPassi(radici.repoRoot);
  const { blocchi, avvisi } = convalidaTesto({ testo: op.testo, prima: corrente, catalogo });
  piano.blocchi = blocchi;
  piano.avvisi = [...avvisi, ...passiNonPiuUsati(radici, catalogo, op.file, corrente, op.testo)];

  const nuovo = conEolDi(corrente, togliMarcatore(op.testo));
  piano.scritture = [
    {
      rel: `src/features/${op.file}`,
      categoria: 'feature',
      vecchio: corrente,
      nuovo,
      perdeMarcatore: corrente.includes(MARCATORE) && !nuovo.includes(MARCATORE),
    },
  ];
  piano.featureToccati = [op.file];
  piano.testoAperto = nuovo;
  piano.marcatoreTolto = piano.scritture[0].perdeMarcatore;
  piano.conseguenze = { scenari: [{ file: op.file, nome: nomeScenario(nuovo, op.file), diventaTuo: piano.marcatoreTolto }] };
  return piano;
}

function pianificaRinominaPasso(
  radici: RadiciModifica,
  op: Extract<Operazione, { operazione: 'rinomina' }>,
  corrente: string
): Piano {
  if (typeof op.da !== 'string' || typeof op.a !== 'string') throw new ErrorePiano('richiesta', 400, 'richiesta non valida');
  const da = op.da;
  const a = op.a.trim();
  const catalogo = leggiCatalogoPassi(radici.repoRoot);

  const stepDa = catalogo.filter((s) => s.expression === da);
  const giudizio = giudicaRinominabile(stepDa);
  if (!giudizio.rinominabile || haParametri(a)) {
    throw new ErrorePiano('non-rinominabile', 400, 'questo passo non si puo\' rinominare da qui', {
      ragione: giudizio.rinominabile ? 'parametri' : giudizio.motivo,
    });
  }
  if (catalogo.some((s) => s.expression === a)) {
    throw new ErrorePiano('frase-esiste', 409, 'esiste gia\' un passo con questo nome');
  }

  const piano = pianificaRinomina(radici, da, a);
  if (!piano.ok) {
    if (piano.errore === 'catalogo_non_disponibile') throw new ErrorePiano('catalogo', 500, 'catalogo non leggibile');
    if (piano.errore === 'bersaglio_gia_esistente') throw new ErrorePiano('frase-esiste', 409, 'esiste gia\' un passo con questo nome');
    // Frase non valida, uguale, con parametri, definizione non trovata (o trovata piu' di una volta).
    throw new ErrorePiano('non-rinominabile', piano.stato, 'questo passo non si puo\' rinominare da qui', { ragione: piano.errore });
  }

  const risultato = pianoVuoto(op, corrente);
  const scritture: FileDelPiano[] = [];
  for (const s of piano.scritture) {
    const rel = slash(path.relative(radici.repoRoot, s.percorso));
    const vecchio = fs.readFileSync(s.percorso, 'utf-8');
    const categoria = rel.endsWith('.feature') ? 'feature' : 'steps';
    // Una bozza non ancora salvata tiene il marcatore: senza, "Salva" non la riconoscerebbe piu'.
    const bozza = categoria === 'feature' && eInGenerated(rel.replace(/^src\/features\//, ''));
    const nuovo = bozza ? s.testo : togliMarcatore(s.testo);
    scritture.push({ rel, categoria, vecchio, nuovo, perdeMarcatore: vecchio.includes(MARCATORE) && !nuovo.includes(MARCATORE) });
  }
  risultato.scritture = scritture;
  const features = scritture.filter((s) => s.categoria === 'feature');
  risultato.featureToccati = features.map((s) => s.rel.replace(/^src\/features\//, ''));
  risultato.rigeneraCatalogo = true;
  risultato.frasi = { da, a };
  risultato.conseguenze = {
    scenari: features.map((s) => {
      const file = s.rel.replace(/^src\/features\//, '');
      return { file, nome: nomeScenario(s.vecchio, file), diventaTuo: s.perdeMarcatore };
    }),
  };
  const aperta = features.find((s) => s.rel === `src/features/${op.file}`);
  risultato.testoAperto = aperta ? aperta.nuovo : corrente;
  risultato.marcatoreTolto = scritture.some((s) => s.perdeMarcatore);

  // Il controllo rapido, contro il catalogo come sara' dopo la rinomina.
  const catalogoDopo = catalogo.map((s) => (s.expression === da ? { ...s, expression: a } : s));
  const modificati = new Map(features.map((s) => [s.rel.replace(/^src\/features\//, ''), s.nuovo]));
  const altri = walkFeatures(radici.featuresDir)
    .filter((rel) => rel !== op.file)
    .flatMap((rel) => {
      const prima = leggiFile(path.join(radici.featuresDir, rel));
      return prima === null ? [] : [{ file: rel, prima, dopo: modificati.get(rel) ?? prima }];
    });
  const esito = convalidaTesto({
    testo: risultato.testoAperto,
    prima: corrente,
    catalogo: catalogoDopo,
    catalogoPrima: catalogo,
    altri,
  });
  risultato.blocchi = esito.blocchi;
  risultato.avvisi = esito.avvisi;
  for (const c of individuaCoppie(catalogoDopo)) {
    if (c.motivo === 'applicazioni-diverse') continue;
    const altra = c.a.espressione === a ? c.b.espressione : c.b.espressione === a ? c.a.espressione : null;
    if (altra) risultato.avvisi.push({ codice: 'simile', frase: a, altra, stessoComponente: c.stessoComponente });
  }
  return risultato;
}

// ---------------------------------------------------------------------------
// L'applicazione, con il disco
// ---------------------------------------------------------------------------

export interface OpzioniApplica {
  /** Il controllo vero sui `.feature` toccati (relativi a `src/features/`). Di norma `controlloVero`. */
  controllo?: (files: string[]) => Promise<EsitoControlloVero>;
  /** Scrive un file: solo per i test, per simulare un errore a meta'. */
  scriviFile?: (percorso: string, testo: string) => void;
  ora?: () => Date;
}

export interface EsitoApplica {
  /** Lo scenario aperto com'e' adesso (senza marcatore, coi fine riga del file): diventa il nuovo "letto" della bozza. */
  testo: string;
  /** L'impronta dello scenario aperto dopo la modifica. */
  versione: string;
  fileToccati: number;
  scenari: ScenarioToccato[];
  avvisi: Messaggio[];
  marcatoreTolto: boolean;
  rigeneraCatalogo: boolean;
  /** Rinomina: la voce `wanted` della frase vecchia va tolta dal catalogo prima di rigenerarlo. */
  catalogoDaTogliere?: string;
}

interface Istantanea {
  schema: 1;
  quando: string;
  operazione: Operazione['operazione'];
  file: string;
  stato: 'applicata' | 'annullata';
  rigeneraCatalogo: boolean;
  /** Rinomina: annullando, la voce della frase nuova va tolta dal catalogo prima di rigenerarlo. */
  frasiRinomina?: { da: string; a: string };
  files: Array<{ rel: string; prima: string; dopo: string }>;
}

const fileIstantanea = (radici: RadiciModifica) => path.join(radici.repoRoot, 'reports', 'modifiche', 'ultima-modifica.json');

/** Un file in un temporaneo accanto, poi rinominato: un lettore non vede mai un file a meta'. */
function scriviAtomico(percorso: string, testo: string): void {
  const temporaneo = `${percorso}.${process.pid}.tmp`;
  fs.writeFileSync(temporaneo, testo);
  try {
    fs.renameSync(temporaneo, percorso);
  } catch (e) {
    fs.rmSync(temporaneo, { force: true });
    throw e;
  }
}

function leggiIstantanea(radici: RadiciModifica): Istantanea | null {
  try {
    const s = JSON.parse(fs.readFileSync(fileIstantanea(radici), 'utf-8')) as Istantanea;
    return s.schema === 1 && Array.isArray(s.files) ? s : null;
  } catch {
    return null;
  }
}

function scriviIstantanea(radici: RadiciModifica, s: Istantanea | null): void {
  const p = fileIstantanea(radici);
  if (s === null) {
    fs.rmSync(p, { force: true });
    return;
  }
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(s, null, 2));
}

/** Rimette ogni file del piano com'era, se non lo e' gia'. Non lancia: raccoglie i guasti. */
function ripristina(radici: RadiciModifica, scritture: readonly FileDelPiano[]): string[] {
  const guasti: string[] = [];
  for (const s of scritture) {
    const p = path.join(radici.repoRoot, s.rel);
    try {
      if (leggiFile(p) !== s.vecchio) scriviAtomico(p, s.vecchio);
    } catch (e) {
      guasti.push((e as Error).message);
    }
  }
  return guasti;
}

export async function applica(radici: RadiciModifica, piano: Piano, opzioni: OpzioniApplica = {}): Promise<EsitoApplica> {
  if (piano.blocchi.length > 0) {
    throw new ErrorePiano('bloccato', 400, 'la modifica non passa il controllo', { dettagli: piano.blocchi });
  }
  const finale = (): EsitoApplica => ({
    testo: piano.testoAperto,
    versione: improntaDiTesto(piano.testoAperto),
    fileToccati: piano.scritture.length,
    scenari: piano.conseguenze.scenari,
    avvisi: piano.avvisi,
    marcatoreTolto: piano.marcatoreTolto,
    rigeneraCatalogo: piano.rigeneraCatalogo,
    ...(piano.frasi ? { catalogoDaTogliere: piano.frasi.da } : {}),
  });
  // Niente da scrivere: niente controllo, niente istantanea, e l'Annulla di prima resta.
  if (piano.scritture.length === 0) return finale();

  // 1. Subito prima di scrivere si rilegge tutto: se qualcosa e' cambiato dal piano, non si scrive.
  for (const s of piano.scritture) {
    if (leggiFile(path.join(radici.repoRoot, s.rel)) !== s.vecchio) {
      throw new ErrorePiano('conflitto', 409, 'un file e\' cambiato mentre si preparava la modifica');
    }
  }

  // 2. L'istantanea (e quella di prima, per rimetterla se questa modifica non va in porto).
  const precedente = leggiIstantanea(radici);
  const istantanea: Istantanea = {
    schema: 1,
    quando: (opzioni.ora?.() ?? new Date()).toISOString(),
    operazione: piano.operazione,
    file: piano.file,
    stato: 'applicata',
    rigeneraCatalogo: piano.rigeneraCatalogo,
    ...(piano.frasi ? { frasiRinomina: piano.frasi } : {}),
    files: piano.scritture.map((s) => ({ rel: s.rel, prima: s.vecchio, dopo: sha(Buffer.from(s.nuovo, 'utf-8')) })),
  };
  scriviIstantanea(radici, istantanea);
  const annullaTutto = (): string[] => {
    const guasti = ripristina(radici, piano.scritture);
    try {
      scriviIstantanea(radici, precedente);
    } catch (e) {
      guasti.push((e as Error).message);
    }
    return guasti;
  };

  // 3. Si scrive, un file alla volta; se uno fallisce si rimette a posto tutto.
  const scrivi = opzioni.scriviFile ?? scriviAtomico;
  try {
    for (const s of piano.scritture) scrivi(path.join(radici.repoRoot, s.rel), s.nuovo);
  } catch (e) {
    const guasti = annullaTutto();
    throw new ErrorePiano(guasti.length ? 'ripristino' : 'scrittura', 500, `scrittura non riuscita: ${(e as Error).message}`);
  }

  // 4. Il controllo vero decide.
  const controllo = opzioni.controllo ?? ((files: string[]) => controlloVero(radici.repoRoot, files));
  let esito: EsitoControlloVero;
  try {
    esito = await controllo(piano.featureToccati);
  } catch {
    esito = { ok: false, motivo: 'compilazione' };
  }
  if (!esito.ok) {
    const guasti = annullaTutto();
    throw new ErrorePiano(guasti.length ? 'ripristino' : 'bocciato', 422, 'il controllo del test non e\' passato: non ho salvato', {
      controllo: esito,
    });
  }
  return finale();
}

// ---------------------------------------------------------------------------
// Annulla
// ---------------------------------------------------------------------------

export interface StatoAnnulla {
  annullabile: boolean;
  operazione?: Operazione['operazione'];
  quando?: string;
}

export function statoAnnulla(radici: RadiciModifica): StatoAnnulla {
  const s = leggiIstantanea(radici);
  if (!s || s.stato !== 'applicata') return { annullabile: false };
  return { annullabile: true, operazione: s.operazione, quando: s.quando };
}

export interface EsitoAnnulla {
  fileToccati: number;
  /** Lo scenario che era aperto, relativo a `src/features/`. */
  file: string;
  rigeneraCatalogo: boolean;
  /** Dopo l'annullamento di una rinomina: la voce `wanted` della frase nuova va tolta prima di rigenerare. */
  catalogoDaTogliere?: string;
}

export async function annulla(radici: RadiciModifica): Promise<EsitoAnnulla> {
  const s = leggiIstantanea(radici);
  if (!s || s.stato !== 'applicata') throw new ErrorePiano('niente-da-annullare', 404, 'non c\'e\' niente da annullare');

  // Prima si controlla che ogni file sia ancora come l'ha lasciato la modifica:
  // se qualcuno l'ha cambiato nel frattempo non si cancella il suo lavoro.
  for (const f of s.files) {
    let corrente: Buffer;
    try {
      corrente = fs.readFileSync(path.join(radici.repoRoot, f.rel));
    } catch {
      throw new ErrorePiano('cambiato-dopo', 409, 'un file e\' stato cambiato dopo la modifica: non lo tocco');
    }
    if (sha(corrente) !== f.dopo) throw new ErrorePiano('cambiato-dopo', 409, 'un file e\' stato cambiato dopo la modifica: non lo tocco');
  }

  const fatti: Array<{ rel: string; dopo: string }> = [];
  try {
    for (const f of s.files) {
      const p = path.join(radici.repoRoot, f.rel);
      const dopo = fs.readFileSync(p, 'utf-8');
      scriviAtomico(p, f.prima);
      fatti.push({ rel: f.rel, dopo });
    }
  } catch (e) {
    // A meta': si rimette il nuovo, cosi' la modifica resta intera e annullabile.
    for (const f of fatti) {
      try {
        scriviAtomico(path.join(radici.repoRoot, f.rel), f.dopo);
      } catch {
        /* il guasto e' gia' nel messaggio */
      }
    }
    throw new ErrorePiano('scrittura', 500, `annullamento non riuscito: ${(e as Error).message}`);
  }
  scriviIstantanea(radici, { ...s, stato: 'annullata' });
  return {
    fileToccati: s.files.length,
    file: s.file,
    rigeneraCatalogo: s.rigeneraCatalogo,
    ...(s.frasiRinomina ? { catalogoDaTogliere: s.frasiRinomina.a } : {}),
  };
}
