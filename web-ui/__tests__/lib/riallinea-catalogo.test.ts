import { describe, it, expect, vi, afterEach } from 'vitest';
import { riallineaCatalogo, rilanciaAggiornamento, statoAggiornamento } from '@/lib/risorse-catalogo';

/** Risposte in sequenza: ogni chiamata a `fetch` prende la successiva. */
function fetchCon(...stati: number[]) {
  const f = vi.fn(async (rotta: string) => {
    if (rotta === '/api/catalogo/stato') return new Response(JSON.stringify({ stato: 'in-corso' }), { status: 200 });
    const stato = stati.shift() ?? 200;
    return new Response(JSON.stringify(stato === 200 ? { id: 'x' } : { errore: 'occupato' }), { status: stato });
  });
  vi.stubGlobal('fetch', f);
  return f;
}

const lanci = (f: ReturnType<typeof fetchCon>) => f.mock.calls.filter(([r]) => r === '/api/esegui').length;

afterEach(() => vi.unstubAllGlobals());

describe('riallineaCatalogo: il comando catalogo dopo Applica/Annulla', () => {
  it('parte al primo colpo: una sola richiesta, true', async () => {
    const f = fetchCon(200);
    expect(await riallineaCatalogo(0)).toBe(true);
    expect(lanci(f)).toBe(1);
  });

  it('un altro comando in corso (400): riprova una volta, e parte', async () => {
    const f = fetchCon(400, 200);
    expect(await riallineaCatalogo(0)).toBe(true);
    expect(lanci(f)).toBe(2);
  });

  it('rifiutato anche la seconda volta: false, e non insiste', async () => {
    const f = fetchCon(400, 400, 200);
    expect(await riallineaCatalogo(0)).toBe(false);
    expect(lanci(f)).toBe(2);
  });
});

describe('rilanciaAggiornamento: lo stato lo scrive lo script, dopo la partenza', () => {
  it('non si accontenta della lettura di prima: aspetta di vedere il giro nuovo', async () => {
    const vecchio = { stato: 'ok', avviatoIl: 'A', concluseIl: 'B' };
    // La rotta di avvio risponde subito; lo stato cambia solo alla terza lettura.
    let letture = 0;
    vi.stubGlobal('fetch', vi.fn(async (rotta: string) => {
      if (rotta === '/api/catalogo/stato') {
        letture++;
        return new Response(JSON.stringify(letture >= 3 ? { stato: 'in-corso', avviatoIl: 'C' } : vecchio), { status: 200 });
      }
      return new Response(JSON.stringify({ id: 'x' }), { status: 200 });
    }));
    await statoAggiornamento.ricarica(); // lo stato di prima (letture = 1)
    letture = 0;
    expect(await rilanciaAggiornamento(0)).toBe(true);
    expect(statoAggiornamento.istantanea().dati?.stato).toBe('in-corso');
  });
});
