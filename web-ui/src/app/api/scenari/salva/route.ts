import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import { FEATURES_DIR, REPO_ROOT } from '@/lib/repo';
import { ErroreSalvataggio, salvaScenario } from '@/lib/salva-scenario';
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
 * `src/features/<app>/<flusso>/<nome>.feature` e dice dove l'ha messo.
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
  try {
    const manifesto = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, MANIFESTO), 'utf-8')) as {
      files?: Array<{ path?: string }>;
    };
    const feature = (manifesto.files ?? [])
      .map((f) => (f.path ?? '').replace(/\\/g, '/'))
      .find((p) => p.startsWith('src/features/generated/') && p.endsWith('.feature'));
    origine = feature?.slice('src/features/'.length);
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
    return NextResponse.json(salvaScenario(FEATURES_DIR, origine, { app, flusso, titolo }));
  } catch (err) {
    // I messaggi di salvaScenario sono scritti per una persona e non
    // contengono percorsi assoluti.
    const codice = err instanceof ErroreSalvataggio ? err.codice : undefined;
    return NextResponse.json({ errore: (err as Error).message, codice }, { status: 400 });
  }
}
