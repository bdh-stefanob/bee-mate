import * as fs from 'fs';
import * as path from 'path';
import { NextResponse } from 'next/server';
import { FEATURES_DIR, safeFeaturePath } from '@/lib/repo';
import { listFeatures } from '@/lib/features';

/**
 * GET /api/features
 * Ritorna l'elenco FeatureSummary[] di tutti i .feature in src/features/.
 */
export async function GET() {
  try {
    const summaries = listFeatures(FEATURES_DIR);
    return NextResponse.json(summaries);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/features
 * Body: { content: string, filePath: string }  (filePath relativo a src/features/)
 * Scrive il file .feature su filesystem locale.
 */
export async function POST(request: Request) {
  try {
    const { content, filePath } = await request.json() as { content?: string; filePath?: string };
    if (!content || !filePath) {
      return NextResponse.json({ error: 'content and filePath are required' }, { status: 400 });
    }

    const resolved = safeFeaturePath(filePath);
    if (!resolved) {
      return NextResponse.json({ error: 'Invalid file path' }, { status: 403 });
    }

    fs.mkdirSync(path.dirname(resolved), { recursive: true });
    fs.writeFileSync(resolved, content, 'utf-8');

    const rel = path.relative(path.resolve(FEATURES_DIR, '..', '..'), resolved).replace(/\\/g, '/');
    return NextResponse.json({ ok: true, path: rel });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
