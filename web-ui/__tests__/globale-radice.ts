import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

// Una cartella madre per tutta la corsa: ogni file di test ci crea la sua radice
// (vedi setup-radice.ts) e qui, a corsa finita, si toglie tutto in un colpo. I
// processi di lavoro di vitest vengono terminati senza lasciar eseguire un
// `process.on('exit')`, quindi la pulizia non puo' stare nei file di test.
export default function () {
  const madre = fs.mkdtempSync(path.join(os.tmpdir(), 'bdd-test-'));
  process.env.BDD_TEST_MADRE = madre;
  return () => fs.rmSync(madre, { recursive: true, force: true });
}
