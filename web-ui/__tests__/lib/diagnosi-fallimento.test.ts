import { describe, it, expect } from 'vitest';
import { rilevaCausaFallimento } from '@/lib/diagnosi-fallimento';

describe('rilevaCausaFallimento', () => {
  it('Test 1: riconosce un browser mancante dal testo vero di browser.ts (BDD_BROWSER=nonexistent)', () => {
    // Righe catturate lanciando davvero `record.ts` con BDD_BROWSER=nonexistent
    // (finding F2, il caso indicato nel "Done when").
    const righe = [
      'Registrazione fallita: Nessun browser disponibile.',
      '',
      "  Il piu' probabile: i browser di Playwright non sono stati scaricati.",
      '      npx playwright install chromium',
      '  Dettaglio di cosa ho provato:',
      '    nonexistent: browserType.launch: Unsupported chromium channel "nonexistent"',
    ];
    expect(rilevaCausaFallimento(righe)).toBe('browser-mancante');
  });

  it('Test 2: riconosce un indirizzo irraggiungibile dal testo vero di Playwright', () => {
    // Riga catturata lanciando davvero `record.ts` con un indirizzo che non risolve.
    const righe = [
      'Registrazione fallita: page.goto: net::ERR_NAME_NOT_RESOLVED at https://non-esiste.invalid/',
      'Call log:',
      '  - navigating to "https://non-esiste.invalid/", waiting until "domcontentloaded"',
    ];
    expect(rilevaCausaFallimento(righe)).toBe('indirizzo-irraggiungibile');
  });

  it('Test 3: un fallimento senza firma nota non forza una causa a caso', () => {
    expect(rilevaCausaFallimento(['Error: qualcosa di mai visto prima'])).toBeNull();
  });

  it('Test 4: nessuna riga, nessuna causa', () => {
    expect(rilevaCausaFallimento([])).toBeNull();
  });
});
