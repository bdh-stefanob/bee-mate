import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import { REPO_ROOT } from '@/lib/repo';

/**
 * GET /api/catalogo/stato
 *
 * L'esito dell'ultima rigenerazione automatica del catalogo (vedi
 * `scripts/rigenera-catalogo.ts`), cosi' la schermata Catalogo puo' dire se
 * quello che sta mostrando e' fresco, in aggiornamento, o se l'ultimo
 * tentativo e' fallito — invece di mostrare un numero vecchio senza dirlo
 * (F19).
 *
 * Di sola lettura: legge un file che lo script scrive da solo, non avvia
 * niente. Chi vuole avviare una rigenerazione usa `POST /api/esegui` con
 * `{ nome: "catalogo" }`, come ogni altro comando dell'elenco chiuso.
 */

interface StatoCatalogo {
  stato: 'in-corso' | 'ok' | 'fallita';
  avviatoIl: string;
  concluseIl?: string;
  durataMs?: number;
  totaleStep?: number;
  messaggio?: string;
}

/**
 * Un "in corso" che non da' piu' notizie da tanto non e' in corso: il
 * processo e' morto senza scrivere il suo esito (il server e' stato
 * riavviato mentre girava). Uno spinner che gira per sempre mentirebbe
 * quanto un numero vecchio spacciato per fresco — stesso principio, stesso
 * rimedio: dirlo.
 */
const SOGLIA_BLOCCATO_MS = 5 * 60 * 1000;

export async function GET() {
  const file = path.join(REPO_ROOT, 'reports', 'cruscotto', 'catalogo-stato.json');
  if (!fs.existsSync(file)) {
    return NextResponse.json({ stato: 'mai-eseguito' });
  }
  try {
    const dati = JSON.parse(fs.readFileSync(file, 'utf-8')) as StatoCatalogo;
    if (dati.stato === 'in-corso' && Date.now() - new Date(dati.avviatoIl).getTime() > SOGLIA_BLOCCATO_MS) {
      return NextResponse.json({
        stato: 'fallita',
        avviatoIl: dati.avviatoIl,
        messaggio: "interrotto: non ha piu' dato notizie",
      } satisfies StatoCatalogo);
    }
    return NextResponse.json(dati);
  } catch (err) {
    console.error('stato del catalogo non leggibile:', err);
    return NextResponse.json({ stato: 'mai-eseguito' });
  }
}
