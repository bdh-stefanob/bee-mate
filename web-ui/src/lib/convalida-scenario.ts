import * as fs from 'fs';
import * as path from 'path';
import { execFile } from 'child_process';
import { Parser, AstBuilder, GherkinClassicTokenMatcher } from '@cucumber/gherkin';
import { IdGenerator } from '@cucumber/messages';
import type { CatalogStep } from './types';
import { espressioneInRegex } from './catalogo';
import { dentroLaCartella } from './percorsi';
import { leggiPassi, titoloDi, valutaSemplicita, MAX_TITOLO } from './modifica-scenario';

/**
 * La convalida di uno scenario modificato, a due livelli con ruoli diversi
 * (docs/superpowers/specs/2026-10-01-modifica-scenari-e-dismissione-portale-design.md, A6):
 *
 *  - LIVELLO 1, in memoria (`convalidaTesto`): guida chi scrive. Sintassi, titolo,
 *    ogni riga di passo che combacia con una frase del catalogo, nessuna
 *    ambiguita' nuova. Veloce, ma e' un matcher in piu': non decide.
 *  - LIVELLO 2, dopo la scrittura (`controlloVero`): la prova a vuoto di Cucumber
 *    sullo stato vero del repository. Decide. L'uscita di Cucumber e' 0 anche
 *    con passi non definiti, quindi l'esito si legge dai MESSAGGI
 *    (`leggiMessaggiDryRun`), non dal codice di uscita. Se non riesce a
 *    concludere, vale come fallito.
 *
 * "Prima" e "dopo" contano: un problema che c'era gia' prima della modifica
 * avvisa, non blocca (la persona non ne ha colpa e non puo' risolverlo da qui);
 * uno introdotto dalla modifica blocca.
 */

// ---------------------------------------------------------------------------
// Livello 1
// ---------------------------------------------------------------------------

/** Un esito del controllo: la finestra lo traduce in una frase, con la frase del passo e la riga. */
export interface Messaggio {
  codice:
    | 'sintassi' | 'titolo' | 'nessun-passo' | 'struttura' | 'sconosciuto' | 'ambiguo' | 'frase-orfana'
    | 'sconosciuto-gia' | 'ambiguo-gia' | 'nessuna-verifica' | 'senza-accesso' | 'wanted'
    | 'simile' | 'non-piu-usato';
  frase?: string;
  riga?: number;
  /** Per `frase-orfana`: il file (relativo a `src/features/`) che la contiene. */
  file?: string;
  /** Per `simile`: la frase a cui assomiglia, e se i componenti coincidono (probabile doppione). */
  altra?: string;
  stessoComponente?: boolean;
}

export interface EsitoConvalida {
  blocchi: Messaggio[];
  avvisi: Messaggio[];
}

export interface ContestoConvalida {
  /** Il testo dopo la modifica. */
  testo: string;
  /** Il testo com'era sul disco (`''` se il file non c'era). */
  prima: string;
  /** Il catalogo come sara' dopo la modifica (per una rinomina: con la frase nuova). */
  catalogo: readonly CatalogStep[];
  /** Il catalogo com'e' adesso; se manca vale quello di dopo. */
  catalogoPrima?: readonly CatalogStep[];
  /** Gli altri `.feature` del repository, prima e dopo l'operazione (serve alla rinomina). */
  altri?: ReadonlyArray<{ file: string; prima: string; dopo: string }>;
}

const RIGA_DI_PASSO = /^\s*(?:Given|When|Then|And|But|\*)\s+(.*?)\s*$/;

function errorePerRiga(testo: string): number | null {
  const parser = new Parser(new AstBuilder(IdGenerator.uuid()), new GherkinClassicTokenMatcher());
  try {
    parser.parse(testo);
    return null;
  } catch (e) {
    const grezzo = e as { errors?: Array<{ location?: { line: number } }>; location?: { line: number } };
    const primo = Array.isArray(grezzo.errors) ? grezzo.errors[0] : grezzo;
    return primo?.location?.line ?? 1;
  }
}

/** Quali espressioni del catalogo riconoscono la frase. */
function chiRiconosce(catalogo: readonly CatalogStep[], regex: Map<string, RegExp>, frase: string): CatalogStep[] {
  return catalogo.filter((s) => {
    let r = regex.get(s.expression);
    if (!r) {
      r = espressioneInRegex(s.expression);
      regex.set(s.expression, r);
    }
    return r.test(frase);
  });
}

function righeDiPasso(testo: string): string[] {
  return testo.split(/\r\n|\n/).flatMap((r) => {
    const m = RIGA_DI_PASSO.exec(r);
    return m ? [m[1]] : [];
  });
}

export function convalidaTesto(ctx: ContestoConvalida): EsitoConvalida {
  const blocchi: Messaggio[] = [];
  const avvisi: Messaggio[] = [];

  const rigaErrore = errorePerRiga(ctx.testo);
  // Un testo che non si legge non si puo' giudicare oltre.
  if (rigaErrore !== null) return { blocchi: [{ codice: 'sintassi', riga: rigaErrore }], avvisi };

  if (!valutaSemplicita(ctx.testo).semplice) blocchi.push({ codice: 'struttura' });

  const titolo = titoloDi(ctx.testo);
  if (!titolo || titolo.length > MAX_TITOLO) blocchi.push({ codice: 'titolo' });

  const passi = leggiPassi(ctx.testo);
  if (passi.length === 0) blocchi.push({ codice: 'nessun-passo' });

  const regex = new Map<string, RegExp>();
  const catalogoPrima = ctx.catalogoPrima ?? ctx.catalogo;
  const passiPrima = leggiPassi(ctx.prima);
  const nonRiconosciutePrima = new Set(
    passiPrima.filter((p) => chiRiconosce(catalogoPrima, regex, p.frase).length === 0).map((p) => p.frase)
  );
  const ambiguePrima = new Set(
    passiPrima.filter((p) => chiRiconosce(catalogoPrima, regex, p.frase).length > 1).map((p) => p.frase)
  );

  const wanted = new Set<string>();
  const segnalate = new Set<string>();
  for (const p of passi) {
    const trovate = chiRiconosce(ctx.catalogo, regex, p.frase);
    if (trovate.length === 0) {
      const gia = nonRiconosciutePrima.has(p.frase);
      const chiave = `${gia}|${p.frase}`;
      if (segnalate.has(chiave)) continue;
      segnalate.add(chiave);
      if (gia) avvisi.push({ codice: 'sconosciuto-gia', frase: p.frase, riga: p.riga });
      else blocchi.push({ codice: 'sconosciuto', frase: p.frase, riga: p.riga });
    } else if (trovate.length > 1) {
      const gia = ambiguePrima.has(p.frase);
      const chiave = `amb|${gia}|${p.frase}`;
      if (segnalate.has(chiave)) continue;
      segnalate.add(chiave);
      if (gia) avvisi.push({ codice: 'ambiguo-gia', frase: p.frase, riga: p.riga });
      else blocchi.push({ codice: 'ambiguo', frase: p.frase, riga: p.riga });
    } else if ((trovate[0].status === 'wanted' || trovate[0].status === 'proposed') && !wanted.has(p.frase)) {
      wanted.add(p.frase);
      avvisi.push({ codice: 'wanted', frase: p.frase });
    }
  }

  // Cio' che la modifica ha lasciato "orfano" negli altri scenari: righe che non
  // combaciano piu' con nessun passo e prima combaciavano.
  for (const altro of ctx.altri ?? []) {
    const eraNota = new Set(righeDiPasso(altro.prima).filter((f) => chiRiconosce(catalogoPrima, regex, f).length === 0));
    const viste = new Set<string>();
    for (const frase of righeDiPasso(altro.dopo)) {
      if (viste.has(frase) || eraNota.has(frase)) continue;
      if (chiRiconosce(ctx.catalogo, regex, frase).length === 0) {
        viste.add(frase);
        blocchi.push({ codice: 'frase-orfana', frase, file: altro.file });
      }
    }
  }

  const effettive = passi.map((p) => p.parolaChiave);
  let corrente = '';
  let haVerifica = false;
  for (const k of effettive) {
    if (k !== 'And' && k !== 'But') corrente = k;
    if (corrente === 'Then') haVerifica = true;
  }
  if (passi.length > 0 && !haVerifica) avvisi.push({ codice: 'nessuna-verifica' });

  const ACCESSO = 'the user is logged in';
  if (passiPrima.some((p) => p.frase === ACCESSO) && !passi.some((p) => p.frase === ACCESSO)) {
    avvisi.push({ codice: 'senza-accesso' });
  }

  return { blocchi, avvisi };
}

// ---------------------------------------------------------------------------
// Livello 2: la prova a vuoto di Cucumber, letta dai messaggi
// ---------------------------------------------------------------------------

export type EsitoControlloVero =
  | { ok: true }
  | {
      ok: false;
      /**
       * `indefinito`/`ambiguo`: un passo senza definizione o con due. `compilazione`:
       * Cucumber non e' arrivato in fondo (errore nel codice degli step, o non e'
       * partito). `tempo`: troppo lento, vale come fallito. `nessuna-prova`: non ha
       * eseguito nessun caso, quindi non ha garantito niente. `fallito`: un passo
       * ha dato errore. `percorso`: un percorso non ammesso, mai passato a Cucumber.
       */
      motivo: 'indefinito' | 'ambiguo' | 'compilazione' | 'tempo' | 'nessuna-prova' | 'fallito' | 'percorso';
      /** Le frasi dei passi col problema, senza ripetizioni. */
      passi?: string[];
    };

interface Riga {
  pickle?: { steps?: Array<{ id: string; text: string }> };
  testCase?: { testSteps?: Array<{ id: string; pickleStepId?: string }> };
  testCaseStarted?: unknown;
  testStepFinished?: { testStepId: string; testStepResult?: { status?: string } };
}

/** Legge i messaggi NDJSON di una prova a vuoto. Non guarda mai il codice di uscita: lo fa chi chiama. */
export function leggiMessaggiDryRun(ndjson: string): EsitoControlloVero {
  const testoPasso = new Map<string, string>(); // pickleStepId -> frase
  const passoDelTest = new Map<string, string>(); // testStepId -> pickleStepId
  const trovati: Record<'UNDEFINED' | 'AMBIGUOUS' | 'FAILED', string[]> = { UNDEFINED: [], AMBIGUOUS: [], FAILED: [] };
  let casi = 0;

  for (const grezza of ndjson.split(/\r?\n/)) {
    if (!grezza.trim()) continue;
    let r: Riga;
    try {
      r = JSON.parse(grezza) as Riga;
    } catch {
      return { ok: false, motivo: 'compilazione' };
    }
    for (const s of r.pickle?.steps ?? []) testoPasso.set(s.id, s.text);
    for (const s of r.testCase?.testSteps ?? []) if (s.pickleStepId) passoDelTest.set(s.id, s.pickleStepId);
    if (r.testCaseStarted) casi++;
    const f = r.testStepFinished;
    const stato = f?.testStepResult?.status;
    if (f && (stato === 'UNDEFINED' || stato === 'AMBIGUOUS' || stato === 'FAILED')) {
      const frase = testoPasso.get(passoDelTest.get(f.testStepId) ?? '') ?? '';
      if (!trovati[stato].includes(frase)) trovati[stato].push(frase);
    }
  }

  if (trovati.UNDEFINED.length) return { ok: false, motivo: 'indefinito', passi: trovati.UNDEFINED };
  if (trovati.AMBIGUOUS.length) return { ok: false, motivo: 'ambiguo', passi: trovati.AMBIGUOUS };
  if (trovati.FAILED.length) return { ok: false, motivo: 'fallito', passi: trovati.FAILED };
  if (casi === 0) return { ok: false, motivo: 'nessuna-prova' };
  return { ok: true };
}

export interface OpzioniLancio {
  radice: string;
  /** Percorsi dei `.feature` relativi alla radice (`src/features/...`), gia' validati da chi chiama. */
  percorsi: string[];
  /** Dove scrivere i messaggi: una cartella sotto la radice, e il nome del file. */
  cartellaMessaggi: string;
  nomeMessaggi: string;
}

export interface UscitaLancio {
  codice: number;
  scaduto: boolean;
  /** Le ultime righe, per i log: non si mostrano cosi' come sono. */
  uscita: string;
}

/** Chi lancia la prova a vuoto: si sostituisce nei test, come il `Lanciatore` di `registro.ts`. */
export type Lanciatore = (opzioni: OpzioniLancio) => Promise<UscitaLancio>;

/**
 * Piu' di cosi' non si aspetta dentro un salvataggio: oltre, vale come fallito
 * e il salvataggio si ripristina. La prova a vuoto compila tutti gli step (circa
 * 2 s su un repository con pochi scenari).
 */
export const TEMPO_MASSIMO_MS = 90_000;

const CUCUMBER_PREDEFINITO = 'node_modules/@cucumber/cucumber/bin/cucumber.js';

/**
 * Cucumber vero, in prova a vuoto. Nessuna shell: Node sul file di avvio del
 * programma, argomenti come lista. I percorsi li ha calcolati il server e
 * viaggiano in `BDD_PATHS` (non sulla riga di comando: vedi `cucumber.js`).
 * Il report HTML va accanto ai messaggi, per non sovrascrivere quello di chi
 * ha lanciato i test.
 */
export function lanciaDryRun(o: OpzioniLancio & { cucumberJs?: string }): Promise<UscitaLancio> {
  const radice = path.resolve(o.radice);
  const relativo = (nome: string) => path.relative(radice, path.join(o.cartellaMessaggi, nome)).replace(/\\/g, '/');
  const eseguibile = o.cucumberJs ?? path.join(radice, CUCUMBER_PREDEFINITO);
  return new Promise((resolve) => {
    execFile(
      process.execPath,
      [eseguibile, '--dry-run', '--format', `message:${relativo(o.nomeMessaggi)}`],
      {
        cwd: radice,
        env: {
          ...process.env,
          BDD_PATHS: o.percorsi.join(';'),
          BDD_HTML: relativo(o.nomeMessaggi.replace(/\.ndjson$/, '') + '.html'),
        },
        timeout: TEMPO_MASSIMO_MS,
        windowsHide: true,
        maxBuffer: 8 * 1024 * 1024,
      },
      (errore, stdout, stderr) => {
        const e = errore as (Error & { code?: unknown; killed?: boolean }) | null;
        const codice = e ? (typeof e.code === 'number' ? e.code : 1) : 0;
        const testo = `${stdout}\n${stderr}`.trim().split(/\r?\n/).slice(-8).join('\n');
        resolve({ codice, scaduto: !!e?.killed, uscita: testo });
      }
    );
  });
}

/**
 * Il controllo vero sui `.feature` toccati (percorsi relativi a `src/features/`).
 * Non lancia mai: qualunque cosa vada storta vale come "non ha concluso".
 */
export async function controlloVero(
  radice: string,
  files: readonly string[],
  lancia: Lanciatore = lanciaDryRun
): Promise<EsitoControlloVero> {
  const features = path.join(radice, 'src', 'features');
  const percorsi: string[] = [];
  for (const f of files) {
    const assoluto = dentroLaCartella(features, f, '.feature');
    if (!assoluto) return { ok: false, motivo: 'percorso' };
    percorsi.push(`src/features/${path.relative(features, assoluto).replace(/\\/g, '/')}`);
  }
  if (percorsi.length === 0) return { ok: false, motivo: 'nessuna-prova' };

  const cartellaMessaggi = path.join(radice, 'reports', 'modifiche');
  const nomeMessaggi = 'controllo.ndjson';
  const file = path.join(cartellaMessaggi, nomeMessaggi);
  try {
    fs.mkdirSync(cartellaMessaggi, { recursive: true });
    fs.rmSync(file, { force: true });
    const uscita = await lancia({ radice, percorsi, cartellaMessaggi, nomeMessaggi });
    if (uscita.scaduto) return { ok: false, motivo: 'tempo' };
    const letti = fs.existsSync(file) ? fs.readFileSync(file, 'utf-8') : '';
    const esito = leggiMessaggiDryRun(letti);
    // Un passo senza definizione o ambiguo si nomina: e' piu' utile del codice di uscita.
    if (!esito.ok && esito.motivo !== 'nessuna-prova') return esito;
    // Uscita diversa da 0: Cucumber non e' arrivato in fondo (compilazione).
    if (uscita.codice !== 0) return { ok: false, motivo: 'compilazione' };
    return esito;
  } catch {
    return { ok: false, motivo: 'compilazione' };
  }
}
