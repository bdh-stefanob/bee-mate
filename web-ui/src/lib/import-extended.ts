/**
 * Parser per il formato esteso QA team.
 *
 * Formato supportato:
 *
 *   @app @flusso
 *   Scenario: titolo
 *   Descrizione libera (→ commento Gherkin)
 *     #PAGE_NAME           → # PAGE_NAME (commento di pagina)
 *     Given step...        → keyword preservata
 *     step senza kw        → And step... (keyword inferita)
 *
 *   Parametri inline — ogni "label" [val1, val2] nella riga:
 *     "label" [v1,v2]      → {string} nell'espressione + paramEnum entry
 *     "label"              → valore letterale (nessun enum, rimane come scritto)
 *     step [...] a fine riga → backward compat (enum senza label)
 */

export interface ExtractedParamEnum {
  label: string;
  values: string[];
}

export interface ExtractedStepEnum {
  stepExpression: string;   // step con {string} al posto dei parametri con enum
  originalText: string;     // riga originale (senza keyword)
  paramEnums: ExtractedParamEnum[];
}

export interface ExtendedImportResult {
  gherkin: string;
  extractedEnums: ExtractedStepEnum[];
}

// ---------------------------------------------------------------------------
// Regexes
// ---------------------------------------------------------------------------

const GHERKIN_KEYWORDS_RE = /^(Given|When|Then|And|But)\s+/i;
const PAGE_COMMENT_RE = /^\s*#\S/;
const SCENARIO_RE = /^\s*Scenario(?:\s+Outline)?:/i;
const FEATURE_RE = /^\s*Feature:/i;
const TAG_RE = /^\s*@/;

// Match "label" [values] inline — non-greedy, handles "label" ["v1","v2"] or "label" [v1, v2]
const INLINE_PARAM_RE = /"([^"]+)"\s*\[([^\]]*)\]/g;

// Trailing [...] — backward compat for old format (no inline labels)
const TRAILING_ENUM_RE = /^(.*?)\s*\[([^\]]+)\]\s*$/;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseBracketValues(content: string): string[] {
  // Try quoted values inside brackets: "val1","val2"
  const quoted = [...content.matchAll(/"([^"]+)"/g)].map(m => m[1]);
  if (quoted.length > 0) return quoted;
  // Fallback: plain comma-separated
  return content.split(',').map(v => v.trim()).filter(Boolean);
}

function parseStepParams(
  stepBody: string
): { expression: string; paramEnums: ExtractedParamEnum[] } {
  const paramEnums: ExtractedParamEnum[] = [];
  let expression = stepBody;

  // Reset lastIndex before exec loop
  INLINE_PARAM_RE.lastIndex = 0;

  // Collect all "label" [...] matches first, then replace
  const matches: { full: string; label: string; values: string[] }[] = [];
  let m: RegExpExecArray | null;
  while ((m = INLINE_PARAM_RE.exec(stepBody)) !== null) {
    matches.push({
      full: m[0],
      label: m[1],
      values: parseBracketValues(m[2]),
    });
  }

  if (matches.length > 0) {
    for (const match of matches) {
      paramEnums.push({ label: match.label, values: match.values });
      expression = expression.replace(match.full, '{string}');
    }
  } else {
    // Backward compat: trailing [values] without label
    const trailingMatch = expression.match(TRAILING_ENUM_RE);
    if (trailingMatch) {
      expression = trailingMatch[1].trim();
      const values = parseBracketValues(trailingMatch[2]);
      if (values.length > 0) {
        paramEnums.push({ label: '{string}', values });
      }
    }
  }

  return { expression: expression.trim(), paramEnums };
}

// ---------------------------------------------------------------------------
// Detection
// ---------------------------------------------------------------------------

export function isExtendedFormat(text: string): boolean {
  return INLINE_PARAM_RE.test(text) || TRAILING_ENUM_RE.test(text) || PAGE_COMMENT_RE.test(text);
}

// ---------------------------------------------------------------------------
// Main parser
// ---------------------------------------------------------------------------

export function parseExtendedFormat(text: string): ExtendedImportResult {
  const lines = text.split('\n');
  const output: string[] = [];
  const extractedEnums: ExtractedStepEnum[] = [];

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

    // Page marker (#PAGE_NAME)
    if (trimmed.startsWith('#')) {
      output.push(`    ${trimmed}`);
      continue;
    }

    if (!inScenario) {
      output.push(trimmed);
      continue;
    }

    // Scenario description (free text before first step keyword)
    const hasKeyword = GHERKIN_KEYWORDS_RE.test(trimmed);
    if (!firstStepSeen && !hasKeyword) {
      output.push(`    # ${trimmed}`);
      continue;
    }

    firstStepSeen = true;

    // Strip keyword to process the step body
    const kwMatch = trimmed.match(GHERKIN_KEYWORDS_RE);
    const keyword = kwMatch ? kwMatch[1] : null;
    const stepBody = keyword ? trimmed.slice(keyword.length).trimStart() : trimmed;

    // Parse inline params and trailing enums
    const { expression: parsedExpr, paramEnums } = parseStepParams(stepBody);

    if (paramEnums.length > 0) {
      extractedEnums.push({
        stepExpression: parsedExpr,
        originalText: stepBody,
        paramEnums,
      });
    }

    // Build Gherkin line — keep {string} only in extractedEnums, write original expr in Gherkin
    const gherkinStep = parsedExpr.length > 0 ? parsedExpr : stepBody;
    const gherkinKeyword = keyword ?? 'And';
    output.push(`    ${gherkinKeyword} ${gherkinStep}`);
  }

  return { gherkin: output.join('\n'), extractedEnums };
}
