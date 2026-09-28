import * as path from 'path';
import { dentroLaCartellaSuDisco } from './percorsi-disco';

/**
 * percorso-definizione.ts
 * ------------------------
 * `CatalogStep.sourceRef` e' una stringa tipo `src\steps\human-recharge\...ts:136`
 * (percorso relativo al repo, non a `src/`, con la riga in coda). Chi deve
 * leggere il file della definizione (la fusione, e ora anche il "cosa fa uno
 * step" del catalogo) deve risolverla nello stesso modo, con la stessa
 * guardia anti-traversal — un solo posto, non una copia per rotta.
 */
export function percorsoDefinizione(cartellaSrc: string, sourceRef: string): string | null {
  const senzaRiga = sourceRef.replace(/:\d+$/, '');
  const relativoASrc = senzaRiga.replace(/\\/g, '/').replace(/^src\//, '');
  return dentroLaCartellaSuDisco(cartellaSrc, relativoASrc, '.ts');
}

export function cartellaSrcDiRepo(repoRoot: string): string {
  return path.join(repoRoot, 'src');
}
