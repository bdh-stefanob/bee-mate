import { describe, it, expect } from 'vitest';
import { POST } from '@/app/api/ambiente/route';

// Solo i percorsi che rifiutano PRIMA di leggere/scrivere il cookie: fuori da
// una vera richiesta Next.js, `cookies()` non ha uno scope da cui leggere, e
// questi sono gli unici rami che non ci arrivano.
describe('POST /api/ambiente', () => {
  it("rifiuta una richiesta che viene da un'altra origine", async () => {
    const res = await POST(new Request('http://localhost:3000/api/ambiente', {
      method: 'POST',
      headers: { origin: 'https://sito-qualunque.example' },
      body: JSON.stringify({ ambiente: 'demo' }),
    }));
    expect(res.status).toBe(403);
  });

  it('rifiuta un corpo senza un ambiente testuale', async () => {
    const res = await POST(new Request('http://localhost:3000/api/ambiente', {
      method: 'POST',
      headers: { origin: 'http://127.0.0.1:3000' },
      body: JSON.stringify({ ambiente: 42 }),
    }));
    expect(res.status).toBe(400);
  });

  it('rifiuta un nome che non rispetta la stessa regola dei bersagli', async () => {
    const res = await POST(new Request('http://localhost:3000/api/ambiente', {
      method: 'POST',
      headers: { origin: 'http://127.0.0.1:3000' },
      body: JSON.stringify({ ambiente: 'con spazi non ammessi' }),
    }));
    expect(res.status).toBe(400);
  });

  it('rifiuta un corpo che non e\' JSON', async () => {
    const res = await POST(new Request('http://localhost:3000/api/ambiente', {
      method: 'POST',
      headers: { origin: 'http://127.0.0.1:3000' },
      body: 'non-json',
    }));
    expect(res.status).toBe(400);
  });
});
