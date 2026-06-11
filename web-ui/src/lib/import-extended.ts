/**
 * Parser per il formato esteso QA team:
 *
 *   @app @flusso
 *   Scenario: titolo
 *   Descrizione libera (diventa commento Gherkin)
 *     #PageName        → # PageName (commento di pagina, ricercabile con # nella UI)
 *     Given step...    → keyword preservata
 *     step senza kw    → And step... (keyword inferita)
 *     step [a, b, c]   → strip bracket, enum values estratti
 *
 * Regole step:
 * - Tutto lowercase, eccetto quando lo step contiene il nome della pagina (maiuscolo)
 * - Nessuna validazione contro il catalogo
 * - Steps accettati verbatim dopo aver rimosso [...]
 */

export interface ExtendedImportResult {
  gherkin: string;
  /** step text → enum values estratti dai bracket [...] */
  extractedEnums: { stepText: string; values: string[] }[];
}

const GHERKIN_KEYWORDS_RE = /^(Given|When|Then|And|But)\s+/i;
const PAGE_COMMENT_RE = /^\s*#\S/;
const SCENARIO_RE = /^\s*Scenario(?:\s+Outline)?:/i;
const FEATURE_RE = /^\s*Feature:/i;
const TAG_RE = /^\s*@/;
const ENUM_SUFFIX_RE = /^(.*?)\s*\[([^\]]+)\]\s*$/;

export function isExtendedFormat(text: string): boolean {
  return ENUM_SUFFIX_RE.test(text) || PAGE_COMMENT_RE.test(text);
}

export function parseExtendedFormat(text: string): ExtendedImportResult {
  const lines = text.split('\n');
  const output: string[] = [];
  const extractedEnums: ExtendedImportResult['extractedEnums'] = [];

  let hasFeature = false;
  let inScenario = false;
  let firstStepSeen = false;

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();

    if (!trimmed) {
      output.push('');
      continue;
    }

    // Tags (@app @flusso)
    if (TAG_RE.test(trimmed)) {
      output.push(trimmed);
      continue;
    }

    // Feature:
    if (FEATURE_RE.test(trimmed)) {
      hasFeature = true;
      output.push(trimmed);
      continue;
    }

    // Scenario:
    if (SCENARIO_RE.test(trimmed)) {
      if (!hasFeature) {
        output.push('Feature: Imported');
        output.push('');
        hasFeature = true;
      }
      inScenario = true;
      firstStepSeen = false;
      output.push(`  ${trimmed}`);
      continue;
    }

    // Page marker comment (#PageName) — kept as Gherkin comment
    if (trimmed.startsWith('#')) {
      output.push(`    ${trimmed}`);
      continue;
    }

    if (!inScenario) {
      output.push(trimmed);
      continue;
    }

    // Scenario description (free text before first step)
    const hasKeyword = GHERKIN_KEYWORDS_RE.test(trimmed);
    if (!firstStepSeen && !hasKeyword) {
      output.push(`    # ${trimmed}`);
      continue;
    }

    firstStepSeen = true;

    // Extract [...] enum values
    const enumMatch = trimmed.match(ENUM_SUFFIX_RE);
    const stepText = enumMatch ? enumMatch[1].trim() : trimmed;
    if (enumMatch) {
      const values = enumMatch[2].split(',').map(v => v.trim()).filter(Boolean);
      if (values.length > 0) {
        extractedEnums.push({ stepText, values });
      }
    }

    // Preserve existing keyword or prepend And
    if (GHERKIN_KEYWORDS_RE.test(stepText)) {
      output.push(`    ${stepText}`);
    } else {
      output.push(`    And ${stepText}`);
    }
  }

  return { gherkin: output.join('\n'), extractedEnums };
}
