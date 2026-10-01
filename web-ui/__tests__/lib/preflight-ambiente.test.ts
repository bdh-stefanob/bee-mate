import { describe, it, expect } from 'vitest';
import { preflightAmbiente } from '@/lib/preflight-ambiente';

/** Un errore fatto come quelli di `fetch` in Node: `TypeError` con la causa vera dentro. */
function erroreDiRete(code: string): TypeError {
  return Object.assign(new TypeError('fetch failed'), { cause: { code } });
}

const risponde = (status: number) => async () => new Response(null, { status });
const fallisce = (err: unknown) => async () => {
  throw err;
};

describe('preflightAmbiente', () => {
  it('un indirizzo che risponde e\' raggiungibile', async () => {
    const esito = await preflightAmbiente('https://demo.invalid', { fetchImpl: risponde(200) });
    expect(esito).toEqual({ esito: 'raggiungibile' });
  });

  it.each([401, 403, 404, 500])('anche una risposta %i dice che il server c\'e\'', async (status) => {
    const esito = await preflightAmbiente('https://demo.invalid', { fetchImpl: risponde(status) });
    expect(esito.esito).toBe('raggiungibile');
  });

  it.each([
    ['ENOTFOUND', 'dns'],
    ['EAI_AGAIN', 'dns'],
    ['ECONNREFUSED', 'rifiutata'],
    ['ECONNRESET', 'rifiutata'],
    ['UND_ERR_CONNECT_TIMEOUT', 'tempo'],
    ['ETIMEDOUT', 'tempo'],
    ['CERT_HAS_EXPIRED', 'certificato'],
    ['DEPTH_ZERO_SELF_SIGNED_CERT', 'certificato'],
    ['UNABLE_TO_VERIFY_LEAF_SIGNATURE', 'certificato'],
    ['ERR_TLS_CERT_ALTNAME_INVALID', 'certificato'],
    ['QUALCOSA_DI_MAI_VISTO', 'altro'],
  ])('un errore %s diventa il motivo "%s"', async (code, motivo) => {
    const esito = await preflightAmbiente('https://demo.invalid', { fetchImpl: fallisce(erroreDiRete(code)) });
    expect(esito).toEqual({ esito: 'irraggiungibile', motivo });
  });

  it('un\'attesa scaduta e\' un motivo a se\'', async () => {
    const scaduta = Object.assign(new Error('The operation was aborted due to timeout'), { name: 'TimeoutError' });
    const esito = await preflightAmbiente('https://demo.invalid', { fetchImpl: fallisce(scaduta) });
    expect(esito).toEqual({ esito: 'irraggiungibile', motivo: 'tempo' });
  });

  it('una ${VARIABILE} impostata si risolve prima di provare', async () => {
    let chiamato = '';
    const esito = await preflightAmbiente('${APP_URL}/accesso', {
      env: { APP_URL: 'https://demo.invalid' },
      fetchImpl: async (url) => {
        chiamato = String(url);
        return new Response(null, { status: 200 });
      },
    });
    expect(chiamato).toBe('https://demo.invalid/accesso');
    expect(esito.esito).toBe('raggiungibile');
  });

  it('una ${VARIABILE} non ancora impostata non si puo\' provare: si salta, non si accusa l\'indirizzo', async () => {
    let chiamate = 0;
    const esito = await preflightAmbiente('${APP_URL}', {
      env: {},
      fetchImpl: async () => {
        chiamate++;
        return new Response(null, { status: 200 });
      },
    });
    expect(esito).toEqual({ esito: 'saltato' });
    expect(chiamate).toBe(0);
  });
});
