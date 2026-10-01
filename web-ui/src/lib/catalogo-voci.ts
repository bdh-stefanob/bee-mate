import * as fs from 'fs';
import * as path from 'path';
import type { CatalogStep } from './types';

/**
 * Togliere dal catalogo la voce di una frase che non esiste piu' nel codice.
 *
 * PERCHE' SERVE
 * La rigenerazione del catalogo (`scripts/extract-steps.ts`, regola in
 * `scripts/lib/catalog-merge.ts`) conserva le voci `wanted` che il codice non
 * definisce: sono le richieste del team, e non devono sparire. Ma uno step
 * `wanted` che una registrazione ha gia' collegato a uno stub nel codice e' una
 * voce del codice, non una richiesta: se lo si rinomina, la vecchia frase
 * resterebbe nel catalogo come un fantasma "da realizzare", usato da nessuno
 * scenario. Lo stesso, rovesciato, quando si annulla la rinomina (resterebbe la
 * frase nuova). Quindi, PRIMA di rigenerare, si toglie quella voce.
 *
 * Una voce `implemented` non si tocca: la rigenerazione la rifa' da sola dal
 * codice. Se il file non si legge non si fa niente: e' un servizio, non un requisito.
 */
export function togliVoceDalCatalogo(repoRoot: string, espressione: string): boolean {
  const file = path.join(repoRoot, 'step-catalog.json');
  try {
    const json = JSON.parse(fs.readFileSync(file, 'utf-8')) as { steps?: CatalogStep[]; [k: string]: unknown };
    const steps = json.steps ?? [];
    const restanti = steps.filter((s) => !(s.expression === espressione && s.status !== 'implemented'));
    if (restanti.length === steps.length) return false;
    const senzaDoc = restanti.filter((s) => !s.documented).length;
    const nuovo = { ...json, totalSteps: restanti.length, documentedSteps: restanti.length - senzaDoc, undocumentedSteps: senzaDoc, steps: restanti };
    fs.writeFileSync(file, JSON.stringify(nuovo, null, 2));
    return true;
  } catch {
    return false;
  }
}
