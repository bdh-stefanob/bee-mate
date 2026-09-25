import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { GET } from '@/app/api/catalogo/stato/route';
import { REPO_ROOT } from '@/lib/repo';

/**
 * Lo stato scritto da `scripts/rigenera-catalogo.ts`. Non lo lanciamo qui
 * (e' un dry-run di Cucumber su tutta la suite, troppo lento per un test): si
 * scrive il file a mano, esattamente come lo scriverebbe lui, e si controlla
 * che la rotta lo legga e lo traduca negli stessi tre esiti che la schermata
 * Catalogo mostra (F19).
 */

const FILE = path.join(REPO_ROOT, 'reports', 'cruscotto', 'catalogo-stato.json');
let originale: string | null = null;

beforeEach(() => {
  originale = fs.existsSync(FILE) ? fs.readFileSync(FILE, 'utf-8') : null;
});

afterEach(() => {
  if (originale !== null) {
    fs.mkdirSync(path.dirname(FILE), { recursive: true });
    fs.writeFileSync(FILE, originale);
  } else if (fs.existsSync(FILE)) {
    fs.unlinkSync(FILE);
  }
});

function scrivi(stato: object): void {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(stato, null, 2));
}

describe('GET /api/catalogo/stato', () => {
  it('nessun file: dice che non e\' mai stato eseguito, non un errore', async () => {
    if (fs.existsSync(FILE)) fs.unlinkSync(FILE);
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ stato: 'mai-eseguito' });
  });

  it('rigenerazione riuscita: passano data, durata e numero di step', async () => {
    scrivi({
      stato: 'ok',
      avviatoIl: '2026-09-25T10:00:00.000Z',
      concluseIl: '2026-09-25T10:00:37.000Z',
      durataMs: 37000,
      totaleStep: 10,
    });
    const res = await GET();
    const corpo = await res.json();
    expect(corpo.stato).toBe('ok');
    expect(corpo.totaleStep).toBe(10);
    expect(corpo.durataMs).toBe(37000);
  });

  it('rigenerazione fallita: il motivo arriva, il catalogo vecchio non si spaccia per nuovo', async () => {
    scrivi({
      stato: 'fallita',
      avviatoIl: '2026-09-25T10:00:00.000Z',
      concluseIl: '2026-09-25T10:00:05.000Z',
      durataMs: 5000,
      messaggio: "Dry-run di Cucumber non riuscito (uscita 1)",
    });
    const res = await GET();
    const corpo = await res.json();
    expect(corpo.stato).toBe('fallita');
    expect(corpo.messaggio).toContain('Dry-run');
  });

  it('un "in corso" recente resta "in corso"', async () => {
    scrivi({ stato: 'in-corso', avviatoIl: new Date().toISOString() });
    const res = await GET();
    expect((await res.json()).stato).toBe('in-corso');
  });

  it('un "in corso" bloccato da piu\' di cinque minuti si dichiara fallito, non resta a girare per sempre', async () => {
    const seiMinutiFa = new Date(Date.now() - 6 * 60 * 1000).toISOString();
    scrivi({ stato: 'in-corso', avviatoIl: seiMinutiFa });
    const res = await GET();
    const corpo = await res.json();
    expect(corpo.stato).toBe('fallita');
    expect(corpo.messaggio).toBeDefined();
  });
});
