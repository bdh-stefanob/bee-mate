import { describe, it, expect } from 'vitest';
import { POST } from '@/app/api/configurazione/ambienti/login/route';

describe('POST /api/configurazione/ambienti/login', () => {
  it("rifiuta una richiesta che viene da un'altra origine", async () => {
    const res = await POST(new Request('http://localhost:3000/api/configurazione/ambienti/login', {
      method: 'POST',
      headers: { origin: 'https://sito-qualunque.example' },
      body: JSON.stringify({ nome: 'demo' }),
    }));
    expect(res.status).toBe(403);
  });

  it('rifiuta un nome non valido', async () => {
    const res = await POST(new Request('http://localhost:3000/api/configurazione/ambienti/login', {
      method: 'POST',
      headers: { origin: 'http://127.0.0.1:3000' },
      body: JSON.stringify({ nome: 'con spazi qui' }),
    }));
    expect(res.status).toBe(400);
  });

  it('rifiuta un nome non testuale', async () => {
    const res = await POST(new Request('http://localhost:3000/api/configurazione/ambienti/login', {
      method: 'POST',
      headers: { origin: 'http://127.0.0.1:3000' },
      body: JSON.stringify({ nome: 123 }),
    }));
    expect(res.status).toBe(400);
  });
});
