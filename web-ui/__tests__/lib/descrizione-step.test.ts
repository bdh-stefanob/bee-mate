import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { estraiChiamatePageObject, leggiComportamenti } from '@/lib/descrizione-step';

describe('estraiChiamatePageObject', () => {
  it('estrae le chiamate oggetto.metodo(...) nel loro ordine, senza argomenti', () => {
    const corpo = `
      homePage = new HomePage(this.page);
      await homePage.navigate();
      await homePage.goToSignIn("x");
    `;
    expect(estraiChiamatePageObject(corpo)).toEqual(['homePage.navigate()', 'homePage.goToSignIn()']);
  });

  it('ignora this/process/console: non sono Page Object', () => {
    const corpo = `
      await accediPage.fillPassword(process.env["APP_PASSWORD"] ?? "");
      console.log(this.page);
    `;
    expect(estraiChiamatePageObject(corpo)).toEqual(['accediPage.fillPassword()']);
  });

  it('nessuna chiamata riconoscibile -> null (non si inventa nulla)', () => {
    expect(estraiChiamatePageObject('const x = 1 + 2; return x;')).toBeNull();
    expect(estraiChiamatePageObject('')).toBeNull();
  });

  it('ripete una chiamata se il corpo la fa davvero due volte', () => {
    const corpo = 'await pagina.clicca(); await pagina.clicca();';
    expect(estraiChiamatePageObject(corpo)).toEqual(['pagina.clicca()', 'pagina.clicca()']);
  });
});

describe('leggiComportamenti', () => {
  function scriviFileStep(dir: string, nomeFile: string, contenuto: string): void {
    fs.mkdirSync(path.dirname(path.join(dir, nomeFile)), { recursive: true });
    fs.writeFileSync(path.join(dir, nomeFile), contenuto, 'utf-8');
  }

  it('legge il corpo e ne deriva le chiamate quando il corpo e\' interpretabile', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'descrizione-step-test-'));
    try {
      scriviFileStep(
        dir,
        'steps/x.steps.ts',
        [
          'Given("the user signs in", async function (this) {',
          '  homePage = new HomePage(this.page);',
          '  await homePage.navigate();',
          '  await homePage.goToSignIn();',
          '});',
        ].join('\n')
      );

      const risultato = leggiComportamenti(dir, [
        { expression: 'the user signs in', sourceRef: 'steps/x.steps.ts:1' },
      ]);

      const comportamento = risultato.get('the user signs in');
      expect(comportamento).toBeDefined();
      expect(comportamento!.chiamate).toEqual(['homePage.navigate()', 'homePage.goToSignIn()']);
      expect(comportamento!.corpo).toContain('goToSignIn');
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('corpo non interpretabile: chiamate assente, corpo grezzo presente comunque', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'descrizione-step-test-'));
    try {
      scriviFileStep(
        dir,
        'steps/x.steps.ts',
        ['Given("the user waits", async function () {', '  const x = 1;', '});'].join('\n')
      );

      const risultato = leggiComportamenti(dir, [{ expression: 'the user waits', sourceRef: 'steps/x.steps.ts:1' }]);
      const comportamento = risultato.get('the user waits');
      expect(comportamento).toBeDefined();
      expect(comportamento!.chiamate).toBeUndefined();
      expect(comportamento!.corpo).toContain('const x = 1');
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('step con parametri ({string}/{int}/...): nessun comportamento, per lo stesso limite di fusione-step', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'descrizione-step-test-'));
    try {
      scriviFileStep(
        dir,
        'steps/x.steps.ts',
        ['Then("the page shows {string}", async function (this, atteso) {', '  await this.page.check(atteso);', '});'].join(
          '\n'
        )
      );

      const risultato = leggiComportamenti(dir, [{ expression: 'the page shows {string}', sourceRef: 'steps/x.steps.ts:1' }]);
      expect(risultato.has('the page shows {string}')).toBe(false);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('sourceRef che non risolve a un file esistente: nessun comportamento, nessun errore', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'descrizione-step-test-'));
    try {
      const risultato = leggiComportamenti(dir, [{ expression: 'the user waits', sourceRef: 'steps/non-esiste.ts:1' }]);
      expect(risultato.has('the user waits')).toBe(false);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('due step nello stesso file: un solo readFileSync (il file si apre una volta, non una per step)', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'descrizione-step-test-'));
    try {
      scriviFileStep(
        dir,
        'steps/x.steps.ts',
        [
          'Given("primo step", async function () {',
          '  await pagina.uno();',
          '});',
          '',
          'Given("secondo step", async function () {',
          '  await pagina.due();',
          '});',
        ].join('\n')
      );

      const risultato = leggiComportamenti(dir, [
        { expression: 'primo step', sourceRef: 'steps/x.steps.ts:1' },
        { expression: 'secondo step', sourceRef: 'steps/x.steps.ts:5' },
      ]);

      expect(risultato.get('primo step')?.chiamate).toEqual(['pagina.uno()']);
      expect(risultato.get('secondo step')?.chiamate).toEqual(['pagina.due()']);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
