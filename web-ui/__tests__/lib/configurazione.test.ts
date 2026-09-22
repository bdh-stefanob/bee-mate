import { describe, it, expect } from 'vitest';
import { scriviVariabile, bersagliDaFile } from '@/lib/configurazione';

describe('scrittura della configurazione', () => {
  it('aggiunge una variabile che non c\'era', () => {
    expect(scriviVariabile('ALTRA=1\n', 'PIMS_URL', 'https://x.invalid'))
      .toBe('ALTRA=1\nPIMS_URL=https://x.invalid\n');
  });

  it('sostituisce quella che c\'era, senza duplicarla', () => {
    const dopo = scriviVariabile('A=1\nPIMS_URL=vecchio\nB=2\n', 'PIMS_URL', 'nuovo');
    expect(dopo).toBe('A=1\nPIMS_URL=nuovo\nB=2\n');
    expect(dopo.match(/PIMS_URL/g)).toHaveLength(1);
  });

  it('rifiuta una chiave che non e\' una chiave', () => {
    expect(() => scriviVariabile('', 'A=1\nB', 'x')).toThrow(/chiave non valida/);
  });

  it('elenca i bersagli senza mostrarne gli indirizzi', () => {
    const json = '{"_commento":["x"],"lavoro":{"url":"${PIMS_URL}"},"altro":{"url":"${B}"}}';
    expect(bersagliDaFile(json)).toEqual(['lavoro', 'altro']);
  });
});
