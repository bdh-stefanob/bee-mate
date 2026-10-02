import * as fs from 'fs';
import * as path from 'path';
import { createHash } from 'crypto';
import type { CatalogStep } from './types';
import { walkFeatures } from './features';
import { improntaDiTesto } from './impronta-scenario';
import { espressioneInRegex, trovaUsatoIn } from './catalogo';
import { individuaCoppie } from './riconciliazione';
import { pianificaRinomina, percorsoDefinizione } from './rinomina-passo';
import { haParametri } from './riscrittura-step';
import { rimuoviDefinizione } from './fusione-step';
import { frasiDefinite } from './salva-glue';
import { leggiPassi, spostaTesto, titoloDi, togliMarcatore, tuttiIPassi } from './modifica-scenario';
import { MARCATORE } from './marcatore';
import { CARTELLA_REGISTRATI, NOME_CARTELLA } from './salva-scenario';
import {
  convalidaTesto,
  controlloVero,
  type EsitoControlloVero,
  type Messaggio,
} from './convalida-scenario';
import {
  cartellaDefinizione,
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
  | { operazione: 'rinomina'; file: string; versione: string; da: string; a: string }
  /** `flusso`: il nome della cartella di destinazione, nella stessa applicazione (M4). */
  | { operazione: 'sposta'; file: string; versione: string; flusso: string }
  | { operazione: 'elimina'; file: string; versione: string };

export interface FileDelPiano {
  /** Relativo alla radice del repository, con `/`. Mai mostrato al tester. */
  rel: string;
  categoria: 'feature' | 'steps';
  /** Com'e' adesso sul disco; `null` = il file non c'e' (lo crea questa modifica). */
  vecchio: string | null;
  /** Com'e' dopo; `null` = lo toglie questa modifica. */
  nuovo: string | null;
  /** Aveva il marcatore e adesso no. */
  perdeMarcatore: boolean;
}

/** Un passo che l'eliminazione di uno scenario lascia dov'e', e perche'. */
export interface PassoRimasto {
  /** L'espressione del catalogo (con i segnaposto: `the page shows {string}`). */
  frase: string;
  /**
   * `comune`: una definizione di `steps/common/`, di tutti; `condiviso`: lo usa un altro scenario;
   * `parametri`: ha un valore variabile e non si riscrive; `richiesto`: e' una richiesta del
   * team (non ancora realizzata) e non si perde con uno scenario; `altro`: la sua definizione
   * non si e' trovata esattamente una volta, e non si indovina.
   */
  motivo: 'comune' | 'condiviso' | 'parametri' | 'richiesto' | 'altro';
  /** I nomi degli altri scenari che lo usano (solo per `condiviso`). */
  usatoDa: string[];
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
  /** Lo scenario aperto dopo la modifica, relativo a `src/features/`: cambia con lo spostamento, `null` se e' eliminato. */
  fileDopo: string | null;
  /** Sposta: da dove a dove. Gli esiti delle prove seguono il file (vedi `spostaEsiti`). */
  spostamento?: { da: string; a: string };
  /** Elimina: quali passi vanno con lo scenario e quali restano, e perche'. */
  passi?: { vanno: string[]; restano: PassoRimasto[] };
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
  // Il testo avanzato e' piu' largo dei gesti: ammette anche piu' scenari, esempi, tabelle. Un
  // documento (`@non-automatizzato`) e uno scenario non ancora salvato no, in nessun modo.
  if (ragione && !(op.operazione === 'testo' && ragione === 'complesso')) {
    throw new ErrorePiano('non-modificabile', 403, 'questo scenario non si modifica da qui', { ragione });
  }

  switch (op.operazione) {
    case 'testo': return pianificaTesto(radici, op, corrente);
    case 'rinomina': return pianificaRinominaPasso(radici, op, corrente);
    case 'sposta': return pianificaSposta(radici, op, corrente);
    case 'elimina': return pianificaElimina(radici, op, corrente);
  }
}

function pianoVuoto(op: Operazione, corrente: string): Piano {
  return {
    operazione: op.operazione,
    file: op.file,
    fileDopo: op.file,
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
      return { file, nome: nomeScenario(s.vecchio ?? '', file), diventaTuo: s.perdeMarcatore };
    }),
  };
  const aperta = features.find((s) => s.rel === `src/features/${op.file}`);
  risultato.testoAperto = aperta?.nuovo ?? corrente;
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
// Sposta (A8): solo dentro la stessa applicazione, perche' le Page Object sono per applicazione
// ---------------------------------------------------------------------------

const stepsRel = (app: string, flusso: string, nome: string): string => `src/steps/${app}/${flusso}/${nome}.steps.ts`;

function pianificaSposta(radici: RadiciModifica, op: Extract<Operazione, { operazione: 'sposta' }>, corrente: string): Piano {
  if (typeof op.flusso !== 'string') throw new ErrorePiano('richiesta', 400, 'richiesta non valida');
  const parti = op.file.split('/');
  if (parti.length !== 3 || parti[0] === CARTELLA_REGISTRATI) {
    throw new ErrorePiano('non-spostabile', 400, 'questo scenario non sta in un flusso', { ragione: 'posizione' });
  }
  const [app, flussoPrima, nomeFeature] = parti;
  const nome = nomeFeature.replace(/\.feature$/, '');
  const flusso = op.flusso;
  if (!NOME_CARTELLA.test(flusso) || flusso === CARTELLA_REGISTRATI) {
    throw new ErrorePiano('flusso', 400, 'il nome del flusso non e\' ammesso');
  }
  if (flusso === flussoPrima) throw new ErrorePiano('non-spostabile', 400, 'e\' gia\' in questo flusso', { ragione: 'stesso' });

  // Per spostare conta il posto: se e' occupato non si scrive accanto.
  const destinazione = `${app}/${flusso}/${nomeFeature}`;
  if (fs.existsSync(path.join(radici.featuresDir, destinazione))) {
    throw new ErrorePiano('occupato', 409, 'in quel flusso c\'e\' gia\' uno scenario con questo nome');
  }
  const stepsDa = stepsRel(app, flussoPrima, nome);
  const stepsA = stepsRel(app, flusso, nome);
  const stepsVecchio = leggiFile(path.join(radici.repoRoot, stepsDa));
  if (stepsVecchio !== null && fs.existsSync(path.join(radici.repoRoot, stepsA))) {
    throw new ErrorePiano('occupato', 409, 'in quel flusso ci sono gia\' i passi di uno scenario con questo nome');
  }

  const piano = pianoVuoto(op, corrente);
  // Chi sposta rende suo il file, come chi modifica: perde il marcatore (e cosi' i suoi step).
  const featureNuovo = togliMarcatore(spostaTesto(corrente, destinazione));
  const perdeFeature = corrente.includes(MARCATORE) && !featureNuovo.includes(MARCATORE);
  const scritture: FileDelPiano[] = [
    { rel: `src/features/${destinazione}`, categoria: 'feature', vecchio: null, nuovo: featureNuovo, perdeMarcatore: perdeFeature },
  ];
  if (stepsVecchio !== null) {
    // Il commento di testa dice dove sta il file; gli import (`../../../pages/...`) restano validi: stessa profondita'.
    const righe = stepsVecchio.split('\n').map((r) => (r.trim() === `// ${stepsDa}` ? r.replace(stepsDa, stepsA) : r));
    const stepsNuovo = togliMarcatore(righe.join('\n'));
    scritture.push({ rel: stepsA, categoria: 'steps', vecchio: null, nuovo: stepsNuovo, perdeMarcatore: stepsVecchio.includes(MARCATORE) && !stepsNuovo.includes(MARCATORE) });
  }
  // Prima si scrive il nuovo, poi si toglie il vecchio: in nessun momento lo scenario non c'e'.
  scritture.push({ rel: `src/features/${op.file}`, categoria: 'feature', vecchio: corrente, nuovo: null, perdeMarcatore: false });
  if (stepsVecchio !== null) scritture.push({ rel: stepsDa, categoria: 'steps', vecchio: stepsVecchio, nuovo: null, perdeMarcatore: false });

  piano.scritture = scritture;
  piano.featureToccati = [destinazione];
  piano.testoAperto = featureNuovo;
  piano.marcatoreTolto = scritture.some((s) => s.perdeMarcatore);
  piano.conseguenze = { scenari: [{ file: destinazione, nome: nomeScenario(featureNuovo, destinazione), diventaTuo: piano.marcatoreTolto }] };
  // La definizione ha cambiato posto: area e riferimenti del catalogo vanno riletti dal codice.
  piano.rigeneraCatalogo = stepsVecchio !== null;
  piano.fileDopo = destinazione;
  piano.spostamento = { da: op.file, a: destinazione };
  return piano;
}

// ---------------------------------------------------------------------------
// Elimina (A7): lo scenario e i passi che nessun altro usa. Le Page Object non si toccano mai.
// ---------------------------------------------------------------------------

/** Quanti scenari si guardano, al massimo, per controllare che gli altri partano ancora. */
const MAX_TESTIMONI = 25;

function pianificaElimina(radici: RadiciModifica, op: Extract<Operazione, { operazione: 'elimina' }>, corrente: string): Piano {
  const catalogo = leggiCatalogoPassi(radici.repoRoot);
  const usi = trovaUsatoIn(catalogo, radici.featuresDir);
  const piano = pianoVuoto(op, corrente);

  const steps = new Map<string, { rel: string; vecchio: string; nuovo: string }>();
  const vanno: string[] = [];
  const restano: PassoRimasto[] = [];
  // Gli scenari che usano un passo condiviso che resta: se qualcosa si e' rotto, lo mostrano loro.
  const testimoni = new Set<string>();
  const viste = new Set<string>();

  for (const { frase } of leggiPassi(corrente)) {
    const trovati = catalogo.filter((s) => espressioneInRegex(s.expression).test(frase));
    // Una frase che il catalogo non riconosce, o riconosce due volte, non ha una definizione da togliere.
    if (trovati.length !== 1) continue;
    const s = trovati[0];
    if (viste.has(s.expression)) continue;
    viste.add(s.expression);

    const altri = (usi.get(s.expression) ?? []).filter((u) => u.file !== op.file);
    const usatoDa = [...new Set(altri.map((u) => u.scenario))];
    const resta = (motivo: PassoRimasto['motivo']) =>
      restano.push({ frase: s.expression, motivo, usatoDa: motivo === 'condiviso' ? usatoDa : [] });

    const cartella = cartellaDefinizione(s.sourceRef);
    if (cartella === 'common') {
      resta('comune');
      continue;
    }
    if (altri.length > 0) {
      for (const u of altri) if (!eInGenerated(u.file)) testimoni.add(u.file);
      resta('condiviso');
      continue;
    }
    if (haParametri(s.expression)) {
      resta('parametri');
      continue;
    }
    // Una richiesta del team (non ancora realizzata) non si perde con uno scenario.
    if (s.status !== 'implemented') {
      resta('richiesto');
      continue;
    }
    const percorso = cartella === 'generated' ? null : percorsoDefinizione(radici.repoRoot, s.sourceRef);
    let definizione = percorso ? steps.get(percorso) : undefined;
    if (percorso && !definizione) {
      const testo = leggiFile(percorso);
      if (testo !== null) definizione = { rel: slash(path.relative(radici.repoRoot, percorso)), vecchio: testo, nuovo: testo };
    }
    let rimossa: { testo: string; rimosse: number } | null = null;
    if (definizione) {
      try {
        rimossa = rimuoviDefinizione(definizione.nuovo, s.expression);
      } catch {
        rimossa = null;
      }
    }
    // Non trovata esattamente una volta: non si indovina, il passo resta.
    if (!percorso || !definizione || !rimossa || rimossa.rimosse !== 1) {
      resta('altro');
      continue;
    }
    steps.set(percorso, { ...definizione, nuovo: rimossa.testo });
    vanno.push(s.expression);
  }

  // Prima lo scenario, poi i passi: se ci si ferma a meta' restano definizioni senza uso (innocue),
  // non uno scenario con passi che non esistono piu'.
  const scritture: FileDelPiano[] = [
    { rel: `src/features/${op.file}`, categoria: 'feature', vecchio: corrente, nuovo: null, perdeMarcatore: false },
  ];
  for (const s of steps.values()) {
    // Se non resta nessuna definizione il file non serve piu'.
    const nuovo = frasiDefinite(s.nuovo).length === 0 ? null : togliMarcatore(s.nuovo);
    scritture.push({ rel: s.rel, categoria: 'steps', vecchio: s.vecchio, nuovo, perdeMarcatore: nuovo !== null && s.vecchio.includes(MARCATORE) && !nuovo.includes(MARCATORE) });
  }

  piano.scritture = scritture;
  piano.featureToccati = [...testimoni].filter((f) => fs.existsSync(path.join(radici.featuresDir, f))).sort().slice(0, MAX_TESTIMONI);
  piano.conseguenze = { scenari: [{ file: op.file, nome: nomeScenario(corrente, op.file), diventaTuo: false }] };
  piano.rigeneraCatalogo = steps.size > 0;
  piano.fileDopo = null;
  piano.passi = { vanno, restano };
  return piano;
}

// ---------------------------------------------------------------------------
// L'applicazione, con il disco
// ---------------------------------------------------------------------------

export interface OpzioniApplica {
  /** Il controllo vero sui `.feature` toccati (relativi a `src/features/`). Di norma `controlloVero`. */
  controllo?: (files: string[]) => Promise<EsitoControlloVero>;
  /** Scrive un file, o lo toglie (`null`): solo per i test, per simulare un errore a meta'. */
  scriviFile?: (percorso: string, testo: string | null) => void;
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
  /** Lo scenario aperto dopo la modifica (relativo a `src/features/`); `null` se e' stato eliminato. */
  fileDopo: string | null;
  /** Sposta: da dove a dove (gli esiti delle prove seguono il file). */
  spostamento?: { da: string; a: string };
  /** Elimina: i passi che sono andati e quelli che sono rimasti. */
  passi?: { vanno: string[]; restano: PassoRimasto[] };
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
  /** Sposta: da dove a dove; annullando, gli esiti tornano indietro. */
  spostamento?: { da: string; a: string };
  /**
   * `prima`: com'era (`null` = non c'era: lo ha creato la modifica). `dopo`: l'impronta di
   * com'e' rimasto (`null` = lo ha tolto la modifica).
   */
  files: Array<{ rel: string; prima: string | null; dopo: string | null }>;
}

const fileIstantanea = (radici: RadiciModifica) => path.join(radici.repoRoot, 'reports', 'modifiche', 'ultima-modifica.json');

/** Un file in un temporaneo accanto, poi rinominato: un lettore non vede mai un file a meta'. */
function scriviAtomico(percorso: string, testo: string): void {
  fs.mkdirSync(path.dirname(percorso), { recursive: true });
  const temporaneo = `${percorso}.${process.pid}.tmp`;
  fs.writeFileSync(temporaneo, testo);
  try {
    fs.renameSync(temporaneo, percorso);
  } catch (e) {
    fs.rmSync(temporaneo, { force: true });
    throw e;
  }
}

/** Scrive il file, o lo toglie se il testo e' `null`. */
function scriviOTogli(percorso: string, testo: string | null): void {
  if (testo === null) fs.rmSync(percorso, { force: true });
  else scriviAtomico(percorso, testo);
}

/**
 * Toglie le cartelle rimaste vuote dopo che dei file sono stati tolti, risalendo fino a
 * `src/features/` e `src/steps/` (mai oltre, mai quelle due). Una cartella con dentro
 * qualcosa resta. Non lancia: una cartella vuota in piu' non e' un guasto.
 */
function togliCartelleVuote(radici: RadiciModifica, rels: readonly string[]): void {
  const basi = [radici.featuresDir, path.join(radici.repoRoot, 'src', 'steps')];
  const dentro = (dir: string) =>
    basi.some((base) => {
      const r = path.relative(base, dir);
      return r !== '' && !r.startsWith('..') && !path.isAbsolute(r);
    });
  for (const rel of rels) {
    let dir = path.dirname(path.join(radici.repoRoot, rel));
    try {
      while (dentro(dir) && fs.readdirSync(dir).length === 0) {
        fs.rmdirSync(dir);
        dir = path.dirname(dir);
      }
    } catch {
      /* resta com'e' */
    }
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

/**
 * Rimette ogni file del piano com'era, se non lo e' gia': ricrea quelli tolti, toglie quelli
 * creati, e le cartelle che la modifica aveva creato e restano vuote. Prima si ricrea e poi
 * si toglie: in nessun momento lo scenario non c'e'. Non lancia: raccoglie i guasti.
 */
function ripristina(radici: RadiciModifica, scritture: readonly FileDelPiano[]): string[] {
  const guasti: string[] = [];
  const ordinati = [...scritture].sort((a, b) => Number(a.vecchio === null) - Number(b.vecchio === null));
  for (const s of ordinati) {
    const p = path.join(radici.repoRoot, s.rel);
    try {
      if (leggiFile(p) !== s.vecchio) scriviOTogli(p, s.vecchio);
    } catch (e) {
      guasti.push((e as Error).message);
    }
  }
  togliCartelleVuote(radici, scritture.filter((s) => s.vecchio === null).map((s) => s.rel));
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
    fileDopo: piano.fileDopo,
    ...(piano.spostamento ? { spostamento: piano.spostamento } : {}),
    ...(piano.passi ? { passi: piano.passi } : {}),
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
    ...(piano.spostamento ? { spostamento: piano.spostamento } : {}),
    files: piano.scritture.map((s) => ({ rel: s.rel, prima: s.vecchio, dopo: s.nuovo === null ? null : sha(Buffer.from(s.nuovo, 'utf-8')) })),
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
  const scrivi = opzioni.scriviFile ?? scriviOTogli;
  try {
    for (const s of piano.scritture) scrivi(path.join(radici.repoRoot, s.rel), s.nuovo);
  } catch (e) {
    const guasti = annullaTutto();
    throw new ErrorePiano(guasti.length ? 'ripristino' : 'scrittura', 500, `scrittura non riuscita: ${(e as Error).message}`);
  }

  // 4. Il controllo vero decide. Se non c'e' nessuno scenario da provare (un'eliminazione i cui
  // passi non li usa nessun altro) non c'e' niente da controllare: non si lancia a vuoto.
  if (piano.featureToccati.length > 0) {
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
  }
  // Riuscita: le cartelle rimaste vuote dopo aver tolto dei file si tolgono.
  togliCartelleVuote(radici, piano.scritture.filter((s) => s.nuovo === null).map((s) => s.rel));
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
  /** Annullato uno spostamento: com'era (`da`, `a`); gli esiti delle prove tornano da `a` a `da`. */
  spostamento?: { da: string; a: string };
}

export async function annulla(radici: RadiciModifica): Promise<EsitoAnnulla> {
  const s = leggiIstantanea(radici);
  if (!s || s.stato !== 'applicata') throw new ErrorePiano('niente-da-annullare', 404, 'non c\'e\' niente da annullare');

  // Prima si controlla che ogni file sia ancora come l'ha lasciato la modifica:
  // se qualcuno l'ha cambiato nel frattempo non si cancella il suo lavoro.
  for (const f of s.files) {
    const corrente = leggiBuffer(path.join(radici.repoRoot, f.rel));
    // Un file che la modifica ha tolto deve essere ancora assente; gli altri, identici a come li ha lasciati.
    const come = f.dopo === null ? corrente === null : corrente !== null && sha(corrente) === f.dopo;
    if (!come) throw new ErrorePiano('cambiato-dopo', 409, 'un file e\' stato cambiato dopo la modifica: non lo tocco');
  }

  // Prima si rimette cio' che c'era, poi si toglie cio' che la modifica aveva creato: lo scenario non manca mai.
  const ordinati = [...s.files].sort((a, b) => Number(a.prima === null) - Number(b.prima === null));
  const fatti: Array<{ rel: string; dopo: string | null }> = [];
  try {
    for (const f of ordinati) {
      const p = path.join(radici.repoRoot, f.rel);
      const dopo = leggiFile(p);
      scriviOTogli(p, f.prima);
      fatti.push({ rel: f.rel, dopo });
    }
  } catch (e) {
    // A meta': si rimette il nuovo, cosi' la modifica resta intera e annullabile.
    for (const f of fatti) {
      try {
        scriviOTogli(path.join(radici.repoRoot, f.rel), f.dopo);
      } catch {
        /* il guasto e' gia' nel messaggio */
      }
    }
    throw new ErrorePiano('scrittura', 500, `annullamento non riuscito: ${(e as Error).message}`);
  }
  togliCartelleVuote(radici, s.files.filter((f) => f.prima === null).map((f) => f.rel));
  scriviIstantanea(radici, { ...s, stato: 'annullata' });
  return {
    fileToccati: s.files.length,
    file: s.file,
    rigeneraCatalogo: s.rigeneraCatalogo,
    ...(s.frasiRinomina ? { catalogoDaTogliere: s.frasiRinomina.a } : {}),
    ...(s.spostamento ? { spostamento: s.spostamento } : {}),
  };
}

function leggiBuffer(assoluto: string): Buffer | null {
  try {
    return fs.readFileSync(assoluto);
  } catch {
    return null;
  }
}
