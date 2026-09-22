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

  it('se la chiave compare due volte, dopo la scrittura compare una sola volta (rilievo 1)', () => {
    const dopo = scriviVariabile('A=1\nPIMS_URL=x\nPIMS_URL=y\nB=2\n', 'PIMS_URL', 'nuovo');
    expect(dopo.match(/PIMS_URL/g)).toHaveLength(1);
    expect(dopo).toBe('A=1\nPIMS_URL=nuovo\nB=2\n');
  });

  it('conserva il fine riga CRLF del file originale (rilievo 2)', () => {
    const dopo = scriviVariabile('A=1\r\nPIMS_URL=old\r\nB=2\r\n', 'PIMS_URL', 'nuovo');
    expect(dopo).toBe('A=1\r\nPIMS_URL=nuovo\r\nB=2\r\n');
    expect(dopo).not.toMatch(/[^\r]\n/); // nessun \n non preceduto da \r: niente fine riga misti
  });

  it('il file termina sempre con un a capo, anche sostituendo una chiave esistente senza a capo finale (rilievo 3)', () => {
    const dopo = scriviVariabile('A=1\nPIMS_URL=old', 'PIMS_URL', 'nuovo');
    expect(dopo).toBe('A=1\nPIMS_URL=nuovo\n');
  });

  it('elenco vuoto se il json dei bersagli e\' malformato (rilievo 4)', () => {
    expect(bersagliDaFile('{questo non e\' json')).toEqual([]);
  });

  it('elenco vuoto se il json dei bersagli e\' un array (rilievo 4)', () => {
    expect(bersagliDaFile('["a","b","c"]')).toEqual([]);
  });
});
