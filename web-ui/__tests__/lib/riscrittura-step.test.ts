import { describe, it, expect } from 'vitest';
import { riscriviScenario, riscriviDefinizione, haParametri, RiscritturaNonSupportata } from '@/lib/riscrittura-step';

describe('riscriviScenario', () => {
  it('riscrive la frase su una riga When, preservando indentazione e fine riga', () => {
    const testo = 'Feature: x\n\n  Scenario: y\n    When The user click on the login button\n    Then altro\n';
    const { testo: dopo, sostituzioni } = riscriviScenario(
      testo,
      'The user click on the login button',
      'the user clicks the Sign in link'
    );
    expect(sostituzioni).toBe(1);
    expect(dopo).toBe('Feature: x\n\n  Scenario: y\n    When the user clicks the Sign in link\n    Then altro\n');
  });

  it('riscrive tutte le occorrenze, anche con parole chiave diverse (And/Given/Then)', () => {
    const testo = 'Given x\nAnd x\nThen y\n';
    const { testo: dopo, sostituzioni } = riscriviScenario(testo, 'x', 'z');
    expect(sostituzioni).toBe(2);
    expect(dopo).toBe('Given z\nAnd z\nThen y\n');
  });

  it('non tocca righe che non corrispondono esattamente alla frase', () => {
    const testo = 'When x extra\nWhen x\n';
    const { testo: dopo, sostituzioni } = riscriviScenario(testo, 'x', 'z');
    expect(sostituzioni).toBe(1);
    expect(dopo).toBe('When x extra\nWhen z\n');
  });

  it('conserva il CRLF quando il file lo usa', () => {
    const testo = 'When x\r\nThen y\r\n';
    const { testo: dopo } = riscriviScenario(testo, 'x', 'z');
    expect(dopo).toBe('When z\r\nThen y\r\n');
  });

  it('nessuna occorrenza: il testo torna identico, zero sostituzioni', () => {
    const testo = 'When altro\n';
    const { testo: dopo, sostituzioni } = riscriviScenario(testo, 'x', 'z');
    expect(sostituzioni).toBe(0);
    expect(dopo).toBe(testo);
  });

  it('rifiuta una frase con un parametro', () => {
    expect(() => riscriviScenario('When x\n', 'the page shows {string}', 'z')).toThrow(RiscritturaNonSupportata);
    expect(() => riscriviScenario('When x\n', 'x', 'the page shows {string}')).toThrow(RiscritturaNonSupportata);
  });
});

describe('riscriviDefinizione', () => {
  it('riscrive la chiamata When(...) e la riga @intent, preservando le virgolette', () => {
    const testo = [
      '/**',
      ' * @intent  The user click on the login button',
      ' * @page    HomePage',
      ' */',
      'When("The user click on the login button", async function (this: CustomWorld) {',
      '  await homePage.goToSignIn();',
      '});',
      '',
    ].join('\n');

    const { testo: dopo, sostituzioni } = riscriviDefinizione(
      testo,
      'The user click on the login button',
      'the user clicks the Sign in link'
    );

    expect(sostituzioni).toBe(1);
    expect(dopo).toContain('@intent  the user clicks the Sign in link');
    expect(dopo).toContain('When("the user clicks the Sign in link", async function');
  });

  it('conta zero sostituzioni se la frase non compare nella chiamata Given/When/Then', () => {
    const testo = 'When("altra frase", async function () {});\n';
    const { sostituzioni } = riscriviDefinizione(testo, 'x', 'z');
    expect(sostituzioni).toBe(0);
  });

  it('conta piu\' di una sostituzione se la stessa frase e\' definita due volte nel file', () => {
    const testo = 'When("x", async () => {});\nGiven("x", async () => {});\n';
    const { sostituzioni } = riscriviDefinizione(testo, 'x', 'z');
    expect(sostituzioni).toBe(2);
  });

  it('rifiuta una frase con un parametro', () => {
    expect(() => riscriviDefinizione('When("x", () => {});', 'x', 'the page shows {string}')).toThrow(
      RiscritturaNonSupportata
    );
  });
});

describe('haParametri', () => {
  it('riconosce i segnaposto noti', () => {
    expect(haParametri('the page shows {string}')).toBe(true);
    expect(haParametri('waits {int} seconds')).toBe(true);
    expect(haParametri('the user land on the homepage')).toBe(false);
  });
});
