import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import { REPO_ROOT } from '@/lib/repo';

const RECORDINGS_DIR = path.resolve(REPO_ROOT, 'reports', 'recordings');

/**
 * GET /api/traccia/ultima
 *
 * Il nome file dell'ultima registrazione scritta su disco. `scripts/record.ts`
 * decide quel nome (con un timestamp) solo al momento di scrivere, quindi la
 * finestra non puo' saperlo in anticipo — e non lo legge dall'output a
 * schermo (mai dalla prosa di uno strumento) ma dal file piu' recente nella
 * cartella degli artefatti, con lo stesso criterio di `scripts/generate.ts`.
 */
export async function GET() {
  try {
    const file = fs
      .readdirSync(RECORDINGS_DIR)
      .filter((f) => f.endsWith('.json'))
      .map((f) => ({ nome: f, mtime: fs.statSync(path.join(RECORDINGS_DIR, f)).mtimeMs }))
      .sort((a, b) => b.mtime - a.mtime)[0];
    return NextResponse.json({ percorso: file?.nome ?? null });
  } catch {
    return NextResponse.json({ percorso: null });
  }
}
