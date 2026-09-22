import { describe, it, expect, beforeEach } from 'vitest';
import { POST } from '@/app/api/esegui/route';
import { azzeraPerTest } from '@/lib/registro';

beforeEach(() => azzeraPerTest());

describe('POST /api/esegui', () => {
  it("rifiuta un comando che non e' nell'elenco", async () => {
    const res = await POST(new Request('http://x/api/esegui', {
      method: 'POST',
      body: JSON.stringify({ nome: 'qualunque-cosa' }),
    }));
    expect(res.status).toBe(400);
  });

  it('rifiuta un bersaglio che sembra una riga di comando', async () => {
    const res = await POST(new Request('http://x/api/esegui', {
      method: 'POST',
      body: JSON.stringify({ nome: 'test', parametri: { bersaglio: 'x && del *' } }),
    }));
    expect(res.status).toBe(400);
  });
});

describe('da dove arriva la richiesta', () => {
  // L'indirizzo della richiesta e' di proposito diverso da quello dell'origine:
  // e' la situazione vera. Il framework normalizza `request.url` a `localhost`,
  // mentre la finestra vive su `127.0.0.1`. Il caso di prima li faceva
  // coincidere per costruzione, e cosi' verificava la propria finzione: era
  // verde mentre nel prodotto ogni pulsante rispondeva di no.
  const comeLoVedeIlFramework = 'http://localhost:3000/api/esegui';

  it('lascia passare la finestra servita da 127.0.0.1', async () => {
    const res = await POST(new Request(comeLoVedeIlFramework, {
      method: 'POST',
      headers: { origin: 'http://127.0.0.1:3000' },
      body: JSON.stringify({ nome: 'qualunque-cosa' }),
    }));
    // 400 e non 403: la richiesta e' entrata, e si e' fermata dopo, sul nome.
    expect(res.status).toBe(400);
  });

  it("lascia passare quando il browser dichiara che viene da se' stesso", async () => {
    const res = await POST(new Request(comeLoVedeIlFramework, {
      method: 'POST',
      headers: { 'sec-fetch-site': 'same-origin', origin: 'http://127.0.0.1:3000' },
      body: JSON.stringify({ nome: 'qualunque-cosa' }),
    }));
    expect(res.status).toBe(400);
  });

  it("rifiuta una richiesta che viene da un'altra origine", async () => {
    const res = await POST(new Request(comeLoVedeIlFramework, {
      method: 'POST',
      headers: { origin: 'https://sito-qualunque.example' },
      body: JSON.stringify({ nome: 'diagnosi' }),
    }));
    expect(res.status).toBe(403);
  });

  it('rifiuta anche quando il browser la dichiara di un altro sito', async () => {
    const res = await POST(new Request(comeLoVedeIlFramework, {
      method: 'POST',
      headers: { 'sec-fetch-site': 'cross-site' },
      body: JSON.stringify({ nome: 'diagnosi' }),
    }));
    expect(res.status).toBe(403);
  });
});
