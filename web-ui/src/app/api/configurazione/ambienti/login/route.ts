import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import { REPO_ROOT } from '@/lib/repo';
import { scriviLoginBersaglio } from '@/lib/configurazione';
import { derivaLogin, type RegistrazioneGrezza } from '@/lib/derivazione-login';
import { daAltraOrigine } from '@/lib/stessa-origine';
import { BERSAGLIO_VALIDO } from '@/lib/esecuzione';

const TARGETS_PATH = path.join(REPO_ROOT, 'bdd-targets.json');
const RECORDINGS_DIR = path.join(REPO_ROOT, 'reports', 'recordings');

/** Il file di registrazione piu' recente: stesso criterio di /api/traccia/ultima. */
function ultimaRegistrazione(): string | null {
  try {
    const file = fs
      .readdirSync(RECORDINGS_DIR)
      .filter((f) => f.endsWith('.json'))
      .map((f) => ({ nome: f, mtime: fs.statSync(path.join(RECORDINGS_DIR, f)).mtimeMs }))
      .sort((a, b) => b.mtime - a.mtime)[0];
    return file ? path.join(RECORDINGS_DIR, file.nome) : null;
  } catch {
    return null;
  }
}

/**
 * POST /api/configurazione/ambienti/login
 *
 * Il cuore di «Registra l'accesso»: legge la registrazione appena prodotta
 * (il giro "apri il browser, entra, chiudi" e' gia' il comando 'registrazione'
 * che questa rotta non rifa' — lo riusa) e ne ricava il blocco `login` per
 * l'ambiente indicato, scrivendolo in bdd-targets.json.
 *
 * Nessun valore digitato viaggia mai su questa rotta: la derivazione (vedi
 * `lib/derivazione-login.ts`) legge solo etichette dell'interfaccia e il
 * contrassegno di campo-password, mai un valore. La risposta porta i NOMI
 * delle variabili appena dichiarate, mai un loro valore.
 */
export async function POST(request: Request) {
  if (daAltraOrigine(request)) {
    return NextResponse.json({ errore: 'richiesta non ammessa' }, { status: 403 });
  }

  try {
    const body = (await request.json()) as { nome?: unknown };
    const { nome } = body;

    if (typeof nome !== 'string' || !BERSAGLIO_VALIDO.test(nome)) {
      return NextResponse.json({ errore: 'nome di ambiente non valido' }, { status: 400 });
    }

    const percorsoRegistrazione = ultimaRegistrazione();
    if (!percorsoRegistrazione) {
      return NextResponse.json(
        { errore: 'nessuna registrazione trovata: registra prima l\'accesso' },
        { status: 404 }
      );
    }

    let registrazione: RegistrazioneGrezza;
    try {
      registrazione = JSON.parse(fs.readFileSync(percorsoRegistrazione, 'utf-8')) as RegistrazioneGrezza;
    } catch {
      return NextResponse.json({ errore: 'la registrazione non e\' leggibile' }, { status: 500 });
    }

    const derivazione = derivaLogin(registrazione, nome);
    if (!derivazione) {
      return NextResponse.json(
        {
          errore:
            'la registrazione non contiene nessun campo compilato: rifai l\'accesso registrando davvero username e password',
        },
        { status: 400 }
      );
    }

    const contenutoAttuale = fs.existsSync(TARGETS_PATH) ? fs.readFileSync(TARGETS_PATH, 'utf-8') : '';

    let nuovoContenuto: string;
    try {
      nuovoContenuto = scriviLoginBersaglio(contenutoAttuale, nome, derivazione.login, derivazione.readyWhen);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'errore di validazione';
      return NextResponse.json({ errore: message }, { status: 400 });
    }

    fs.writeFileSync(TARGETS_PATH, nuovoContenuto, 'utf-8');
    return NextResponse.json({ scritto: true, variabili: derivazione.variabili });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ errore: message }, { status: 500 });
  }
}
