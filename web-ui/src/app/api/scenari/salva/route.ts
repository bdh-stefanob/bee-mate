import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import { FEATURES_DIR, REPO_ROOT } from '@/lib/repo';
import { ErroreSalvataggio, pianificaScenario, scriviScenario } from '@/lib/salva-scenario';
import { pianificaGlue, scriviGlue } from '@/lib/salva-glue';
import { daAltraOrigine } from '@/lib/stessa-origine';

/**
 * Lo stesso manifesto che la schermata Registra fa scrivere alla generazione.
 * Il file da spostare si legge da qui, sul server: dalla finestra arrivano
 * solo applicazione, flusso e titolo, mai un percorso.
 */
const MANIFESTO = path.join('reports', 'cruscotto', 'generazione-manifesto.json');

/**
 * POST /api/scenari/salva
 *
 * Corpo: `{ app, flusso, titolo }`. Sposta lo scenario appena generato in
 * `src/features/<app>/<flusso>/<nome>.feature`, e con lui i suoi step
 * (`src/steps/<app>/<flusso>/`) e le sue Page Object (`src/pages/<app>/`):
 * tutto versionato, cosi' lo scenario gira anche su un'altra macchina.
 *
 * Prima si pianifica tutto, poi si scrive: un conflitto scoperto a meta'
 * lascerebbe uno scenario spostato senza i suoi step.
 */
export async function POST(request: Request) {
  if (daAltraOrigine(request)) {
    return NextResponse.json({ errore: 'richiesta non ammessa' }, { status: 403 });
  }

  let corpo: { app?: unknown; flusso?: unknown; titolo?: unknown };
  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ errore: 'richiesta non leggibile' }, { status: 400 });
  }
  if (typeof corpo !== 'object' || corpo === null) {
    return NextResponse.json({ errore: 'richiesta non leggibile' }, { status: 400 });
  }
  const { app, flusso, titolo } = corpo;
  if (typeof app !== 'string' || typeof flusso !== 'string' || typeof titolo !== 'string') {
    return NextResponse.json({ errore: 'servono applicazione, flusso e titolo' }, { status: 400 });
  }

  let origine: string | undefined;
  let steps: string | undefined;
  try {
    const manifesto = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, MANIFESTO), 'utf-8')) as {
      files?: Array<{ path?: string }>;
    };
    const percorsi = (manifesto.files ?? []).map((f) => (f.path ?? '').replace(/\\/g, '/'));
    origine = percorsi
      .find((p) => p.startsWith('src/features/generated/') && p.endsWith('.feature'))
      ?.slice('src/features/'.length);
    steps = percorsi
      .find((p) => p.startsWith('src/steps/generated/') && p.endsWith('.steps.ts'))
      ?.slice('src/'.length);
  } catch {
    origine = undefined;
  }
  if (!origine) {
    return NextResponse.json(
      { errore: 'non trovo lo scenario appena generato', codice: 'non-trovato' },
      { status: 404 }
    );
  }

  try {
    const scenario = pianificaScenario(FEATURES_DIR, origine, { app, flusso, titolo });
    const nome = path.basename(scenario.file, '.feature');
    const glue = steps ? pianificaGlue(path.join(REPO_ROOT, 'src'), steps, app, flusso, nome) : null;

    scriviScenario(scenario);
    if (glue) scriviGlue(glue);

    return NextResponse.json({
      file: scenario.file,
      sovrascritto: scenario.sovrascritto,
      rinominato: scenario.rinominato,
      steps: glue?.steps ?? null,
      pagine: glue?.pagine ?? [],
    });
  } catch (err) {
    // I messaggi sono scritti per una persona e non contengono percorsi
    // assoluti; i dettagli sono frasi di step e nomi di metodi.
    const e = err instanceof ErroreSalvataggio ? err : null;
    return NextResponse.json(
      { errore: (err as Error).message, codice: e?.codice, dettagli: e?.dettagli ?? [] },
      { status: 400 }
    );
  }
}
