import { describe, expect, it } from 'vitest';
import {
  LIMITE_LETTURA_MS,
  leggiConLimite,
  leggiElencoScenari,
  statoElencoScenari,
} from '@/lib/lettura';

/** Una risposta finta: basta quello che il codice legge. */
function risposta(corpo: unknown, ok = true, stato = ok ? 200 : 500): Response {
  return { ok, status: stato, json: async () => corpo } as unknown as Response;
}

const comeFetch = (f: unknown) => f as typeof fetch;

/** Un fetch che non risponde mai: si arrende solo quando il segnale scade. */
const fetchSenzaRisposta = comeFetch(
  (_: string, init?: RequestInit) =>
    new Promise<Response>((_ok, rifiuta) => {
      init?.signal?.addEventListener('abort', () => rifiuta(init.signal?.reason));
    })
);

describe('LIMITE_LETTURA_MS', () => {
  it('sono 15 secondi', () => {
    expect(LIMITE_LETTURA_MS).toBe(15000);
  });
});

describe('leggiConLimite', () => {
  it('una rotta che non risponde mai finisce in errore dopo il limite, non resta appesa', async () => {
    await expect(leggiConLimite('/api/x', 20, fetchSenzaRisposta)).rejects.toBeTruthy();
  });

  it('una rotta che risponde in tempo torna con la sua risposta', async () => {
    const r = risposta({ a: 1 });
    expect(await leggiConLimite('/api/x', 1000, comeFetch(async () => r))).toBe(r);
  });

  it('passa al fetch un segnale che scade', async () => {
    let visto: AbortSignal | undefined;
    await leggiConLimite(
      '/api/x',
      1000,
      comeFetch(async (_: string, init?: RequestInit) => {
        visto = init?.signal ?? undefined;
        return risposta({});
      })
    );
    expect(visto).toBeDefined();
    expect(visto?.aborted).toBe(false);
  });
});

describe('leggiElencoScenari', () => {
  const dati = { file: [{ file: 'a/b.feature', nome: 'b', scenari: [] }] };

  it('risposta buona: elenco letto', async () => {
    const esito = await leggiElencoScenari(comeFetch(async () => risposta(dati)));
    expect(esito).toEqual({ tipo: 'letto', file: dati.file });
  });

  it('risposta buona con elenco vuoto: letto, e vuoto davvero', async () => {
    const esito = await leggiElencoScenari(comeFetch(async () => risposta({ file: [] })));
    expect(esito).toEqual({ tipo: 'letto', file: [] });
  });

  it('errore 500: NON letto (mai "vuoto")', async () => {
    const esito = await leggiElencoScenari(comeFetch(async () => risposta({ errore: 'x' }, false, 500)));
    expect(esito).toEqual({ tipo: 'non-letto' });
  });

  it('connessione chiusa: non letto', async () => {
    const esito = await leggiElencoScenari(
      comeFetch(async () => {
        throw new TypeError('Failed to fetch');
      })
    );
    expect(esito).toEqual({ tipo: 'non-letto' });
  });

  it('risposta senza elenco (forma inattesa): non letto, non vuoto', async () => {
    const esito = await leggiElencoScenari(comeFetch(async () => risposta({})));
    expect(esito).toEqual({ tipo: 'non-letto' });
  });

  it('corpo non JSON: non letto', async () => {
    const esito = await leggiElencoScenari(
      comeFetch(async () => ({
        ok: true,
        status: 200,
        json: async () => {
          throw new SyntaxError('x');
        },
      }))
    );
    expect(esito).toEqual({ tipo: 'non-letto' });
  });

  it('nessuna risposta entro il limite: non letto', async () => {
    expect(await leggiElencoScenari(fetchSenzaRisposta, 20)).toEqual({ tipo: 'non-letto' });
  });
});

describe('statoElencoScenari', () => {
  it('niente ancora: in lettura', () => {
    expect(statoElencoScenari(null)).toBe('in-lettura');
  });
  it('letto con scenari: pieno', () => {
    expect(statoElencoScenari({ tipo: 'letto', file: [{ file: 'a' }] })).toBe('pieno');
  });
  it('letto senza scenari: vuoto', () => {
    expect(statoElencoScenari({ tipo: 'letto', file: [] })).toBe('vuoto');
  });
  it('non letto: non-letto, diverso da vuoto', () => {
    expect(statoElencoScenari({ tipo: 'non-letto' })).toBe('non-letto');
  });
});
