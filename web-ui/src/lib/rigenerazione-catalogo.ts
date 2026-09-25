import { execFileSync } from 'child_process';
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

export function tentaRigenerazioneCatalogo(): boolean {
  try {
    execFileSync(NODE, [CUCUMBER_CLI, '--dry-run', '--format', 'message:cucumber-messages.ndjson'], {
      cwd: REPO_ROOT,
      timeout: 60000,
    });
    execFileSync(NODE, [TS_NODE, 'scripts/extract-steps.ts', 'cucumber-messages.ndjson'], {
      cwd: REPO_ROOT,
      timeout: 60000,
    });
    execFileSync(NODE, [TS_NODE, 'scripts/render-markdown.ts'], { cwd: REPO_ROOT, timeout: 60000 });
    return true;
  } catch (err) {
    console.error('rigenerazione del catalogo non riuscita dopo la riscrittura:', err);
    return false;
  }
}
