import { NextResponse } from 'next/server';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { REPO_ROOT, FEATURES_DIR, safeFeaturePath } from '@/lib/repo';

/**
 * POST /api/import
 *
 * Accetta un file .txt via FormData, lo scrive in os.tmpdir() con nome
 * generato internamente (nessun input utente nel comando → T-04-06 mitigato),
 * esegue import-scenarios.ts via execSync con shell:true (Windows-safe),
 * restituisce il contenuto del .feature generato + riepilogo.
 *
 * Threat mitigations:
 * - T-04-06: tmpPath costruito con Date.now(), nessun input utente nel comando shell
 * - T-04-07: timeout 30s su execSync
 */
export async function POST(request: Request) {
  // 1. Leggi il file dal form
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Invalid form data' },
      { status: 400 }
    );
  }

  const file = formData.get('file') as File | null;
  if (!file || file.size === 0) {
    return NextResponse.json(
      { ok: false, error: 'File mancante o vuoto' },
      { status: 400 }
    );
  }

  // 2. Scrivi il contenuto in un file temporaneo con nome generato (T-04-06)
  const tmpPath = path.join(os.tmpdir(), `import-${Date.now()}.txt`);
  const buffer = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(tmpPath, buffer);

  let rawOutput = '';
  try {
    // 3. Esegui lo script con Pattern 3 (RESEARCH): shell:true per Windows (T-04-07: timeout 30s)
    // ExecSyncOptionsWithStringEncoding.shell accetta solo string; usare 'cmd.exe'
    // per Windows è equivalente a shell:true (avvia cmd che interpreta npx.cmd).
    rawOutput = execSync(
      `npx ts-node scripts/import-scenarios.ts --input "${tmpPath}"`,
      {
        cwd: REPO_ROOT,
        // shell: true equivalente — forza esecuzione tramite shell per npx.cmd su Windows
        shell: process.platform === 'win32' ? 'cmd.exe' : '/bin/sh',
        encoding: 'utf-8',
        timeout: 30000,
      }
    );

    // 4. Parsa l'output per estrarre i metadati
    const featurePathMatch = rawOutput.match(/Feature file:\s+(.+)/);
    const newCountMatch = rawOutput.match(/\((\d+) step nuovi\)/);
    const skipCountMatch = rawOutput.match(/(\d+) già nel catalog/);

    // CR-02: validate the path from script stdout via safeFeaturePath before reading
    const rawFeaturePath = featurePathMatch ? featurePathMatch[1].trim() : null;
    const relPath = rawFeaturePath
      ? path.relative(FEATURES_DIR, rawFeaturePath).replace(/\\/g, '/')
      : null;
    const featurePath = relPath ? safeFeaturePath(relPath) : null;

    if (rawFeaturePath && !featurePath) {
      // Script returned a path outside FEATURES_DIR — reject
      try { fs.unlinkSync(tmpPath); } catch { /* ignora errori unlink */ }
      return NextResponse.json(
        { ok: false, error: 'Path del feature non valido' },
        { status: 400 }
      );
    }

    const newCount = newCountMatch ? parseInt(newCountMatch[1], 10) : 0;
    const skipCount = skipCountMatch ? parseInt(skipCountMatch[1], 10) : 0;

    // 5. Leggi il contenuto del .feature generato
    let featureContent = '';
    if (featurePath && fs.existsSync(featurePath)) {
      featureContent = fs.readFileSync(featurePath, 'utf-8');
    }

    // 6. Cancella il file temporaneo
    try { fs.unlinkSync(tmpPath); } catch { /* ignora errori unlink */ }

    // CR-01: return only what the UI needs — no rawOutput, no absolute server paths
    return NextResponse.json({
      ok: true,
      featureContent,
      featurePath: featurePath
        ? path.relative(REPO_ROOT, featurePath).replace(/\\/g, '/')
        : null,
      newCount,
      skipCount,
    });
  } catch (err: unknown) {
    // 7. Cleanup + risposta errore
    try { fs.unlinkSync(tmpPath); } catch { /* ignora errori unlink */ }

    // CR-01 / WR-02: never expose rawOutput or internal error details to clients
    console.error('[api/import] Import failed:', err);
    return NextResponse.json(
      { ok: false, error: 'Import failed. Check server logs.' },
      { status: 500 }
    );
  }
}
