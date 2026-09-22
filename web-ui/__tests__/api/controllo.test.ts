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

describe('il rimedio arriva sempre fino alla riga', () => {
  it("una voce senza corrispondenza chiusa tiene comunque il comando da copiare", () => {
    // Il difetto che questo caso ferma: il JSON portava solo il nome chiuso,
    // quindi le voci senza corrispondenza (Ambienti, Catalogo) restavano rosse
    // e mute — nessun pulsante, nessun testo, nessuna strada.
    const r = interpreta({
      voci: [
        {
          nome: 'Ambienti',
          esito: 'manca',
          dettaglio: 'nessun file degli ambienti',
          rimedio: 'cp bdd-targets.example.json bdd-targets.json',
        },
      ],
    });
    expect(r.voci[0].rimedio).toEqual({
      comando: 'cp bdd-targets.example.json bdd-targets.json',
      chiuso: undefined,
    });
  });

  it('una voce con corrispondenza chiusa porta tutti e due', () => {
    const r = interpreta({
      voci: [
        {
          nome: 'Browser',
          esito: 'manca',
          dettaglio: 'nessun browser',
          rimedio: 'npx playwright install chromium',
          rimedioChiuso: 'installa-browser',
        },
      ],
    });
    expect(r.voci[0].rimedio).toEqual({
      comando: 'npx playwright install chromium',
      chiuso: 'installa-browser',
    });
  });
});
