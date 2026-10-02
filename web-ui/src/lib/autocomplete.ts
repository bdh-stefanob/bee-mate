/**
 * Regex che detecta una keyword Gherkin (Given/When/Then/And/But)
 * sull'ultima riga del testo.
 * Gruppo 1: keyword
 * Gruppo 2: testo dopo la keyword (puo' essere vuoto)
 * Usata dal completamento di `GherkinEditor`.
 */
export const GHERKIN_PREFIX_RE = /(?:^|\n)\s*(Given|When|Then|And|But)\s+([^\n]*)$/;
