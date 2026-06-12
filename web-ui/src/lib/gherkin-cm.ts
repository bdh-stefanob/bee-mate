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
    // Consume leading whitespace first (collapses indent into one null-token)
    if (stream.eatSpace()) return null;

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

    // Structure keywords — now safe after eatSpace()
    if (stream.match(STRUCTURE_RE)) {
      stream.skipToEnd();
      return 'keyword';
    }

    // Step keywords — now safe after eatSpace()
    if (stream.match(STEP_RE)) {
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
    color: 'var(--cm-keyword)',
    fontWeight: '700',
  },
  {
    tag: tags.definitionKeyword,
    color: 'var(--cm-step)',
    fontWeight: '600',
  },
  {
    tag: tags.lineComment,
    color: 'var(--cm-comment)',
    fontStyle: 'italic',
  },
  {
    tag: tags.typeName,
    color: 'var(--cm-tag)',
  },
  {
    tag: tags.string,
    color: 'var(--cm-table)',
  },
]);

/** Combined extension: language + highlighting */
export const gherkinTheme: Extension = syntaxHighlighting(gherkinHighlightStyle);

// ---------------------------------------------------------------------------
// 3. Gherkin linter
// ---------------------------------------------------------------------------

const STEP_LINE_RE = /^\s*(Given|When|Then|And|But)\s+/;
const ANY_CASE_STEP_RE = /^\s*(given|when|then|and|but)\s+/i;
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
    } else if (ANY_CASE_STEP_RE.test(text)) {
      if (inBlock) blockHasSteps = true;
      const kw = text.trimStart().match(/^\w+/)?.[0] ?? '';
      if (kw) {
        const fixed = kw.charAt(0).toUpperCase() + kw.slice(1).toLowerCase();
        diagnostics.push({
          from: line.from,
          to: line.to,
          severity: 'warning',
          message: `"${kw}" → "${fixed}" (capitalise step keyword)`,
        });
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

// ---------------------------------------------------------------------------
// 4. Gherkin auto-formatter
// ---------------------------------------------------------------------------

/**
 * Normalises Gherkin indentation per the official Cucumber spec:
 *
 *   col 0  — Feature:, Rule:, #comments, @tags before Feature
 *   col 2  — Background:, Scenario:, Scenario Outline:, @tags before Scenario
 *   col 4  — Given/When/Then/And/But steps, Examples:
 *   col 6  — | table rows |
 *
 * Tags are placed at col 0 if the next non-empty line is Feature/Rule,
 * otherwise at col 2 (before Scenario/Background).
 * Collapses consecutive blank lines to max 1.
 */
export function formatGherkin(text: string): string {
  const rawLines = text.split('\n');
  const trimmed = rawLines.map(l => l.trim());
  const out: string[] = [];
  let prevBlank = false;
  // Track indentation context so comments inherit the right column
  let ctx: 'top' | 'feature' | 'scenario' = 'top';

  for (let i = 0; i < trimmed.length; i++) {
    const t = trimmed[i];

    if (!t) {
      if (!prevBlank) out.push('');
      prevBlank = true;
      continue;
    }
    prevBlank = false;

    if (/^(Feature:|Rule:)/.test(t)) {
      ctx = 'feature';
      out.push(t);                             // col 0
    } else if (/^(Background:|Scenario:|Scenario Outline:)/.test(t)) {
      ctx = 'scenario';
      out.push('  ' + t);                      // col 2
    } else if (/^(Given |When |Then |And |But )/.test(t)) {
      out.push('    ' + t);                    // col 4
    } else if (/^Examples:/.test(t)) {
      out.push('    ' + t);                    // col 4 (inside Scenario Outline)
    } else if (t.startsWith('|')) {
      out.push('      ' + t);                  // col 6
    } else if (t.startsWith('@')) {
      // Look ahead: col 0 if next non-empty line is Feature/Rule, else col 2
      let nextContent = '';
      for (let j = i + 1; j < trimmed.length; j++) {
        if (trimmed[j]) { nextContent = trimmed[j]; break; }
      }
      const atCol0 = /^(Feature:|Rule:)/.test(nextContent);
      out.push((atCol0 ? '' : '  ') + t);
    } else if (t.startsWith('#')) {
      // Comments inherit context: col 4 inside a scenario block, col 0 elsewhere
      const indent = ctx === 'scenario' ? '    ' : '';
      out.push(indent + t);
    } else {
      out.push('  ' + t);                      // col 2 (narrative / description)
    }
  }

  while (out.length > 0 && out[out.length - 1] === '') out.pop();
  return out.join('\n');
}
