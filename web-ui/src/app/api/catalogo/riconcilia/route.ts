import { NextResponse } from 'next/server';
import * as fs from 'fs';
import { REPO_ROOT, FEATURES_DIR } from '@/lib/repo';
import { daAltraOrigine } from '@/lib/stessa-origine';
import { pianificaRinomina } from '@/lib/rinomina-passo';
import { tentaRigenerazioneCatalogo } from '@/lib/rigenerazione-catalogo';

/**
 * POST /api/catalogo/riconcilia
 *
 * Corpo: `{ da, a }`. Riscrive quella frase OVUNQUE — negli scenari `.feature`
 * e nella definizione dello step — oppure non tocca niente. Il piano (cosa
 * scrivere, e quando rifiutare) e' in `lib/rinomina-passo.ts`, condiviso con la
 * modifica degli scenari; qui restano la guardia, la lettura del corpo, la
 * scrittura — solo dopo che il piano e' calcolato per intero — e la
 * rigenerazione del catalogo.
 */
export async function POST(request: Request) {
  if (daAltraOrigine(request)) {
    return NextResponse.json({ errore: 'richiesta_non_ammessa' }, { status: 403 });
  }

  let corpo: { da?: unknown; a?: unknown };
  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ errore: 'richiesta_non_leggibile' }, { status: 400 });
  }
  if (typeof corpo !== 'object' || corpo === null) {
    return NextResponse.json({ errore: 'richiesta_non_leggibile' }, { status: 400 });
  }

  const { da, a } = corpo;
  if (typeof da !== 'string' || typeof a !== 'string' || da.trim() === '' || a.trim() === '') {
    return NextResponse.json({ errore: 'servono_due_frasi' }, { status: 400 });
  }

  const piano = pianificaRinomina({ repoRoot: REPO_ROOT, featuresDir: FEATURES_DIR }, da, a);
  if (!piano.ok) {
    return NextResponse.json({ errore: piano.errore }, { status: piano.stato });
  }

  // Solo ora si scrive: tutte le riscritture sono gia' calcolate e valide.
  for (const { percorso, testo } of piano.scritture) {
    fs.writeFileSync(percorso, testo, 'utf-8');
  }

  const catalogoRigenerato = tentaRigenerazioneCatalogo();

  return NextResponse.json({
    ok: true,
    fileFeatureAggiornati: piano.fileFeatureAggiornati,
    catalogoRigenerato,
  });
}
