import { describe, it, expect } from 'vitest';
import { createServer } from 'net';
import type { AddressInfo } from 'net';
import { POST, DELETE } from '@/app/api/configurazione/ambienti/route';

/** Apre un server su una porta libera e lo chiude: quella porta, adesso, rifiuta. */
function portaChiusa(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as AddressInfo;
      server.close(() => resolve(port));
    });
  });
}

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

  it("non salva un indirizzo a cui non risponde nessuno, e dice perche'", async () => {
    // Una porta di questa macchina su cui nessuno ascolta piu': la connessione
    // viene rifiutata subito e la rotta si ferma PRIMA di scrivere il file.
    const porta = await portaChiusa();
    const res = await POST(new Request('http://localhost:3000/api/configurazione/ambienti', {
      method: 'POST',
      headers: { origin: 'http://127.0.0.1:3000' },
      body: JSON.stringify({ nome: 'un-ambiente-di-prova-del-preflight', url: `http://127.0.0.1:${porta}` }),
    }));
    expect(res.status).toBe(409);
    const corpo = await res.json();
    expect(corpo.irraggiungibile).toBe(true);
    expect(corpo.motivo).toBe('rifiutata');
    expect(corpo.scritto).toBeUndefined();
  });

  it("\"comunque\" deve essere un vero/falso", async () => {
    const res = await POST(new Request('http://localhost:3000/api/configurazione/ambienti', {
      method: 'POST',
      headers: { origin: 'http://127.0.0.1:3000' },
      body: JSON.stringify({ nome: 'demo', url: 'http://127.0.0.1:1', comunque: 'si' }),
    }));
    expect(res.status).toBe(400);
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
