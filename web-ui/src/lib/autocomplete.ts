import type { CatalogStep } from './types';

/**
 * Regex che detecta una keyword Gherkin (Given/When/Then/And/But)
 * sull'ultima riga del testo.
 * Gruppo 1: keyword
 * Gruppo 2: testo dopo la keyword (può essere vuoto)
 */
export const GHERKIN_PREFIX_RE = /(?:^|\n)\s*(Given|When|Then|And|But)\s+([^\n]*)$/;

/**
 * getAutocompletePrefix
 * Estrae il prefisso testuale (dopo la keyword Gherkin) dall'ultima riga del testo.
 * Ritorna null se l'ultima riga non inizia con una keyword Gherkin.
 *
 * Esempi:
 *   'Given I add'  → 'I add'
 *   'When '        → ''
 *   'Feature: x'  → null
 *   'Given foo\nThen I land' → 'I land'
 */
export function getAutocompletePrefix(text: string): string | null {
  const m = text.match(GHERKIN_PREFIX_RE);
  if (!m) return null;
  return m[2]; // testo dopo la keyword (può essere stringa vuota)
}

/**
 * getSuggestions
 * Ritorna gli step del catalog che iniziano con il prefisso sull'ultima riga,
 * case-insensitive, max 8 risultati.
 *
 * @param text   - testo corrente dell'editor (può essere multi-riga)
 * @param steps  - lista di step dal catalog
 * @returns array di CatalogStep corrispondenti, max 8
 */
export function getSuggestions(text: string, steps: CatalogStep[]): CatalogStep[] {
  const prefix = getAutocompletePrefix(text);
  if (prefix === null) return [];
  const p = prefix.toLowerCase();
  return steps
    .filter(s => s.expression.toLowerCase().startsWith(p))
    .slice(0, 8);
}
