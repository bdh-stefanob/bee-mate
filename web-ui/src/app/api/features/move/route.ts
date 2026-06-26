import * as fs from 'fs';
import * as path from 'path';
import { NextResponse } from 'next/server';
import { FEATURES_DIR, safeFeaturePath, slugify } from '@/lib/repo';
import { setFeatureTags } from '@/lib/feature-tags';

/**
 * POST /api/features/move
 * Body: { fromPath: string, app: string, flow: string }
 *   - fromPath: relativo a src/features (es. "brochure-clinic/login/login.feature")
 *   - app/flow: nome app e flow di destinazione (verranno slugificati)
 *
 * Operazioni:
 *   1. Valida fromPath con safeFeaturePath → src
 *   2. Slugifica app/flow, calcola toRel, valida con safeFeaturePath → dest
 *   3. Anti-overwrite: se dest esiste ed è diverso da src → 409
 *   4. Leggi contenuto, riscrive i tag @app @flow (setFeatureTags)
 *   5. Crea directory destinazione, scrive file, rimuove sorgente se diversa
 *   6. Pulisce cartelle vuote risalendo da dirname(src) verso FEATURES_DIR
 *   7. Ritorna { ok: true, path: toRelPOSIX }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json() as { fromPath?: string; app?: string; flow?: string };
    const { fromPath, app, flow } = body;

    // Validazione input
    if (!fromPath || typeof fromPath !== 'string') {
      return NextResponse.json({ error: 'fromPath è obbligatorio' }, { status: 400 });
    }
    if (!app || typeof app !== 'string' || app.trim() === '') {
      return NextResponse.json({ error: 'app è obbligatorio' }, { status: 400 });
    }
    if (!flow || typeof flow !== 'string' || flow.trim() === '') {
      return NextResponse.json({ error: 'flow è obbligatorio' }, { status: 400 });
    }

    // Valida il path sorgente
    const src = safeFeaturePath(fromPath);
    if (!src) {
      return NextResponse.json({ error: 'Path sorgente non valido' }, { status: 403 });
    }
    if (!fs.existsSync(src)) {
      return NextResponse.json({ error: 'File sorgente non trovato' }, { status: 404 });
    }

    // Calcola destinazione
    const appSlug = slugify(app);
    const flowSlug = slugify(flow);
    if (!appSlug || !flowSlug) {
      return NextResponse.json({ error: 'app e flow devono produrre uno slug valido' }, { status: 400 });
    }

    const basename = path.basename(fromPath);
    const toRel = `${appSlug}/${flowSlug}/${basename}`;
    const dest = safeFeaturePath(toRel);
    if (!dest) {
      return NextResponse.json({ error: 'Path destinazione non valido' }, { status: 403 });
    }

    // Anti-overwrite: se dest esiste ed è diverso da src → 409
    if (fs.existsSync(dest) && dest.toLowerCase() !== src.toLowerCase()) {
      return NextResponse.json(
        { error: 'Esiste già un file in destinazione' },
        { status: 409 },
      );
    }

    // Leggi, riscrive i tag, scrivi destinazione
    const content = fs.readFileSync(src, 'utf-8');
    const updated = setFeatureTags(content, appSlug, flowSlug);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, updated, 'utf-8');

    // Rimuovi sorgente se diversa dalla destinazione
    if (dest.toLowerCase() !== src.toLowerCase()) {
      fs.unlinkSync(src);

      // Pulizia cartelle vuote: risali da dirname(src) verso FEATURES_DIR
      // senza mai uscire da FEATURES_DIR
      const featuresPrefix = (FEATURES_DIR + path.sep).toLowerCase();
      let dir = path.dirname(src);
      while (true) {
        const dirNorm = (dir + path.sep).toLowerCase();
        // Non risalire oltre FEATURES_DIR
        if (!dirNorm.startsWith(featuresPrefix)) break;
        // Non rimuovere FEATURES_DIR stesso
        if (dir.toLowerCase() === FEATURES_DIR.toLowerCase()) break;
        try {
          const entries = fs.readdirSync(dir);
          if (entries.length === 0) {
            fs.rmdirSync(dir);
            dir = path.dirname(dir);
          } else {
            break; // cartella non vuota — stop
          }
        } catch {
          break; // errore (race condition o permessi) — stop silenzioso
        }
      }
    }

    // Calcola path relativo POSIX (come fa /api/features)
    const toRelPOSIX = path
      .relative(path.resolve(FEATURES_DIR, '..', '..'), dest)
      .replace(/\\/g, '/');

    return NextResponse.json({ ok: true, path: toRelPOSIX });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
