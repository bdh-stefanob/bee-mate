import { execFile } from 'child_process';
import { promisify } from 'util';
import { REPO_ROOT } from './repo';

/**
 * Rigenera `step-catalog.json` cosi' come fa `npm run catalog` (stesse tre
 * fasi, stesso ordine), senza passare da npm. Usata da ogni rotta che scrive
 * sui file sorgente e deve lasciare il catalogo aggiornato subito dopo
 * (`riconcilia`, `fondi`): estratta qui perche' prima viveva duplicata in una
 * sola di quelle rotte, e una seconda copia sarebbe stata la solita.
 *
 * Se fallisce non e' un errore della scrittura, che a questo punto e' gia'
 * avvenuta ed e' completa sui file sorgente — e' solo il catalogo che restera'
 * indietro fino al prossimo `npm run catalog` lanciato a mano.
 */

const NODE = process.execPath;
const TS_NODE = 'node_modules/ts-node/dist/bin.js';
const CUCUMBER_CLI = 'node_modules/@cucumber/cucumber/bin/cucumber-js';

// Asincrono, non `execFileSync`: le tre fasi durano circa 6 s (quasi tutto costo
// di avvio), e una chiamata sincrona teneva fermo il server per tutto quel tempo.
// Le fasi restano in fila, ognuna usa l'uscita della precedente: a non bloccare
// e' il server, non l'ordine.
export type LanciaFile = (
  eseguibile: string,
  argomenti: string[],
  opzioni: { cwd: string; timeout: number }
) => Promise<unknown>;

const lanciaFileReale: LanciaFile = promisify(execFile);

export async function tentaRigenerazioneCatalogo(lancia: LanciaFile = lanciaFileReale): Promise<boolean> {
  const opzioni = { cwd: REPO_ROOT, timeout: 60000 };
  try {
    await lancia(NODE, [CUCUMBER_CLI, '--dry-run', '--format', 'message:cucumber-messages.ndjson'], opzioni);
    await lancia(NODE, [TS_NODE, 'scripts/extract-steps.ts', 'cucumber-messages.ndjson'], opzioni);
    await lancia(NODE, [TS_NODE, 'scripts/render-markdown.ts'], opzioni);
    return true;
  } catch (err) {
    console.error('rigenerazione del catalogo non riuscita dopo la riscrittura:', err);
    return false;
  }
}
