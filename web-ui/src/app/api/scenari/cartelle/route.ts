import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import { FEATURES_DIR, REPO_ROOT } from '@/lib/repo';
import { walkFeatures } from '@/lib/features';
import { cartelleDalCatalogo } from '@/lib/salva-scenario';

/**
 * GET /api/scenari/cartelle
 *
 * Le applicazioni e i flussi da proporre quando il tester da' una casa a uno
 * scenario registrato: quelli dichiarati nel catalogo (campi `app` e `area`,
 * un solo vocabolario) piu' le cartelle che esistono gia' sotto
 * `src/features/`. Un catalogo illeggibile non e' un errore: restano le cartelle.
 */
export async function GET() {
  const voci: Array<{ app?: string; area?: string }> = [];
  try {
    const catalogo = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'step-catalog.json'), 'utf-8')) as {
      steps?: Array<{ app?: string; area?: string }>;
    };
    voci.push(...(catalogo.steps ?? []));
  } catch {
    // niente catalogo: si propongono solo le cartelle esistenti
  }
  for (const rel of walkFeatures(FEATURES_DIR)) {
    const parti = rel.split('/');
    if (parti.length >= 3) voci.push({ app: parti[0], area: parti[1] });
  }
  return NextResponse.json({ cartelle: cartelleDalCatalogo(voci) });
}
