import { describe, it, expect } from 'vitest';
import {
  estraiDefinizione,
  rimuoviDefinizione,
  corpiEquivalenti,
  FusioneNonSupportata,
} from '@/lib/fusione-step';
import { treStepStessoComponente } from '../fixtures/catalogo';

describe('estraiDefinizione', () => {
  it('legge il corpo di una definizione presente una sola volta', () => {
    const testo = [
      '/**',
      ' * @intent  the user open the recharge tab',
      ' */',
      'When("the user open the recharge tab", async function (this: CustomWorld) {',
      '  appPage = new AppPage(this.page);',
      '  await appPage.goToRecharges();',
      '});',
      '',
    ].join('\n');
    const def = estraiDefinizione(testo, 'the user open the recharge tab');
    expect(def.trovate).toBe(1);
    expect(def.corpoFunzione).toContain('appPage.goToRecharges()');
  });

  it('zero occorrenze: trovate 0, nessun corpo', () => {
    const def = estraiDefinizione('When("altro", () => {});\n', 'x');
    expect(def.trovate).toBe(0);
    expect(def.corpoFunzione).toBeUndefined();
  });

  it('piu\' occorrenze: ambiguo, nessun corpo', () => {
    const testo = 'When("x", () => {});\nGiven("x", () => {});\n';
    const def = estraiDefinizione(testo, 'x');
    expect(def.trovate).toBe(2);
    expect(def.corpoFunzione).toBeUndefined();
  });

  it('rifiuta una frase con parametro', () => {
    expect(() => estraiDefinizione('When("x", () => {});', 'the page shows {string}')).toThrow(
      FusioneNonSupportata
    );
  });
});

describe('rimuoviDefinizione', () => {
  it('toglie la chiamata e il suo commento @intent, senza lasciare doppie righe vuote', () => {
    const testo = [
      'import { When } from "@cucumber/cucumber";',
      '',
      '/**',
      ' * @intent  the user land on the homepage',
      ' */',
      'When("the user land on the homepage", async function (this: CustomWorld) {',
      '  appPage = new AppPage(this.page);',
      '});',
      '',
      '/**',
      ' * @intent  the user clcik on the recharge button',
      ' */',
      'When("the user clcik on the recharge button", async function (this: CustomWorld) {',
      '  await appPage.goToRecharges();',
      '});',
      '',
      '/**',
      ' * @intent  altro step',
      ' */',
      'When("altro step", async function () {});',
      '',
    ].join('\n');

    const { testo: dopo, rimosse, corpoFunzione } = rimuoviDefinizione(
      testo,
      'the user clcik on the recharge button'
    );

    expect(rimosse).toBe(1);
    expect(corpoFunzione).toContain('appPage.goToRecharges()');
    expect(dopo).not.toContain('the user clcik on the recharge button');
    expect(dopo).not.toContain('@intent  the user clcik on the recharge button');
    expect(dopo).toContain('the user land on the homepage');
    expect(dopo).toContain('altro step');
    expect(dopo).not.toMatch(/\n{3,}/);
  });

  it('non modifica il testo se la frase non compare', () => {
    const testo = 'When("altro", async () => {});\n';
    const { testo: dopo, rimosse } = rimuoviDefinizione(testo, 'x');
    expect(rimosse).toBe(0);
    expect(dopo).toBe(testo);
  });

  it('non modifica il testo se la frase compare piu\' di una volta (ambiguo)', () => {
    const testo = 'When("x", async () => {});\nGiven("x", async () => {});\n';
    const { testo: dopo, rimosse } = rimuoviDefinizione(testo, 'x');
    expect(rimosse).toBe(2);
    expect(dopo).toBe(testo);
  });

  it('preserva il CRLF quando il file lo usa', () => {
    const testo = ['When("x", async () => {', '  fai();', '});', 'When("y", async () => {});', ''].join(
      '\r\n'
    );
    const { testo: dopo, rimosse } = rimuoviDefinizione(testo, 'x');
    expect(rimosse).toBe(1);
    expect(dopo).toContain('\r\n');
    expect(dopo).not.toContain('\n\n'.replace('\r', ''));
    expect(dopo).toBe('When("y", async () => {});\r\n');
  });

  it('rifiuta una frase con parametro', () => {
    expect(() => rimuoviDefinizione('When("x {string}", () => {});', 'x {string}')).toThrow(
      FusioneNonSupportata
    );
  });

  it('non spezza il conteggio delle graffe per una graffa dentro una stringa nel corpo', () => {
    const testo = [
      'When("x", async function () {',
      '  const messaggio = "attenzione: { non e\' una graffa di blocco }";',
      '  fai(messaggio);',
      '});',
      'When("y", async () => {});',
      '',
    ].join('\n');
    const { rimosse, corpoFunzione } = rimuoviDefinizione(testo, 'x');
    expect(rimosse).toBe(1);
    expect(corpoFunzione).toContain('fai(messaggio)');
  });
});

describe('fusione ripetuta (tre step sullo stesso componente)', () => {
  // Situazione mai esercitata prima, ne' con dati veri ne' sintetici: tre
  // frasi diverse ancorate allo stesso componente (vedi
  // __tests__/fixtures/catalogo/fusione-ripetuta.ts), fuse una dopo l'altra
  // fino a restarne una sola. `fondi/route.ts` fa esattamente questo, una
  // coppia alla volta: qui si prova che la catena di due fusioni funziona.
  const [primo, secondo, terzo] = treStepStessoComponente.map((s) => s.expression);

  function glueDiTre(): string {
    return [
      'import { When } from "@cucumber/cucumber";',
      '',
      `When("${primo}", async function (this: CustomWorld) {`,
      '  await appPage.apriMenu();',
      '});',
      '',
      `When("${secondo}", async function (this: CustomWorld) {`,
      '  await appPage.apriMenu();',
      '});',
      '',
      `When("${terzo}", async function (this: CustomWorld) {`,
      '  await appPage.apriMenu();',
      '});',
      '',
    ].join('\n');
  }

  it('i corpi dei tre step sono equivalenti fra loro (stesso comportamento, ancorati allo stesso componente)', () => {
    const testo = glueDiTre();
    const corpoUno = estraiDefinizione(testo, primo).corpoFunzione!;
    const corpoDue = estraiDefinizione(testo, secondo).corpoFunzione!;
    const corpoTre = estraiDefinizione(testo, terzo).corpoFunzione!;
    expect(corpiEquivalenti(corpoUno, corpoDue)).toBe(true);
    expect(corpiEquivalenti(corpoUno, corpoTre)).toBe(true);
  });

  it('due fusioni in sequenza portano da tre definizioni a una sola', () => {
    let testo = glueDiTre();

    // Prima fusione: il secondo step sparisce, il primo resta.
    const dopoPrima = rimuoviDefinizione(testo, secondo);
    expect(dopoPrima.rimosse).toBe(1);
    testo = dopoPrima.testo;
    expect(testo).toContain(primo);
    expect(testo).not.toContain(secondo);
    expect(testo).toContain(terzo);

    // Seconda fusione: anche il terzo sparisce. Resta solo il primo.
    const dopoSeconda = rimuoviDefinizione(testo, terzo);
    expect(dopoSeconda.rimosse).toBe(1);
    testo = dopoSeconda.testo;
    expect(testo).toContain(primo);
    expect(testo).not.toContain(secondo);
    expect(testo).not.toContain(terzo);
  });
});

describe('corpiEquivalenti', () => {
  it('due corpi scritti diversamente ma uguali dopo aver tolto spazi e commenti', () => {
    const a = '\n  await appPage.goToRecharges();\n';
    const b = '// naviga\nawait appPage.goToRecharges();';
    expect(corpiEquivalenti(a, b)).toBe(true);
  });

  it('due corpi con un\'istruzione in piu\' non sono equivalenti (il caso vero del catalogo)', () => {
    const a = 'appPage = new AppPage(this.page);\nawait appPage.assertLoaded();\nawait appPage.goToRecharges();';
    const b = 'await appPage.goToRecharges();';
    expect(corpiEquivalenti(a, b)).toBe(false);
  });
});
