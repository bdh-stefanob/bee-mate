import { describe, it, expect, beforeEach } from 'vitest';
import { GET, POST } from '@/app/api/esegui/route';
import { avvia, azzeraPerTest } from '@/lib/registro';
import type { ProcessoMinimo } from '@/lib/registro';

beforeEach(() => azzeraPerTest());

function processoFinto(): ProcessoMinimo {
  return { onRiga() {}, onFine() {}, termina() {} };
}

function richiesta(corpo: unknown): Request {
  return new Request('http://localhost/api/esegui', {
    method: 'POST',
    headers: { origin: 'http://127.0.0.1:3000' },
    body: JSON.stringify(corpo),
  });
}

describe('GET /api/esegui con due corsie', () => {
  it('elenca tutte le corsie in corso in `operazioni`, senza righe', async () => {
    const a = avvia('test', { bersaglio: 'demo' }, () => processoFinto());
    const b = avvia('test', { bersaglio: 'demo' }, () => processoFinto());
    const corpo = (await (await GET()).json()) as { operazioni: Array<{ id: string; nome: string }> };
    expect(corpo.operazioni.map((o) => o.id)).toEqual([a.id, b.id]);
    for (const o of corpo.operazioni) expect(o).not.toHaveProperty('righe');
  });

  it('mantiene `operazione` (la prima) per chi lo legge ancora', async () => {
    const a = avvia('test', { bersaglio: 'demo' }, () => processoFinto());
    avvia('test', { bersaglio: 'demo' }, () => processoFinto());
    const corpo = (await (await GET()).json()) as { operazione: { id: string } | null };
    expect(corpo.operazione?.id).toBe(a.id);
  });
});

describe('POST /api/esegui: il tetto si dice con un codice', () => {
  it('il terzo test risponde 400 con il codice "tetto" e il numero, e non parte', async () => {
    avvia('test', { bersaglio: 'demo' }, () => processoFinto());
    avvia('test', { bersaglio: 'demo' }, () => processoFinto());
    const res = await POST(richiesta({ nome: 'test', parametri: { bersaglio: 'demo' } }));
    expect(res.status).toBe(400);
    const corpo = (await res.json()) as { errore: string; codice: string; n: number };
    expect(corpo.codice).toBe('tetto');
    expect(corpo.n).toBe(2);
    expect(corpo.errore).toMatch(/2/);
  });

  it('una registrazione mentre c\'e\' un test risponde con il codice "occupato"', async () => {
    avvia('test', { bersaglio: 'demo' }, () => processoFinto());
    const res = await POST(richiesta({ nome: 'registrazione', parametri: { bersaglio: 'demo' } }));
    expect(res.status).toBe(400);
    expect(((await res.json()) as { codice: string }).codice).toBe('occupato');
  });
});
