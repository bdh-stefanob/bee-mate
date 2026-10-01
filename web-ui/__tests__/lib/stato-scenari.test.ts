import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  risorsaTesto,
  MASSIMO_TESTI_IN_CACHE,
  svuotaCacheTesti,
  scenari,
  dopoUnCambioDegliScenari,
  leggiScenari,
} from '@/lib/stato-scenari';

afterEach(() => {
  svuotaCacheTesti();
  vi.unstubAllGlobals();
});

describe('risorsaTesto: la cache dei testi a chiave file + impronta', () => {
  it('con la stessa file@impronta restituisce la stessa risorsa', () => {
    expect(risorsaTesto('a/b.feature', 'aaaa')).toBe(risorsaTesto('a/b.feature', 'aaaa'));
  });

  it('con un\'impronta diversa, un\'altra: il testo vecchio non si serve mai a un file cambiato', () => {
    expect(risorsaTesto('a/b.feature', 'aaaa')).not.toBe(risorsaTesto('a/b.feature', 'bbbb'));
  });

  it('un file diverso con la stessa impronta e\' un\'altra risorsa', () => {
    expect(risorsaTesto('a/b.feature', 'aaaa')).not.toBe(risorsaTesto('a/c.feature', 'aaaa'));
  });

  it('la cache non supera il massimo: la piu\' vecchia esce', () => {
    const prima = risorsaTesto('f0.feature', 'x');
    for (let i = 1; i <= MASSIMO_TESTI_IN_CACHE; i++) risorsaTesto(`f${i}.feature`, 'x');
    expect(MASSIMO_TESTI_IN_CACHE).toBe(30);
    // La prima e' uscita: chiederla di nuovo da' una risorsa nuova.
    expect(risorsaTesto('f0.feature', 'x')).not.toBe(prima);
  });

  it('legge il testo da /api/download con il percorso codificato', async () => {
    const fetchFinto = vi.fn().mockResolvedValue({ ok: true, text: async () => 'Feature: X\n' });
    vi.stubGlobal('fetch', fetchFinto);
    const r = risorsaTesto('shop/order/x y.feature', 'aaaa');
    await r.carica();
    expect(fetchFinto).toHaveBeenCalledWith('/api/download?file=shop%2Forder%2Fx%20y.feature');
    expect(r.istantanea()).toMatchObject({ stato: 'pronto', dati: 'Feature: X\n' });
  });

  it('una risposta non riuscita e\' un errore, non un testo vuoto', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404, text: async () => 'Not Found' }));
    const r = risorsaTesto('a/non-c-e.feature', 'aaaa');
    await r.carica();
    expect(r.istantanea().stato).toBe('errore');
  });
});

describe('dopoUnCambioDegliScenari', () => {
  it('rilegge l\'elenco (una lettura partita dopo la chiamata)', async () => {
    const fetchFinto = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ file: [], soloDescritti: 0, esiti: 'ok' }),
    });
    vi.stubGlobal('fetch', fetchFinto);
    dopoUnCambioDegliScenari();
    await scenari.carica();
    expect(fetchFinto).toHaveBeenCalledWith('/api/scenari');
    expect(scenari.istantanea().dati).toEqual({ file: [], soloDescritti: 0, esiti: 'ok' });
  });

  it('una risposta senza la forma attesa non diventa un elenco vuoto: e\' un errore', async () => {
    // Un elenco vuoto qui direbbe "non c'e' nessuno scenario", cioe' una cosa falsa.
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ errore: 'x' }) }));
    await expect(leggiScenari()).rejects.toThrow();
  });
});
