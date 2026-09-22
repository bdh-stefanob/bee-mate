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
