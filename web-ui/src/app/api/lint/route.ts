import { NextRequest, NextResponse } from 'next/server';
import { Parser, AstBuilder, GherkinClassicTokenMatcher } from '@cucumber/gherkin';
import { IdGenerator } from '@cucumber/messages';

// The official @cucumber/gherkin parser uses node:module internally and cannot be
// bundled for the browser — it must run in the Node.js runtime.
export const runtime = 'nodejs';

/** A located parser error returned to the client. */
interface LintError {
  line: number;
  column: number;
  message: string;
}

/** Shape of a single @cucumber/gherkin parser error. */
interface GherkinErrorLike {
  message: string;
  location?: { line: number; column?: number };
}

/**
 * POST /api/lint
 *
 * Body: { content: string } — Gherkin source to validate.
 * Returns: { errors: LintError[] } — real compilation errors from the official
 * @cucumber/gherkin parser (empty array when the document is valid).
 *
 * Robustness: any unexpected failure returns { errors: [] } (never a 500), so the
 * client-side linter never spams errors and the editor keeps working.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { content?: unknown };
    const content = typeof body.content === 'string' ? body.content : '';

    const parser = new Parser(new AstBuilder(IdGenerator.uuid()), new GherkinClassicTokenMatcher());

    try {
      parser.parse(content);
      // Valid document — no compilation errors
      return NextResponse.json({ errors: [] });
    } catch (parseErr) {
      // CompositeParserException → .errors[]; single ParserException → itself
      const raw = parseErr as { errors?: GherkinErrorLike[] } & GherkinErrorLike;
      const list: GherkinErrorLike[] = Array.isArray(raw.errors) ? raw.errors : [raw];
      const errors: LintError[] = list.map((e) => ({
        line: e.location?.line ?? 1,
        column: e.location?.column ?? 1,
        message: e.message,
      }));
      return NextResponse.json({ errors });
    }
  } catch {
    // Malformed request / unexpected failure — degrade gracefully, never 500
    return NextResponse.json({ errors: [] });
  }
}
