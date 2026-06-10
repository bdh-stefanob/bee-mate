import * as path from 'path';

/**
 * REPO_ROOT: root directory del repository, un livello sopra web-ui/.
 * Assumendo che npm run dev venga eseguito da web-ui/, process.cwd() = web-ui/.
 */
export const REPO_ROOT = path.resolve(process.cwd(), '..');

/**
 * FEATURES_DIR: directory radice dei file .feature nel repository.
 */
export const FEATURES_DIR = path.resolve(REPO_ROOT, 'src', 'features');

/**
 * slugify: trasforma una stringa in un slug URL-friendly.
 * Copia esatta della funzione in scripts/import-scenarios.ts.
 */
export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * safeFeaturePath: risolve un path relativo a FEATURES_DIR e verifica
 * che non sia path traversal e che abbia estensione .feature.
 *
 * Guard T-04-01: impedisce accesso a file fuori da src/features/.
 *
 * @param rel - path relativo (es. "auth/login.feature")
 * @returns path assoluto sicuro, oppure null se non valido
 */
export function safeFeaturePath(rel: string): string | null {
  const resolved = path.resolve(FEATURES_DIR, rel);

  // Guard path traversal: il path risolto deve essere dentro FEATURES_DIR
  const featuresPrefix = FEATURES_DIR + path.sep;
  if (!resolved.startsWith(featuresPrefix) && resolved !== FEATURES_DIR) {
    return null;
  }

  // Guard estensione: solo file .feature
  if (!resolved.endsWith('.feature')) {
    return null;
  }

  return resolved;
}
