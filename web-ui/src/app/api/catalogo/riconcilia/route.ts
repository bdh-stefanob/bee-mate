import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import { REPO_ROOT, FEATURES_DIR } from '@/lib/repo';
import { daAltraOrigine } from '@/lib/stessa-origine';
import { dentroLaCartellaSuDisco } from '@/lib/percorsi-disco';
import { walkFeatures } from '@/lib/features';
import type { CatalogStep } from '@/lib/types';
import { riscriviScenario, riscriviDefinizione, haParametri, RiscritturaNonSupportata } from '@/lib/riscrittura-step';
import { tentaRigenerazioneCatalogo } from '@/lib/rigenerazione-catalogo';

const CARTELLA_SRC = path.join(REPO_ROOT, 'src');

function leggiCatalogo(): CatalogStep[] {
  const p = path.join(REPO_ROOT, 'step-catalog.json');
  return (JSON.parse(fs.readFileSync(p, 'utf-8')) as { steps: CatalogStep[] }).steps;
}

/**
 * Il `sourceRef` del catalogo e' un percorso col separatore di Windows,
 * relativo alla radice del repository, con `:riga` in coda
 * (`src\steps\...\x.steps.ts:102`). Si toglie la riga e si valida che resti
 * dentro `src/`, collegamenti simbolici compresi: e' la definizione dello
 * step, il file che la riscrittura modifica davvero.
 */
function percorsoDefinizione(sourceRef: string): string | null {
  const senzaRiga = sourceRef.replace(/:\d+$/, '');
  const relativoASrc = senzaRiga.replace(/\\/g, '/').replace(/^src\//, '');
  return dentroLaCartellaSuDisco(CARTELLA_SRC, relativoASrc, '.ts');
}

/**
 * POST /api/catalogo/riconcilia
 *
 * Corpo: `{ da, a }`. Riscrive quella frase OVUNQUE — negli scenari `.feature`
 * e nella definizione dello step — oppure non tocca niente. Le regole non
 * negoziabili sono nel contratto e ripetute qui perche' contano:
 *
 * - Se `a` esiste gia' come step diverso, si rifiuta: fondere due definizioni
 *   e' un'altra operazione, non questa.
 *   .
 * - Le due riscritture (scenari + definizione) si CALCOLANO entrambe prima di
 *   scrivere anche un solo file: una riscrittura a meta' lascerebbe uno
 *   scenario che cita uno step inesistente, che e' peggio del doppione che si
 *   voleva togliere.
 * - Frasi con un parametro (`{string}`, `{int}`, ...) non sono supportate:
 *   vedi `riscrittura-step.ts` per il perche'.
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
  if (/[\r\n]/.test(da) || /[\r\n]/.test(a)) {
    return NextResponse.json({ errore: 'frase_non_valida' }, { status: 400 });
  }
  if (da === a) {
    return NextResponse.json({ errore: 'le_frasi_sono_uguali' }, { status: 400 });
  }
  if (haParametri(da) || haParametri(a)) {
    return NextResponse.json({ errore: 'step_con_parametri_non_supportato' }, { status: 400 });
  }

  let steps: CatalogStep[];
  try {
    steps = leggiCatalogo();
  } catch (err) {
    console.error('catalogo non leggibile:', err);
    return NextResponse.json({ errore: 'catalogo_non_disponibile' }, { status: 500 });
  }

  const stepDa = steps.find((s) => s.expression === da);
  if (!stepDa) {
    return NextResponse.json({ errore: 'step_non_trovato' }, { status: 404 });
  }
  if (steps.some((s) => s.expression === a)) {
    // La fusione di due definizioni e' un'altra operazione: qui si rifiuta
    // con un no chiaro, come dice il contratto.
    return NextResponse.json({ errore: 'bersaglio_gia_esistente' }, { status: 409 });
  }

  const percorsoDef = percorsoDefinizione(stepDa.sourceRef);
  if (!percorsoDef || !fs.existsSync(percorsoDef)) {
    return NextResponse.json({ errore: 'definizione_non_trovata' }, { status: 500 });
  }

  let nuovaDefinizione: { testo: string; sostituzioni: number };
  try {
    nuovaDefinizione = riscriviDefinizione(fs.readFileSync(percorsoDef, 'utf-8'), da, a);
  } catch (err) {
    if (err instanceof RiscritturaNonSupportata) {
      return NextResponse.json({ errore: 'step_con_parametri_non_supportato' }, { status: 400 });
    }
    throw err;
  }
  if (nuovaDefinizione.sostituzioni !== 1) {
    // Zero: la frase non e' scritta li' come ci si aspettava. Piu' di una:
    // stessa frase dichiarata due volte nello stesso file — un'ambiguita' che
    // questa rotta non arbitra. In entrambi i casi non si scrive niente.
    return NextResponse.json({ errore: 'definizione_non_trovata' }, { status: 500 });
  }

  const daScrivere: { percorso: string; testo: string }[] = [
    { percorso: percorsoDef, testo: nuovaDefinizione.testo },
  ];

  for (const rel of walkFeatures(FEATURES_DIR)) {
    const percorsoAssoluto = path.join(FEATURES_DIR, rel);
    let contenuto: string;
    try {
      contenuto = fs.readFileSync(percorsoAssoluto, 'utf-8');
    } catch {
      continue;
    }
    const { testo, sostituzioni } = riscriviScenario(contenuto, da, a);
    if (sostituzioni > 0) {
      daScrivere.push({ percorso: percorsoAssoluto, testo });
    }
  }

  // Solo ora si scrive: tutte le riscritture sono gia' calcolate e valide.
  for (const { percorso, testo } of daScrivere) {
    fs.writeFileSync(percorso, testo, 'utf-8');
  }

  const catalogoRigenerato = tentaRigenerazioneCatalogo();

  return NextResponse.json({
    ok: true,
    fileFeatureAggiornati: daScrivere.length - 1,
    catalogoRigenerato,
  });
}
