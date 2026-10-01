import * as fs from 'fs';
import * as path from 'path';
import { createHash } from 'crypto';
import { haParametri, riscriviDefinizione, riscriviScenario, RiscritturaNonSupportata } from './riscrittura-step';
import {
  motivoNonApplicabile,
  type Compito,
  type EsitoProposta,
  type Origin,
  type OrigineRiga,
  type Strumento,
} from './suggerimenti-contratto';

/**
 * Applicare le scelte accettate: la frase del tester diventa quella del catalogo,
 * nel `.feature` E nella step definition insieme.
 *
 * REGOLE, ognuna con il suo caso in `applica-proposte.test.ts`
 *  - TUTTO O NIENTE. Prima si calcolano le riscritture di tutti i file in memoria
 *    (`pianificaRiscrittura`, pura): se anche una sola non si puo' fare — frase con
 *    parametri, voce gia' realizzata, due passi sulla stessa voce, una frase che
 *    non si trova — non si scrive niente e si dice quale. Uno scenario con la frase
 *    nuova da una parte e la vecchia dall'altra non parte: e' peggio del problema.
 *  - ISTANTANEA. Prima di scrivere gli originali si copiano in `prima/` (copie
 *    esatte, byte per byte), e `annulla` li rimette.
 *  - I GIUDICI DOPO. Si scrive, poi tre giudici che non sono pareri (compilazione,
 *    prova a vuoto di Cucumber, validatore delle frasi): se uno dice no, si
 *    ripristina da `prima/` e si dice quale ha detto no.
 *  - L'ANNULLAMENTO NON CALPESTA. Se una persona ha toccato i file dopo
 *    l'applicazione (l'impronta non coincide piu') non si annulla: stessa regola di
 *    una Page Object modificata a mano. E dopo il salvataggio i file non sono piu'
 *    dove erano: annullare e' un lavoro di git, non del cruscotto.
 *  - LA FRASE ORIGINALE NON SI PERDE: resta come commento sopra il passo
 *    (`# frase del tester: ...`), ed e' la variante nota che il rituale del
 *    catalogo puo' proporre come alias (decisione Q-A8, 1/10/2026).
 */

const MARCATORE = 'generato-da: bdd-generate';

export type CodiceApplicazione =
  | 'nessuna-scelta' | 'passo-sconosciuto' | 'scelte-incoerenti' | 'voce-non-candidata'
  | 'voce-non-proposta' | 'non-applicabile' | 'gia-uguale' | 'stessa-voce' | 'collisione'
  | 'frase-con-parametri' | 'frase-non-trovata' | 'definizione-multipla' | 'file-a-mano'
  | 'file-non-trovato' | 'niente-da-annullare' | 'gia-salvato' | 'modificato-a-mano'
  | 'scaduta' | 'id-non-valido' | 'compito-non-trovato';

export class ErroreApplicazione extends Error {
  /** Cio' che la persona deve vedere per rimediare: frasi, motivi. Mai percorsi assoluti. */
  readonly dettagli: string[];
  constructor(readonly codice: CodiceApplicazione, messaggio: string, dettagli: string[] = []) {
    super(messaggio);
    this.dettagli = dettagli;
  }
}

export interface Scelta {
  passo: number;
  voce: string;
}

export interface Sostituzione {
  passo: number;
  da: string;
  a: string;
}

// ---------------------------------------------------------------------------
// La parte pura
// ---------------------------------------------------------------------------

function escapeRegExp(testo: string): string {
  return testo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Sopra ogni riga di passo che cambia, la frase che aveva scritto il tester. */
function conCommenti(feature: string, da: string): string {
  const eol = feature.includes('\r\n') ? '\r\n' : '\n';
  const pattern = new RegExp(`^(\\s*)(Given|When|Then|And|But)(\\s+)${escapeRegExp(da)}(\\s*)$`);
  const out: string[] = [];
  for (const riga of feature.split(/\r\n|\n/)) {
    const m = riga.match(pattern);
    if (m) out.push(`${m[1]}# frase del tester: ${da}`);
    out.push(riga);
  }
  return out.join(eol);
}

/** `# origine-frasi: ...` accanto al marcatore: dice chi ha scelto le frasi, e sopravvive al salvataggio. */
function conOrigine(feature: string, origin: Origin): string {
  const eol = feature.includes('\r\n') ? '\r\n' : '\n';
  const righe = feature.split(/\r\n|\n/);
  const riga = `# origine-frasi: ${origin}`;
  const gia = righe.findIndex((r) => /^#\s*origine-frasi:/.test(r));
  if (gia >= 0) righe[gia] = riga;
  else {
    const marcatore = righe.findIndex((r) => r.includes(MARCATORE));
    righe.splice(marcatore >= 0 ? marcatore + 1 : 0, 0, riga);
  }
  return righe.join(eol);
}

export interface PianoRiscrittura {
  feature: string;
  steps: string;
  sostituzioni: Sostituzione[];
}

/**
 * Cosa diventerebbero i due file, senza scrivere niente. Lancia `ErroreApplicazione`
 * al primo motivo per non procedere.
 */
export function pianificaRiscrittura(args: {
  feature: string;
  steps: string;
  compito: Compito;
  /** Cosa ha proposto chi ha proposto, per passo: la scelta deve coincidere. */
  proposte: ReadonlyMap<number, string>;
  scelte: readonly Scelta[];
  origin: Origin;
}): PianoRiscrittura {
  const { compito, scelte } = args;
  if (scelte.length === 0) throw new ErroreApplicazione('nessuna-scelta', 'nessuna scelta da applicare');

  const viste = new Set<number>();
  for (const s of scelte) {
    if (viste.has(s.passo)) throw new ErroreApplicazione('scelte-incoerenti', 'due scelte per lo stesso passo', [`passo ${s.passo}`]);
    viste.add(s.passo);
  }

  const etichette = new Set(compito.passi.map((p) => p.etichetta));
  const voci = new Map<string, number>();
  const sostituzioni: Sostituzione[] = [];

  for (const s of scelte) {
    const passo = compito.passi.find((p) => p.n === s.passo);
    if (!passo) throw new ErroreApplicazione('passo-sconosciuto', 'un passo che non esiste', [`passo ${s.passo}`]);
    const candidato = passo.candidati.find((c) => c.voce === s.voce);
    if (!candidato) throw new ErroreApplicazione('voce-non-candidata', 'una frase che non e\' fra i candidati del passo', [s.voce]);
    if (args.proposte.get(s.passo) !== s.voce) {
      throw new ErroreApplicazione('voce-non-proposta', 'una frase che nessuno ha proposto per questo passo', [s.voce]);
    }
    const motivo = motivoNonApplicabile(candidato);
    if (motivo) throw new ErroreApplicazione('non-applicabile', `la frase non si puo' applicare (${motivo})`, [`${s.voce} [${motivo}]`]);
    if (s.voce === passo.etichetta) throw new ErroreApplicazione('gia-uguale', 'la frase e\' gia\' quella del catalogo', [s.voce]);
    if (haParametri(passo.etichetta)) {
      throw new ErroreApplicazione('frase-con-parametri', 'la frase del tester ha un parametro', [passo.etichetta]);
    }
    if (voci.has(s.voce)) {
      throw new ErroreApplicazione('stessa-voce', 'due passi sulla stessa frase del catalogo', [s.voce]);
    }
    voci.set(s.voce, s.passo);
    // Una frase uguale a quella di un altro passo la definirebbe due volte.
    if (etichette.has(s.voce)) {
      throw new ErroreApplicazione('collisione', 'la frase del catalogo e\' gia\' la frase di un altro passo', [s.voce]);
    }
    sostituzioni.push({ passo: s.passo, da: passo.etichetta, a: s.voce });
  }

  let feature = args.feature;
  let steps = args.steps;
  try {
    for (const s of sostituzioni) {
      const conCommento = conCommenti(feature, s.da);
      const f = riscriviScenario(conCommento, s.da, s.a);
      if (f.sostituzioni === 0) throw new ErroreApplicazione('frase-non-trovata', 'la frase non si trova nello scenario', [s.da]);
      feature = f.testo;
      const d = riscriviDefinizione(steps, s.da, s.a);
      if (d.sostituzioni === 0) throw new ErroreApplicazione('frase-non-trovata', 'la frase non si trova negli step', [s.da]);
      if (d.sostituzioni > 1) throw new ErroreApplicazione('definizione-multipla', 'la frase e\' definita piu\' volte negli step', [s.da]);
      steps = d.testo;
    }
  } catch (e) {
    if (e instanceof RiscritturaNonSupportata) {
      throw new ErroreApplicazione('frase-con-parametri', 'una frase con un parametro non si riscrive', [e.message]);
    }
    throw e;
  }

  return { feature: conOrigine(feature, args.origin), steps, sostituzioni };
}

// ---------------------------------------------------------------------------
// I giudici
// ---------------------------------------------------------------------------

export type NomeGiudice = 'tsc' | 'dry-run' | 'validatore';

export interface EsitoGiudice {
  nome: NomeGiudice;
  ok: boolean;
  /** Le ultime righe dell'uscita, per i log: non si mostrano cosi' come sono. */
  dettaglio?: string;
}

export interface ContestoGiudici {
  radice: string;
  featureRel: string;
  stepsRel: string;
  /** Le frasi che sono appena entrate nei file: il validatore guarda queste. */
  nuoveFrasi: string[];
}

export type Giudici = (contesto: ContestoGiudici) => Promise<EsitoGiudice[]>;

// ---------------------------------------------------------------------------
// L'applicazione, con il disco
// ---------------------------------------------------------------------------

export interface RigaEsito {
  passo: number;
  etichetta: string;
  esito: 'frase-del-catalogo' | 'frase-propria' | 'nessuna-proposta';
  voce?: string;
  origin: OrigineRiga;
}

export interface EsitoFile {
  schema: 1;
  compito: string;
  impronta: string;
  strumento: Strumento;
  origin: Origin;
  esito: 'applicato' | 'rifiutato-dai-giudici' | 'annullato';
  quando: string;
  file: { feature: string; steps: string };
  /** Impronta dei file subito dopo l'applicazione: serve a sapere se qualcuno li ha toccati. */
  impronte: { feature: string; steps: string };
  righe: RigaEsito[];
  giudici: Array<{ nome: NomeGiudice; ok: boolean }>;
  conteggi: { proposte: number; accettate: number; tenute: number };
}

export interface ContestoApplicazione {
  radice: string;
  /** `reports/assistente/<id>`, assoluta: la valida chi chiama. */
  cartella: string;
  featureRel: string;
  stepsRel: string;
  compito: Compito;
  proposta: Extract<EsitoProposta, { tipo: 'valida' }>;
  scelte: readonly Scelta[];
  giudici: Giudici;
  ora?: () => Date;
}

export interface RisultatoApplicazione {
  esito: 'applicato' | 'rifiutato-dai-giudici';
  giudici: EsitoGiudice[];
  sostituzioni: Sostituzione[];
  /** L'origine da scrivere nel manifesto per questi file. */
  origineFile: Origin;
}

const impronta = (file: string): string => createHash('sha256').update(fs.readFileSync(file)).digest('hex');

function leggiFile(radice: string, rel: string): { assoluto: string; testo: string } {
  const assoluto = path.resolve(radice, rel);
  if (!assoluto.startsWith(path.resolve(radice) + path.sep) || !fs.existsSync(assoluto)) {
    throw new ErroreApplicazione('file-non-trovato', 'non trovo lo scenario appena generato');
  }
  const testo = fs.readFileSync(assoluto, 'utf-8');
  if (!testo.includes(MARCATORE)) {
    throw new ErroreApplicazione('file-a-mano', 'questo file e\' stato modificato a mano: non lo tocco');
  }
  return { assoluto, testo };
}

function righeEsito(ctx: ContestoApplicazione, accettate: ReadonlySet<number>): RigaEsito[] {
  const viste = new Map(ctx.proposta.righe.map((r) => [r.passo, r]));
  return ctx.compito.passi.map((p): RigaEsito => {
    const r = viste.get(p.n);
    if (r?.scelta === 'voce' && accettate.has(p.n)) {
      return { passo: p.n, etichetta: p.etichetta, esito: 'frase-del-catalogo', voce: r.voce, origin: r.origin };
    }
    if (r?.scelta === 'voce') return { passo: p.n, etichetta: p.etichetta, esito: 'frase-propria', voce: r.voce, origin: 'persona' };
    return { passo: p.n, etichetta: p.etichetta, esito: 'nessuna-proposta', origin: r?.origin ?? ctx.proposta.origin };
  });
}

export async function applica(ctx: ContestoApplicazione): Promise<RisultatoApplicazione> {
  const feature = leggiFile(ctx.radice, ctx.featureRel);
  const steps = leggiFile(ctx.radice, ctx.stepsRel);
  const proposte = new Map<number, string>();
  for (const r of ctx.proposta.righe) if (r.scelta === 'voce' && r.voce !== undefined) proposte.set(r.passo, r.voce);

  // 1. Tutto in memoria: se qualcosa non va, il disco non e' stato toccato.
  const piano = pianificaRiscrittura({
    feature: feature.testo,
    steps: steps.testo,
    compito: ctx.compito,
    proposte,
    scelte: ctx.scelte,
    origin: ctx.proposta.origin,
  });

  // 2. L'istantanea, copia esatta.
  const prima = path.join(ctx.cartella, 'prima');
  fs.mkdirSync(prima, { recursive: true });
  fs.copyFileSync(feature.assoluto, path.join(prima, 'scenario.feature'));
  fs.copyFileSync(steps.assoluto, path.join(prima, 'step.ts'));
  const ripristina = (): void => {
    fs.copyFileSync(path.join(prima, 'scenario.feature'), feature.assoluto);
    fs.copyFileSync(path.join(prima, 'step.ts'), steps.assoluto);
  };

  // 3. Si scrive, e si fa giudicare.
  let giudici: EsitoGiudice[];
  try {
    fs.writeFileSync(feature.assoluto, piano.feature);
    fs.writeFileSync(steps.assoluto, piano.steps);
    giudici = await ctx.giudici({
      radice: ctx.radice,
      featureRel: ctx.featureRel,
      stepsRel: ctx.stepsRel,
      nuoveFrasi: piano.sostituzioni.map((s) => s.a),
    });
  } catch (e) {
    giudici = [{ nome: 'tsc', ok: false, dettaglio: (e as Error).message.slice(0, 500) }];
  }

  const accettato = giudici.length > 0 && giudici.every((g) => g.ok);
  if (!accettato) ripristina();

  const accettate = accettato ? new Set(piano.sostituzioni.map((s) => s.passo)) : new Set<number>();
  const righe = righeEsito(ctx, accettate);
  const esito: EsitoFile = {
    schema: 1,
    compito: ctx.compito.id,
    impronta: ctx.compito.catalogo.impronta,
    strumento: ctx.proposta.strumento,
    origin: ctx.proposta.origin,
    esito: accettato ? 'applicato' : 'rifiutato-dai-giudici',
    quando: (ctx.ora?.() ?? new Date()).toISOString(),
    file: { feature: ctx.featureRel, steps: ctx.stepsRel },
    impronte: { feature: impronta(feature.assoluto), steps: impronta(steps.assoluto) },
    righe,
    giudici: giudici.map((g) => ({ nome: g.nome, ok: g.ok })),
    conteggi: {
      proposte: ctx.proposta.righe.filter((r) => r.scelta === 'voce').length,
      accettate: accettate.size,
      tenute: righe.filter((r) => r.esito === 'frase-propria').length,
    },
  };
  fs.writeFileSync(path.join(ctx.cartella, 'esito.json'), JSON.stringify(esito, null, 2));

  return {
    esito: esito.esito === 'applicato' ? 'applicato' : 'rifiutato-dai-giudici',
    giudici,
    sostituzioni: accettato ? piano.sostituzioni : [],
    origineFile: ctx.proposta.origin,
  };
}

export async function annulla(ctx: { radice: string; cartella: string }): Promise<{ esito: 'annullato' }> {
  const fileEsito = path.join(ctx.cartella, 'esito.json');
  let esito: EsitoFile;
  try {
    esito = JSON.parse(fs.readFileSync(fileEsito, 'utf-8')) as EsitoFile;
  } catch {
    throw new ErroreApplicazione('niente-da-annullare', 'non c\'e\' niente da annullare');
  }
  if (esito.esito !== 'applicato') throw new ErroreApplicazione('niente-da-annullare', 'non c\'e\' niente da annullare');

  const feature = path.resolve(ctx.radice, esito.file.feature);
  const steps = path.resolve(ctx.radice, esito.file.steps);
  // Dopo il salvataggio i file hanno cambiato casa: annullare e' un lavoro di git.
  if (!fs.existsSync(feature) || !fs.existsSync(steps)) {
    throw new ErroreApplicazione('gia-salvato', 'lo scenario e\' gia\' stato salvato: non si annulla da qui');
  }
  if (impronta(feature) !== esito.impronte.feature || impronta(steps) !== esito.impronte.steps) {
    throw new ErroreApplicazione('modificato-a-mano', 'i file sono stati modificati dopo le scelte: non li tocco');
  }
  fs.copyFileSync(path.join(ctx.cartella, 'prima', 'scenario.feature'), feature);
  fs.copyFileSync(path.join(ctx.cartella, 'prima', 'step.ts'), steps);
  fs.writeFileSync(fileEsito, JSON.stringify({ ...esito, esito: 'annullato' }, null, 2));
  return { esito: 'annullato' };
}
