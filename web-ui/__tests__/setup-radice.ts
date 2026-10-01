import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

// Ogni file di test lavora su una radice usa-e-getta, non sul repository di chi
// li lancia: `REPO_ROOT` (src/lib/repo.ts) la legge da BDD_WORKSPACE. Cosi' un
// test che scrive sotto `reports/` o `src/features/` non lascia niente nella
// cartella di lavoro, e nessun test dipende da cosa c'e' in `reports/`.
// Gira prima che il file di test importi qualunque modulo; la pulizia e' in
// globale-radice.ts.
const radice = fs.mkdtempSync(path.join(process.env.BDD_TEST_MADRE ?? os.tmpdir(), 'r-'));
process.env.BDD_WORKSPACE = radice;

// I due file versionati che la rotta del catalogo legge dalla radice: si copiano,
// cosi' la radice finta ha il minimo che un clone pulito ha comunque.
const vera = path.resolve(process.cwd(), '..');
for (const nome of ['step-catalog.json', 'step-enums.json']) {
  const origine = path.join(vera, nome);
  if (fs.existsSync(origine)) fs.copyFileSync(origine, path.join(radice, nome));
}
