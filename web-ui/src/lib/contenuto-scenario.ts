import * as fs from 'fs';
import * as path from 'path';
import type { CatalogStep } from './types';
import { dentroLaCartellaSuDisco } from './percorsi-disco';
import { MARCATORE } from './marcatore';
import { improntaDiTesto } from './impronta-scenario';
import { espressioneInRegex, trovaUsatoIn } from './catalogo';
import { haParametri } from './riscrittura-step';
import { leggiPassi, titoloDi, valutaSemplicita, type PassoLetto } from './modifica-scenario';
import { ErrorePiano, type RadiciModifica } from './errore-piano';

/**
 * Cio' che serve a chi modifica uno scenario, letto dal disco in una volta
 * (`GET /api/scenari/contenuto`): il testo con la sua `versione`, i passi con chi
 * li condivide e se si possono rinominare, e i passi che si possono offrire come
 * sostituti. Sola lettura: nessuna guardia di origine, nessuna scrittura.
 *
 * Tutti i percorsi sono relativi a `src/features/`, con `/`: mai assoluti.
 */

export type MotivoNonRinominabile = 'sconosciuto' | 'ambiguo' | 'parametri' | 'comune' | 'generato';

export interface PassoDelPannello extends PassoLetto {
  /** Gli altri scenari che usano la stessa frase. */
  condivisoCon: Array<{ file: string; scenario: string }>;
  rinominabile: boolean;
  motivo?: MotivoNonRinominabile;
  /** Lo stato del passo nel catalogo, se lo riconosce (`wanted` = il test partira' e fallira'). */
  stato?: CatalogStep['status'];
}

export interface PassoOffribile {
  frase: string;
  app: string;
  area: string;
  intento?: string;
}

export interface Contenuto {
  testo: string;
  /** `improntaDiTesto` del file com'e' adesso: serve a accorgersi che e' cambiato. */
  versione: string;
  /** Il file porta ancora il marcatore di generazione: modificandolo diventa "tuo". */
  marcatore: boolean;
  semplice: boolean;
  /** Perche' la modifica guidata non c'e': non salvato, documentato, o struttura che non copre. */
  ragione?: 'registrato' | 'documento' | 'complesso';
  titolo: string;
  passi: PassoDelPannello[];
  /** Solo passi `implemented` senza parametri: quelli che "Usa un altro passo" puo' offrire. */
  offribili: PassoOffribile[];
  /** Tutte le espressioni `implemented` (per il testo avanzato). */
  espressioni: string[];
}

export function leggiCatalogoPassi(repoRoot: string): CatalogStep[] {
  try {
    const json = JSON.parse(fs.readFileSync(path.join(repoRoot, 'step-catalog.json'), 'utf-8')) as { steps?: CatalogStep[] };
    return Array.isArray(json.steps) ? json.steps : [];
  } catch {
    throw new ErrorePiano('catalogo', 500, 'catalogo non leggibile');
  }
}

/** Cartella degli step in cui sta la definizione (`steps/common/`, `steps/generated/`, `steps/<app>/...`). */
function cartellaDefinizione(sourceRef: string): string {
  const m = sourceRef.replace(/\\/g, '/').match(/steps\/([^/]+)\//);
  return m ? m[1] : '';
}

/**
 * Si puo' rinominare questo passo da qui? Solo se ha una frase senza parametri,
 * una definizione sua (non quella comune a ogni scenario del progetto, non
 * quella di una bozza non ancora salvata) e il catalogo lo riconosce una volta
 * sola. Le stesse ragioni di `riscrittura-step.ts`.
 */
export function giudicaRinominabile(trovati: readonly CatalogStep[]): { rinominabile: true } | { rinominabile: false; motivo: MotivoNonRinominabile } {
  if (trovati.length === 0) return { rinominabile: false, motivo: 'sconosciuto' };
  if (trovati.length > 1) return { rinominabile: false, motivo: 'ambiguo' };
  const s = trovati[0];
  if (haParametri(s.expression)) return { rinominabile: false, motivo: 'parametri' };
  const cartella = cartellaDefinizione(s.sourceRef);
  if (cartella === 'common') return { rinominabile: false, motivo: 'comune' };
  if (cartella === 'generated') return { rinominabile: false, motivo: 'generato' };
  return { rinominabile: true };
}

/** Il percorso (assoluto) di un `.feature` dopo le guardie; lancia `ErrorePiano` se non e' ammesso o non c'e'. */
export function percorsoFeature(radici: RadiciModifica, file: string): string {
  const assoluto = typeof file === 'string' && file ? dentroLaCartellaSuDisco(radici.featuresDir, file, '.feature') : null;
  if (!assoluto || file.includes('\\')) throw new ErrorePiano('percorso', 403, 'percorso non ammesso');
  if (!fs.existsSync(assoluto)) throw new ErrorePiano('non-trovato', 404, 'scenario non trovato');
  return assoluto;
}

/** Perche' uno scenario non si modifica con i gesti, o `undefined` se si puo'. */
export function ragioneNonModificabile(file: string, testo: string): 'registrato' | 'documento' | 'complesso' | undefined {
  if (file.split('/')[0] === 'generated') return 'registrato';
  const s = valutaSemplicita(testo);
  return s.semplice ? undefined : s.ragione;
}

export function leggiContenuto(radici: RadiciModifica, file: string): Contenuto {
  const assoluto = percorsoFeature(radici, file);
  const testo = fs.readFileSync(assoluto, 'utf-8');
  const catalogo = leggiCatalogoPassi(radici.repoRoot);
  const ragione = ragioneNonModificabile(file, testo);
  const regex = new Map(catalogo.map((s) => [s.expression, espressioneInRegex(s.expression)]));
  const usi = trovaUsatoIn(catalogo, radici.featuresDir);

  const passi: PassoDelPannello[] = leggiPassi(testo).map((p) => {
    const trovati = catalogo.filter((s) => regex.get(s.expression)!.test(p.frase));
    const giudizio = giudicaRinominabile(trovati);
    const altri =
      trovati.length === 1
        ? (usi.get(trovati[0].expression) ?? [])
            .filter((u) => u.file !== file)
            // una riga per scenario, non una per riga di passo
            .filter((u, i, tutti) => tutti.findIndex((v) => v.file === u.file && v.scenario === u.scenario) === i)
            .map((u) => ({ file: u.file, scenario: u.scenario }))
        : [];
    return {
      ...p,
      condivisoCon: altri,
      rinominabile: giudizio.rinominabile,
      ...(giudizio.rinominabile ? {} : { motivo: giudizio.motivo }),
      ...(trovati.length === 1 ? { stato: trovati[0].status } : {}),
    };
  });

  const implementati = catalogo.filter((s) => s.status === 'implemented');
  return {
    testo,
    versione: improntaDiTesto(testo),
    marcatore: testo.includes(MARCATORE),
    semplice: ragione === undefined,
    ...(ragione ? { ragione } : {}),
    titolo: titoloDi(testo),
    passi,
    offribili: implementati
      .filter((s) => !haParametri(s.expression))
      .map((s) => ({ frase: s.expression, app: s.app, area: s.area, ...(s.doc?.intent ? { intento: s.doc.intent } : {}) })),
    espressioni: implementati.map((s) => s.expression),
  };
}
