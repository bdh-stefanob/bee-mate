import * as fs from 'fs';
import * as path from 'path';
import { FEATURES_DIR, REPO_ROOT } from '@/lib/repo';
import { dentroLaCartellaSuDisco } from '@/lib/percorsi-disco';
import type { CatalogStep } from '@/lib/types';
import { fileDiDefinizioneUsati, importPagineUsate, costruisciEsportazione, type FileEsportato } from '@/lib/esportazione';

const CARTELLA_SRC = path.join(REPO_ROOT, 'src');

function leggiCatalogo(): CatalogStep[] {
  const p = path.join(REPO_ROOT, 'step-catalog.json');
  return (JSON.parse(fs.readFileSync(p, 'utf-8')) as { steps: CatalogStep[] }).steps;
}

/** Vedi la stessa risoluzione in `api/catalogo/riconcilia`: `sourceRef` -> percorso dentro `src/`. */
function percorsoSorgente(sourceRef: string): string | null {
  const senzaRiga = sourceRef.replace(/:\d+$/, '');
  const relativoASrc = senzaRiga.replace(/\\/g, '/').replace(/^src\//, '');
  return dentroLaCartellaSuDisco(CARTELLA_SRC, relativoASrc, '.ts');
}

/**
 * GET /api/scenari/esporta?file=<percorso relativo a src/features/>
 *
 * Un pacchetto scaricabile con lo scenario, la definizione dei suoi step e le
 * Page Object che usa (formato e motivazione in `esportazione.ts`). Il
 * percorso arriva dalla finestra: stessa guardia di `api/download`
 * (path traversal + collegamenti simbolici + estensione), e la rotta non
 * legge mai fuori da `src/`.
 */
export async function GET(request: Request): Promise<Response> {
  const file = new URL(request.url).searchParams.get('file') ?? '';

  const percorsoFeature = dentroLaCartellaSuDisco(FEATURES_DIR, file, '.feature');
  if (!percorsoFeature) {
    return new Response('Forbidden', { status: 403 });
  }
  if (!fs.existsSync(percorsoFeature)) {
    return new Response('Not Found', { status: 404 });
  }

  const contenutoFeature = fs.readFileSync(percorsoFeature, 'utf-8');

  let steps: CatalogStep[];
  try {
    steps = leggiCatalogo();
  } catch {
    // Un catalogo assente o rotto non deve impedire di scaricare almeno lo
    // scenario: si esporta la sola Feature, senza step ne' pagine.
    steps = [];
  }

  const raccolti: FileEsportato[] = [
    { percorso: `src/features/${file.replace(/\\/g, '/')}`, contenuto: contenutoFeature },
  ];

  const pagineViste = new Set<string>();

  for (const sourceRef of fileDiDefinizioneUsati(contenutoFeature, steps)) {
    const percorsoAssoluto = percorsoSorgente(sourceRef);
    if (!percorsoAssoluto || !fs.existsSync(percorsoAssoluto)) continue;

    const contenutoSteps = fs.readFileSync(percorsoAssoluto, 'utf-8');
    raccolti.push({
      percorso: path.relative(REPO_ROOT, percorsoAssoluto).replace(/\\/g, '/'),
      contenuto: contenutoSteps,
    });

    for (const importRelativo of importPagineUsate(contenutoSteps)) {
      const percorsoPagina = path.resolve(path.dirname(percorsoAssoluto), `${importRelativo}.ts`);
      const relativoASrc = path.relative(CARTELLA_SRC, percorsoPagina).replace(/\\/g, '/');
      const percorsoSicuro = dentroLaCartellaSuDisco(CARTELLA_SRC, relativoASrc, '.ts');
      if (!percorsoSicuro || !fs.existsSync(percorsoSicuro) || pagineViste.has(percorsoSicuro)) continue;

      pagineViste.add(percorsoSicuro);
      raccolti.push({
        percorso: path.relative(REPO_ROOT, percorsoSicuro).replace(/\\/g, '/'),
        contenuto: fs.readFileSync(percorsoSicuro, 'utf-8'),
      });
    }
  }

  const pacchetto = costruisciEsportazione(raccolti);
  const nomeFile = `${path.basename(percorsoFeature, '.feature')}.export.txt`;

  return new Response(pacchetto, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': `attachment; filename="${nomeFile}"`,
    },
  });
}
