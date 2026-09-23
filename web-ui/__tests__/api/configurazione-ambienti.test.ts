import { describe, it, expect } from 'vitest';
import { POST } from '@/app/api/configurazione/ambienti/route';

describe('POST /api/configurazione/ambienti', () => {
  it("rifiuta una richiesta che viene da un'altra origine", async () => {
    const res = await POST(new Request('http://localhost:3000/api/configurazione/ambienti', {
      method: 'POST',
      headers: { origin: 'https://sito-qualunque.example' },
      body: JSON.stringify({ nome: 'demo', url: 'https://demo.invalid' }),
    }));
    expect(res.status).toBe(403);
  });

  it('rifiuta nome o url non testuali', async () => {
    const res = await POST(new Request('http://localhost:3000/api/configurazione/ambienti', {
      method: 'POST',
      headers: { origin: 'http://127.0.0.1:3000' },
      body: JSON.stringify({ nome: 123, url: 'https://demo.invalid' }),
    }));
    expect(res.status).toBe(400);
  });

  it('rifiuta uno schema non ammesso, e lo dice nel corpo della risposta', async () => {
    const res = await POST(new Request('http://localhost:3000/api/configurazione/ambienti', {
      method: 'POST',
      headers: { origin: 'http://127.0.0.1:3000' },
      body: JSON.stringify({ nome: 'demo', url: 'javascript:alert(1)' }),
    }));
    expect(res.status).toBe(400);
    const corpo = await res.json();
    expect(corpo.errore).toMatch(/http/);
  });
});
