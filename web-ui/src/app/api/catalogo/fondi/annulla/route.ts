import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import { REPO_ROOT } from '@/lib/repo';
import { daAltraOrigine } from '@/lib/stessa-origine';
import { dentroLaCartellaSuDisco } from '@/lib/percorsi-disco';
import { tentaRigenerazioneCatalogo } from '@/lib/rigenerazione-catalogo';

const FILE_ANNULLAMENTO = path.join(REPO_ROOT, 'reports', 'fusioni', 'ultima-fusione.json');

interface Istantanea {
  quando: string;
  da: string;
  a: string;
  file: { percorso: string; testoPrecedente: string }[];
}

function leggiIstantanea(): Istantanea | null {
  if (!fs.existsSync(FILE_ANNULLAMENTO)) return null;
  try {
    return JSON.parse(fs.readFileSync(FILE_ANNULLAMENTO, 'utf-8')) as Istantanea;
  } catch {
    return null;
  }
}

/**
 * POST /api/catalogo/fondi/annulla
 *
 * Riporta i file toccati dall'ULTIMA fusione al contenuto che avevano prima —
 * un solo livello di annullamento (vedi il commento in `../route.ts` per il
 * perche' basta). Consuma l'istantanea: annullare due volte di fila la stessa
 * fusione non fa niente la seconda volta (`errore: 'niente_da_annullare'`),
 * cosi' non si rischia di tornare a uno stato ancora precedente per sbaglio.
 *
 * Ogni percorso dell'istantanea si rivalida contro `src/`: un'istantanea non
 * si fida di se stessa piu' di quanto farebbe una richiesta qualunque.
 */
export async function POST(request: Request) {
  if (daAltraOrigine(request)) {
    return NextResponse.json({ errore: 'richiesta_non_ammessa' }, { status: 403 });
  }

  const istantanea = leggiIstantanea();
  if (!istantanea) {
    return NextResponse.json({ errore: 'niente_da_annullare' }, { status: 404 });
  }

  const cartellaSrc = path.join(REPO_ROOT, 'src');
  for (const { percorso } of istantanea.file) {
    const relativoASrc = path.relative(cartellaSrc, percorso).replace(/\\/g, '/');
    const valido = dentroLaCartellaSuDisco(cartellaSrc, relativoASrc, path.extname(percorso));
    if (!valido) {
      return NextResponse.json({ errore: 'istantanea_non_valida' }, { status: 500 });
    }
  }

  try {
    for (const { percorso, testoPrecedente } of istantanea.file) {
      fs.writeFileSync(percorso, testoPrecedente, 'utf-8');
    }
  } catch (err) {
    console.error('annullamento fusione non riuscito a meta\':', err);
    return NextResponse.json({ errore: 'annullamento_fallito' }, { status: 500 });
  }

  // Consumata: un annullamento vale una volta sola.
  try {
    fs.unlinkSync(FILE_ANNULLAMENTO);
  } catch {
    // Non impedisce di dire che l'annullamento e' riuscito: i file sono gia'
    // tornati com'erano, che e' cio' che conta per il tester.
  }

  const catalogoRigenerato = tentaRigenerazioneCatalogo();

  return NextResponse.json({
    ok: true,
    da: istantanea.da,
    a: istantanea.a,
    fileRipristinati: istantanea.file.length,
    catalogoRigenerato,
  });
}

/**
 * GET /api/catalogo/fondi/annulla
 *
 * C'e' un'ultima fusione ancora annullabile? Serve alla finestra per mostrare
 * (o nascondere) il pulsante "Annulla l'ultima fusione" senza tentare un
 * annullamento a vuoto solo per saperlo.
 */
export async function GET() {
  const istantanea = leggiIstantanea();
  if (!istantanea) {
    return NextResponse.json({ disponibile: false });
  }
  return NextResponse.json({
    disponibile: true,
    quando: istantanea.quando,
    da: istantanea.da,
    a: istantanea.a,
  });
}
