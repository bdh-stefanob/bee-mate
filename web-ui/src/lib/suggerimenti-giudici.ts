import * as fs from 'fs';
import * as path from 'path';
import { execFile } from 'child_process';
import type { EsitoGiudice, Giudici } from './suggerimenti-applica';

/**
 * I tre giudici che non sono pareri, applicati a uno scenario appena riscritto
 * (F18): nessuno e' nuovo, sono quelli che il progetto ha gia'.
 *
 *  - `tsc`: la glue compila? (un metodo o un tipo inventato, una stringa spezzata)
 *  - `dry-run`: ogni frase del .feature ha la sua definizione, e una sola? La prova a
 *    vuoto di Cucumber esce con 0 anche quando trova passi indefiniti: l'esito si
 *    legge dal riepilogo, non dal codice di uscita.
 *  - `validatore`: ogni frase appena entrata e' nel catalogo, parola per parola? E'
 *    il controllo di `validate-steps` ristretto alle frasi che sono cambiate: il
 *    validatore intero boccerebbe sempre uno scenario appena generato, perche' le
 *    frasi del tester non sono ancora nel catalogo, e un giudice che dice sempre no
 *    non giudica niente.
 *
 * Nessuna shell: Node sul file di avvio del programma, argomenti come lista.
 * Cosa NON garantiscono: che la frase scelta voglia dire la stessa cosa. Quello lo
 * giudica la persona che accetta (vedi la spec, sezione 1).
 */

const TSC = 'node_modules/typescript/bin/tsc';
const CUCUMBER = 'node_modules/@cucumber/cucumber/bin/cucumber.js';
const TEMPO_MASSIMO_MS = 120_000;
const ANSI = /\u001b\[[0-9;]*[A-Za-z]/g;

interface Uscita {
  codice: number;
  testo: string;
}

function lancia(radice: string, argomenti: string[], env: Record<string, string> = {}): Promise<Uscita> {
  return new Promise((resolve) => {
    execFile(
      process.execPath,
      argomenti,
      { cwd: radice, env: { ...process.env, ...env }, timeout: TEMPO_MASSIMO_MS, windowsHide: true, maxBuffer: 8 * 1024 * 1024 },
      (errore, stdout, stderr) => {
        const testo = `${stdout}\n${stderr}`.replace(ANSI, '');
        const codice = errore ? (typeof (errore as { code?: unknown }).code === 'number' ? (errore as { code: number }).code : 1) : 0;
        resolve({ codice, testo });
      }
    );
  });
}

const ultimeRighe = (testo: string, n = 8): string => testo.trim().split(/\r?\n/).slice(-n).join('\n');

/** Il riepilogo della prova a vuoto dice se ci sono passi senza definizione o ambigui. */
export function proveAVuotoConProblemi(uscita: string): string | null {
  const m = uscita.match(/\b(\d+) (undefined|ambiguous|failed)\b/);
  return m ? `${m[1]} ${m[2]}` : null;
}

/** Ogni frase appena entrata deve essere un'espressione del catalogo, esatta. */
export function validatoreFrasi(nuoveFrasi: readonly string[], espressioni: readonly string[]): EsitoGiudice {
  const note = new Set(espressioni);
  const mancanti = nuoveFrasi.filter((f) => !note.has(f));
  return mancanti.length === 0
    ? { nome: 'validatore', ok: true }
    : { nome: 'validatore', ok: false, dettaglio: `non sono nel catalogo: ${mancanti.join(' | ')}` };
}

function espressioniDelCatalogo(radice: string): string[] {
  try {
    const json = JSON.parse(fs.readFileSync(path.join(radice, 'step-catalog.json'), 'utf-8')) as { steps?: Array<{ expression?: string }> };
    return (json.steps ?? []).map((s) => s.expression ?? '').filter(Boolean);
  } catch {
    return [];
  }
}

export function giudiciVeri(): Giudici {
  return async ({ radice, featureRel, nuoveFrasi }) => {
    const esiti: EsitoGiudice[] = [];

    const tsc = await lancia(radice, [TSC, '--noEmit', '-p', 'tsconfig.json']);
    esiti.push({ nome: 'tsc', ok: tsc.codice === 0, ...(tsc.codice === 0 ? {} : { dettaglio: ultimeRighe(tsc.testo) }) });

    const prova = await lancia(radice, [CUCUMBER, '--dry-run'], { BDD_PATHS: featureRel });
    const problema = proveAVuotoConProblemi(prova.testo);
    const dryOk = prova.codice === 0 && problema === null;
    esiti.push({ nome: 'dry-run', ok: dryOk, ...(dryOk ? {} : { dettaglio: problema ?? ultimeRighe(prova.testo) }) });

    esiti.push(validatoreFrasi(nuoveFrasi, espressioniDelCatalogo(path.resolve(radice))));
    return esiti;
  };
}
