import * as path from 'path';

/**
 * REPO_ROOT: root directory del repository.
 * In Electron production BDD_WORKSPACE è impostato da main.js (cartella scelta dall'utente).
 * In dev: process.cwd() = web-ui/, quindi saliamo di un livello.
 */
export const REPO_ROOT = process.env.BDD_WORKSPACE
  ? path.resolve(process.env.BDD_WORKSPACE)
  : path.resolve(process.cwd(), '..');

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

  // Guard path traversal: il path risolto deve essere STRETTAMENTE dentro FEATURES_DIR.
  // WR-04: normalise to lower-case before comparison to handle case-insensitive
  // filesystems (Windows/macOS) where mixed-case paths would bypass startsWith.
  const prefix = (FEATURES_DIR + path.sep).toLowerCase();
  const normalised = resolved.toLowerCase();
  if (!normalised.startsWith(prefix)) {
    return null;
  }

  // Guard estensione: solo file .feature
  if (!resolved.endsWith('.feature')) {
    return null;
  }

  return resolved;
}
