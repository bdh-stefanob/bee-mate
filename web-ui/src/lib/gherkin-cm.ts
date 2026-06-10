/**
 * gherkin-cm.ts
 *
 * CodeMirror 6 language support for Gherkin:
 * - Syntax highlighting via StreamParser (StreamLanguage)
 * - Theme extension mapping highlight tags to design-system CSS custom properties
 * - Gherkin linter (Diagnostic[]) using @codemirror/lint
 */

import { StreamLanguage, StreamParser, HighlightStyle } from '@codemirror/language';
import { syntaxHighlighting } from '@codemirror/language';
import { tags } from '@lezer/highlight';
import { linter, Diagnostic } from '@codemirror/lint';
import type { Extension } from '@codemirror/state';

// ---------------------------------------------------------------------------
// 1. StreamParser for Gherkin
// ---------------------------------------------------------------------------

/** Lines that introduce structural blocks */
const STRUCTURE_RE = /^(Feature:|Rule:|Background:|Scenario:|Scenario Outline:|Examples:)/;
/** Step keywords */
const STEP_RE = /^(Given |When |Then |And |But )/;

interface GherkinState {
  _dummy?: never;
}

const gherkinParser: StreamParser<GherkinState> = {
  name: 'gherkin',
  startState: () => ({}),

  token(stream) {
    // Tags / annotations
    if (stream.match(/^@\S+/)) {
      return 'typeName';
    }

    // Comments
    if (stream.match(/^#.*/)) {
      return 'lineComment';
    }

    // Table rows
    if (stream.match(/^\|.*/)) {
      return 'string';
    }

    // Structure keywords
    if (stream.match(STRUCTURE_RE)) {
      // consume the rest of the line as part of the keyword token
      stream.skipToEnd();
      return 'keyword';
    }

    // Step keywords (must start at column 0 after optional spaces)
    // We need to handle indented steps — peek at the whole line
    const sol = stream.string.trimStart();
    if (STEP_RE.test(sol)) {
      stream.skipToEnd();
      return 'definitionKeyword';
    }

    // Default: consume the rest of the line as plain text
    stream.skipToEnd();
    return null;
  },
};

/** The Gherkin StreamLanguage instance */
export const gherkinLanguage = StreamLanguage.define(gherkinParser);

// ---------------------------------------------------------------------------
// 2. Syntax-highlight theme
// ---------------------------------------------------------------------------

/**
 * Maps highlight tags to CSS custom properties from the Boots teal design system.
 * Colours:
 *   keyword (Feature/Scenario…)  → teal (primary)
 *   definitionKeyword (Given…)   → green (#22c55e)
 *   lineComment                  → muted-foreground, italic
 *   typeName (@tags)             → accent (orange)
 *   string (tables)              → blue-ish oklch
 */
export const gherkinHighlightStyle = HighlightStyle.define([
  {
    tag: tags.keyword,
    color: 'var(--primary)',
    fontWeight: 'bold',
  },
  {
    tag: tags.definitionKeyword,
    color: '#22c55e',
  },
  {
    tag: tags.lineComment,
    color: 'var(--muted-foreground)',
    fontStyle: 'italic',
  },
  {
    tag: tags.typeName,
    color: 'var(--accent)',
  },
  {
    tag: tags.string,
    color: 'oklch(65% 0.14 240)',
  },
]);

/** Combined extension: language + highlighting */
export const gherkinTheme: Extension = syntaxHighlighting(gherkinHighlightStyle);

// ---------------------------------------------------------------------------
// 3. Gherkin linter
// ---------------------------------------------------------------------------

const STEP_LINE_RE = /^\s*(Given|When|Then|And|But)\s+/;
const SCENARIO_START_RE = /^\s*(Scenario:|Scenario Outline:|Background:)/;
const FEATURE_LINE_RE = /^\s*Feature:/;

/**
 * Gherkin linter:
 *  - ERROR: step line not inside a Scenario/Background block
 *  - WARNING: Scenario block with no step lines
 *  - WARNING: document has no Feature: line
 */
export const gherkinLinter = linter((view) => {
  const diagnostics: Diagnostic[] = [];
  const doc = view.state.doc;
  const lines = doc.lines;

  let hasFeature = false;
  let inBlock = false; // inside a Scenario/Background block
  let blockStart = 0; // line number of current block start (1-based)
  let blockHasSteps = false;
  let blockFrom = 0; // character offset of block keyword line start

  for (let lineNum = 1; lineNum <= lines; lineNum++) {
    const line = doc.line(lineNum);
    const text = line.text;

    if (FEATURE_LINE_RE.test(text)) {
      hasFeature = true;
      continue;
    }

    if (SCENARIO_START_RE.test(text)) {
      // Close previous block if open
      if (inBlock && !blockHasSteps) {
        diagnostics.push({
          from: blockFrom,
          to: blockFrom,
          severity: 'warning',
          message: 'Scenario/Background block has no step lines (Given/When/Then)',
        });
      }
      inBlock = true;
      blockStart = lineNum;
      blockHasSteps = false;
      blockFrom = line.from;
      continue;
    }

    if (STEP_LINE_RE.test(text)) {
      if (!inBlock) {
        diagnostics.push({
          from: line.from,
          to: line.to,
          severity: 'error',
          message: 'Step keyword (Given/When/Then/And/But) used outside a Scenario or Background block',
        });
      } else {
        blockHasSteps = true;
      }
    }
  }

  // Close last block
  if (inBlock && !blockHasSteps) {
    diagnostics.push({
      from: blockFrom,
      to: blockFrom,
      severity: 'warning',
      message: 'Scenario/Background block has no step lines (Given/When/Then)',
    });
  }

  if (!hasFeature && doc.length > 0) {
    diagnostics.push({
      from: 0,
      to: Math.min(doc.length, 1),
      severity: 'warning',
      message: 'Document has no Feature: declaration',
    });
  }

  return diagnostics;
});
