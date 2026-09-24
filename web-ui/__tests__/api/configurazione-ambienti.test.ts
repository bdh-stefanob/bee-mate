import { describe, it, expect } from 'vitest';
import { POST, DELETE } from '@/app/api/configurazione/ambienti/route';

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

describe('DELETE /api/configurazione/ambienti', () => {
  // Solo i percorsi che rifiutano PRIMA di toccare il disco: questi test
  // girano contro bdd-targets.json vero del repository (stessa scelta degli
  // altri test di questo file), quindi non devono mai raggiungere una
  // scrittura o cancellazione andata a buon fine.
  it("rifiuta una richiesta che viene da un'altra origine", async () => {
    const res = await DELETE(new Request('http://localhost:3000/api/configurazione/ambienti', {
      method: 'DELETE',
      headers: { origin: 'https://sito-qualunque.example' },
      body: JSON.stringify({ nome: 'demo' }),
    }));
    expect(res.status).toBe(403);
  });

  it('rifiuta un nome non testuale', async () => {
    const res = await DELETE(new Request('http://localhost:3000/api/configurazione/ambienti', {
      method: 'DELETE',
      headers: { origin: 'http://127.0.0.1:3000' },
      body: JSON.stringify({ nome: 123 }),
    }));
    expect(res.status).toBe(400);
  });

  it('rifiuta un ambiente che non esiste, e lo dice nel corpo della risposta', async () => {
    const res = await DELETE(new Request('http://localhost:3000/api/configurazione/ambienti', {
      method: 'DELETE',
      headers: { origin: 'http://127.0.0.1:3000' },
      body: JSON.stringify({ nome: 'un-ambiente-che-di-sicuro-non-esiste-nei-test' }),
    }));
    expect(res.status).toBe(400);
    const corpo = await res.json();
    expect(corpo.errore).toMatch(/ambiente sconosciuto|nome di ambiente/);
  });
});
