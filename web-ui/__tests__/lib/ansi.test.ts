import { describe, it, expect } from 'vitest';
import { rimuoviCodiciAnsi } from '@/lib/ansi';

// Messaggio catturato da un'esecuzione vera (npm run test:bersaglio app-a ...
// con FORCE_COLOR=1, cosi' com'e' quando chi lancia il cruscotto ha un
// terminale a colori): Playwright ci mette dentro `\x1b[2m...\x1b[22m` e
// simili. E' esattamente cio' che il finding F1 mostrava a schermo.
const MESSAGGIO_REALE =
  'Error: \u001b[2mexpect(\u001b[22m\u001b[31mlocator\u001b[39m\u001b[2m).\u001b[22mtoBeVisible\u001b[2m(\u001b[22m\u001b[2m)\u001b[22m failed\n\n' +
  'Locator: getByRole(\'link\', { name: \'Recharges\' })\n' +
  'Expected: visible\n' +
  'Timeout: 10000ms\n' +
  'Error: element(s) not found\n\n' +
  'Call log:\n' +
  '\u001b[2m  - Expect "to.be.visible" with timeout 10000ms\u001b[22m\n' +
  '\u001b[2m  - waiting for getByRole(\'link\', { name: \'Recharges\' })\u001b[22m';

describe('rimuoviCodiciAnsi', () => {
  it('Test 1: pulisce un messaggio reale con escape ANSI, la frase resta leggibile', () => {
    const pulito = rimuoviCodiciAnsi(MESSAGGIO_REALE);
    expect(pulito).not.toContain('\u001b[');
    expect(pulito).toContain('Error: expect(locator).toBeVisible() failed');
    expect(pulito).toContain('Call log:');
  });

  it('Test 2: un testo senza escape resta identico', () => {
    const testo = 'Error: element(s) not found';
    expect(rimuoviCodiciAnsi(testo)).toBe(testo);
  });

  it('Test 3: piu\' escape in sequenza spariscono tutti', () => {
    expect(rimuoviCodiciAnsi('\u001b[2m\u001b[31mrosso scuro\u001b[39m\u001b[22m')).toBe('rosso scuro');
  });
});

describe('i percorsi assoluti non arrivano a schermo', () => {
  // La cartella di lavoro porta con se' il nome di chi usa il computer e quello
  // che il proprietario ha dato al progetto. Aprendo i dettagli tecnici in una
  // dimostrazione, finirebbero sul proiettore davanti a tutti.
  const RADICE = 'C:\\Users\\qualcuno\\Progetti\\Nome Del Committente\\repo';

  it('accorcia il percorso a cio\' che sta dentro il progetto', () => {
    const pulito = rimuoviCodiciAnsi(`Errore in ${RADICE}\\src\\steps\\x.steps.ts:42`, RADICE);
    expect(pulito).toBe('Errore in src\\steps\\x.steps.ts:42');
    expect(pulito).not.toContain('qualcuno');
    expect(pulito).not.toContain('Nome Del Committente');
  });

  it('vale anche con le barre in avanti, come le scrive Node', () => {
    const conBarre = RADICE.split('\\').join('/');
    const pulito = rimuoviCodiciAnsi(`at ${conBarre}/src/support/world.ts:140`, RADICE);
    expect(pulito).toBe('at src/support/world.ts:140');
    expect(pulito).not.toContain('Committente');
  });

  it('senza la radice toglie solo i colori, e non inventa niente', () => {
    const testo = 'at C:\\altro\\percorso\\x.ts:1';
    expect(rimuoviCodiciAnsi(testo)).toBe(testo);
  });
});
