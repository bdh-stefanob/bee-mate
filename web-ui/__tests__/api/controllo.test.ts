import { describe, it, expect } from 'vitest';
import { interpreta } from '@/lib/controllo';

describe('controllo della macchina', () => {
  it('una voce che manca porta con se\' il rimedio', () => {
    const r = interpreta({
      voci: [{ nome: 'Browser', esito: 'manca', dettaglio: 'nessun browser trovato', rimedio: 'installa-browser' }],
    });
    expect(r.pronto).toBe(false);
    expect(r.voci[0].rimedio).toBeDefined();
  });

  it('tutto a posto significa pronto', () => {
    const r = interpreta({ voci: [{ nome: 'Browser', esito: 'ok', dettaglio: 'Chrome' }] });
    expect(r.pronto).toBe(true);
  });
});
