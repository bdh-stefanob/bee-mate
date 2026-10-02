import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * "Riprova" della pagina Catalogo quando una lettura e' caduta.
 *
 * Prima rilanciava SEMPRE la ricostruzione del catalogo (decine di secondi) e
 * restava spento finche' lo stato diceva "in corso": con la rete caduta il
 * tester restava davanti a un pulsante spento e a una frase falsa. Ora prima
 * rilegge, e ricostruisce solo se il catalogo e' davvero illeggibile.
 */

type Rotta = (corpo: string | null) => Response | Promise<Response>;

function json(corpo: unknown, status = 200): Response {
  return { ok: status >= 200 && status < 300, status, json: async () => corpo } as unknown as Response;
}

const CATALOGO = { step: [], componenti: [] };
const COPPIE = { coppie: [] };

async function carica(rotte: Record<string, Rotta>) {
  vi.resetModules();
  const chiamate: string[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (rotta: string, init?: RequestInit) => {
      const chiave = `${init?.method ?? 'GET'} ${rotta}`;
      chiamate.push(chiave);
      const gestore = rotte[chiave];
      if (!gestore) throw new TypeError(`rotta non prevista: ${chiave}`);
      return gestore(init?.body ? String(init.body) : null);
    })
  );
  const modulo = await import('@/lib/risorse-catalogo');
  return { ...modulo, chiamate };
}

beforeEach(() => {
  vi.useRealTimers();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe('riprovaCatalogo', () => {
  it('rete caduta: lo dice, e non lancia nessuna ricostruzione', async () => {
    const { riprovaCatalogo, chiamate } = await carica({});
    expect(await riprovaCatalogo()).toBe('rete');
    expect(chiamate.some((c) => c.startsWith('POST'))).toBe(false);
  });

  it('la lettura ora riesce (era solo la rete): rilegge e basta', async () => {
    const { riprovaCatalogo, catalogo, chiamate } = await carica({
      'GET /api/catalogo': () => json(CATALOGO),
      'GET /api/catalogo/riconciliazione': () => json(COPPIE),
      'GET /api/catalogo/stato': () => json({ stato: 'ok' }),
    });
    expect(await riprovaCatalogo()).toBe('riletto');
    expect(catalogo.istantanea().stato).toBe('pronto');
    expect(chiamate.some((c) => c.startsWith('POST'))).toBe(false);
  });

  it('il catalogo non si legge davvero: lo ricostruisce, una volta sola', async () => {
    let partito = false;
    const { riprovaCatalogo, chiamate } = await carica({
      'GET /api/catalogo': () => json({ errore: 'x' }, 500),
      'GET /api/catalogo/riconciliazione': () => json(COPPIE),
      'GET /api/catalogo/stato': () => json({ stato: partito ? 'in-corso' : 'ok', avviatoIl: partito ? 'ora' : undefined }),
      'POST /api/esegui': () => {
        partito = true;
        return json({ id: '1' });
      },
    });
    expect(await riprovaCatalogo()).toBe('ricostruzione');
    expect(chiamate.filter((c) => c.startsWith('POST'))).toHaveLength(1);
  });

  it('una ricostruzione e\' gia\' in corso: non ne parte un\'altra', async () => {
    const { riprovaCatalogo, chiamate } = await carica({
      'GET /api/catalogo': () => json({ errore: 'x' }, 500),
      'GET /api/catalogo/riconciliazione': () => json(COPPIE),
      'GET /api/catalogo/stato': () => json({ stato: 'in-corso' }),
    });
    expect(await riprovaCatalogo()).toBe('ricostruzione');
    expect(chiamate.some((c) => c.startsWith('POST'))).toBe(false);
  });

  it('un altro comando occupa il programma: lo dice, senza far finta di niente', async () => {
    const { riprovaCatalogo } = await carica({
      'GET /api/catalogo': () => json({ errore: 'x' }, 500),
      'GET /api/catalogo/riconciliazione': () => json(COPPIE),
      'GET /api/catalogo/stato': () => json({ stato: 'ok' }),
      'POST /api/esegui': () => json({ errore: 'occupato' }, 400),
    });
    expect(await riprovaCatalogo()).toBe('rifiutato');
  });
});
