import { describe, it, expect } from 'vitest';
import * as path from 'path';
import { leggiTraccia, leggiPassiTest, riepilogoErrore } from '@/lib/artefatti';

const FIXTURES = path.join(__dirname, '..', 'fixtures');

describe('lettura degli artefatti', () => {
  it('dalla traccia legge i passi con il nome dato dal tester', () => {
    const t = leggiTraccia(path.join(FIXTURES, 'traccia.json'));
    expect(t.passi).toEqual([
      { nome: 'the user logs in', gesti: 3, verifiche: 0 },
      { nome: 'the user opens the list', gesti: 1, verifiche: 2 },
    ]);
  });

  it('dai messaggi di Cucumber legge l\'esito di ogni passo', () => {
    const passi = leggiPassiTest(path.join(FIXTURES, 'messaggi.ndjson'));
    expect(passi.map((p) => p.esito)).toEqual(['passato', 'fallito', 'saltato']);
  });

  it('un file che non c\'e\' non fa cadere la finestra', () => {
    expect(leggiTraccia(path.join(FIXTURES, 'non-esiste.json')).passi).toEqual([]);
  });

  describe('schermata del passo fallito', () => {
    it('un passo fallito con un allegato immagine porta la schermata come data URI', () => {
      const passi = leggiPassiTest(path.join(FIXTURES, 'messaggi-con-schermata.ndjson'));
      const fallito = passi.find((p) => p.esito === 'fallito');
      expect(fallito?.schermata).toMatch(/^data:image\/png;base64,/);
    });

    it('un passo fallito senza allegato non ha il campo schermata (non una stringa vuota)', () => {
      const passi = leggiPassiTest(path.join(FIXTURES, 'messaggi.ndjson'));
      const fallito = passi.find((p) => p.esito === 'fallito');
      expect(fallito).toBeDefined();
      expect(fallito?.schermata).toBeUndefined();
      expect('schermata' in (fallito ?? {})).toBe(false);
    });

    it('un allegato che non e\' un\'immagine viene ignorato', () => {
      const passi = leggiPassiTest(path.join(FIXTURES, 'messaggi-allegato-non-immagine.ndjson'));
      const fallito = passi.find((p) => p.esito === 'fallito');
      expect(fallito?.schermata).toBeUndefined();
    });
  });

  describe('messaggio del passo fallito (finding F1: niente escape ANSI, riepilogo in chiaro)', () => {
    it('pulisce gli escape ANSI dal messaggio prima che arrivi alla finestra', () => {
      const passi = leggiPassiTest(path.join(FIXTURES, 'messaggi-ansi.ndjson'));
      const fallito = passi.find((p) => p.esito === 'fallito');
      expect(fallito?.messaggio).not.toContain('\u001b[');
      expect(fallito?.messaggio).toBe('Error: expect(locator).toBeVisible failed');
    });

    it('estrae pagina attesa e indirizzo raggiunto quando il messaggio li porta', () => {
      const passi = leggiPassiTest(path.join(FIXTURES, 'messaggi-pagina-attesa.ndjson'));
      const fallito = passi.find((p) => p.esito === 'fallito');
      expect(fallito?.riepilogo?.paginaAttesa).toBe('AppPage (/app)');
      expect(fallito?.riepilogo?.indirizzoOra).toBe('https://esempio.invalid/accedi');
    });

    it('senza quelle righe, il riepilogo e\' la prima riga del messaggio', () => {
      const passi = leggiPassiTest(path.join(FIXTURES, 'messaggi.ndjson'));
      const fallito = passi.find((p) => p.esito === 'fallito');
      expect(fallito?.riepilogo?.paginaAttesa).toBeUndefined();
      expect(fallito?.riepilogo?.primaRiga).toBe('expected list to contain "First item"');
    });
  });
});

describe('riepilogoErrore', () => {
  it('un messaggio senza le righe fisse da\' solo la prima riga', () => {
    expect(riepilogoErrore('primo\nsecondo').primaRiga).toBe('primo');
  });
});
