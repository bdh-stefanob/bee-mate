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
  it("rifiuta una richiesta che viene da un'altra origine", async () => {
    // Il cruscotto ascolta su un indirizzo locale, e un indirizzo locale e'
    // raggiungibile da qualunque scheda aperta nello stesso browser.
    const res = await POST(new Request('http://127.0.0.1:3000/api/esegui', {
      method: 'POST',
      headers: { origin: 'https://sito-qualunque.example' },
      body: JSON.stringify({ nome: 'diagnosi' }),
    }));
    expect(res.status).toBe(403);
  });

  it('lascia passare quella della finestra', async () => {
    // Si usa un comando inesistente apposta: se la guardia lasciasse passare
    // un comando vero, questo caso avvierebbe un processo a ogni esecuzione
    // della suite. Il 400 arriva da dopo la guardia, ed e' quello che si vuole
    // dimostrare: la richiesta e' entrata.
    const res = await POST(new Request('http://127.0.0.1:3000/api/esegui', {
      method: 'POST',
      headers: { origin: 'http://127.0.0.1:3000' },
      body: JSON.stringify({ nome: 'qualunque-cosa' }),
    }));
    expect(res.status).toBe(400);
  });
});
