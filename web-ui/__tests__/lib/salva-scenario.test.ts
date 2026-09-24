import { describe, it, expect, afterEach } from 'vitest';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { salvaScenario, cartelleDalCatalogo, nomeFile } from '@/lib/salva-scenario';

const GENERATO = `# generato-da: bdd-generate · rigenerabile
# src/features/generated/demo-2026.feature
#
# Derivato dalla sessione manuale registrata

@generato @da-rivedere
Feature: demo 2026 — sessione registrata

  Scenario: demo 2026 — sessione registrata
    Given I open a new order
    Then the page shows "Confirmed"
`;

let radice: string | null = null;
afterEach(() => {
  if (radice) fs.rmSync(radice, { recursive: true, force: true });
  radice = null;
});

function albero(files: Record<string, string>): string {
  radice = fs.mkdtempSync(path.join(os.tmpdir(), 'salva-'));
  for (const [rel, testo] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(radice, rel)), { recursive: true });
    fs.writeFileSync(path.join(radice, rel), testo);
  }
  return radice;
}

const leggi = (rel: string) => fs.readFileSync(path.join(radice!, rel), 'utf-8');
const esiste = (rel: string) => fs.existsSync(path.join(radice!, rel));

describe('salvaScenario', () => {
  it('sposta il file nel suo posto, con i tag di applicazione e flusso e il titolo scelto', () => {
    const r = albero({ 'generated/demo-2026.feature': GENERATO });
    const esito = salvaScenario(r, 'generated/demo-2026.feature', {
      app: 'shop', flusso: 'orders', titolo: 'New order is confirmed',
    });
    expect(esito).toEqual({ file: 'shop/orders/new-order-is-confirmed.feature', sovrascritto: false, rinominato: false });
    expect(esiste('generated/demo-2026.feature')).toBe(false);
    const testo = leggi('shop/orders/new-order-is-confirmed.feature');
    expect(testo).toContain('@shop @orders @generato @da-rivedere\nFeature: New order is confirmed');
    expect(testo).toContain('  Scenario: New order is confirmed\n');
    expect(testo).toContain('# src/features/shop/orders/new-order-is-confirmed.feature');
    expect(testo).not.toContain('features/generated/');
    // Il marcatore resta: finche' nessuno lo tocca a mano, si puo' rigenerare.
    expect(testo).toContain('generato-da: bdd-generate');
    // I passi non si toccano.
    expect(testo).toContain('    Given I open a new order\n    Then the page shows "Confirmed"');
  });

  it('sovrascrive un file che porta ancora il marcatore di generazione', () => {
    const r = albero({
      'generated/demo-2026.feature': GENERATO,
      'shop/orders/new-order.feature': GENERATO.replace('I open', 'I opened'),
    });
    const esito = salvaScenario(r, 'generated/demo-2026.feature', { app: 'shop', flusso: 'orders', titolo: 'New order' });
    expect(esito).toEqual({ file: 'shop/orders/new-order.feature', sovrascritto: true, rinominato: false });
    expect(leggi('shop/orders/new-order.feature')).toContain('I open a new order');
  });

  it('non tocca un file modificato a mano: ne crea uno nuovo accanto', () => {
    const aMano = 'Feature: scritto a mano\n  Scenario: x\n';
    const r = albero({ 'generated/demo-2026.feature': GENERATO, 'shop/orders/new-order.feature': aMano });
    const esito = salvaScenario(r, 'generated/demo-2026.feature', { app: 'shop', flusso: 'orders', titolo: 'New order' });
    expect(esito).toEqual({ file: 'shop/orders/new-order-2.feature', sovrascritto: false, rinominato: true });
    expect(leggi('shop/orders/new-order.feature')).toBe(aMano);
  });

  it('uno scenario rinominato a mano tiene il suo nome', () => {
    const r = albero({ 'generated/y.feature': GENERATO.replace('  Scenario: demo 2026 — sessione registrata', '  Scenario: nome mio') });
    salvaScenario(r, 'generated/y.feature', { app: 'shop', flusso: 'orders', titolo: 'Y' });
    expect(leggi('shop/orders/y.feature')).toContain('  Scenario: nome mio\n');
  });

  it('i tag non si ripetono se ci sono gia\'', () => {
    const r = albero({ 'generated/x.feature': GENERATO.replace('@generato @da-rivedere', '@shop @generato') });
    salvaScenario(r, 'generated/x.feature', { app: 'shop', flusso: 'orders', titolo: 'X' });
    expect(leggi('shop/orders/x.feature')).toContain('@orders @shop @generato\nFeature: X');
  });

  it('accetta solo un file registrato, che porta il marcatore', () => {
    const r = albero({
      'generated/senza-marcatore.feature': 'Feature: a\n  Scenario: b\n',
      'shop/orders/altro.feature': GENERATO,
    });
    const scelta = { app: 'shop', flusso: 'orders', titolo: 'T' };
    expect(() => salvaScenario(r, 'generated/senza-marcatore.feature', scelta)).toThrow(/non e' uno scenario registrato/);
    expect(() => salvaScenario(r, 'shop/orders/altro.feature', scelta)).toThrow(/non e' uno scenario registrato/);
    expect(() => salvaScenario(r, 'generated/../shop/orders/altro.feature', scelta)).toThrow(/non e' uno scenario registrato/);
    expect(() => salvaScenario(r, 'generated/manca.feature', scelta)).toThrow(/non trovo/);
  });

  it('applicazione e flusso sono nomi di cartella, non percorsi', () => {
    const r = albero({ 'generated/x.feature': GENERATO });
    for (const [app, flusso] of [['../x', 'a'], ['a', 'b/c'], ['A B', 'c'], ['', 'c'], ['generated', 'c'], ['a', '']]) {
      expect(() => salvaScenario(r, 'generated/x.feature', { app, flusso, titolo: 'T' }), `${app}/${flusso}`)
        .toThrow(/non valid/);
    }
    expect(esiste('generated/x.feature')).toBe(true);
  });

  it('il titolo e\' una riga sola e non vuota', () => {
    const r = albero({ 'generated/x.feature': GENERATO });
    for (const titolo of ['', '   ', 'a\nFeature: b', '!!!']) {
      expect(() => salvaScenario(r, 'generated/x.feature', { app: 'a', flusso: 'b', titolo }), JSON.stringify(titolo))
        .toThrow(/titolo non valido/);
    }
  });
});

describe('nomeFile', () => {
  it('dal titolo al nome del file', () => {
    expect(nomeFile('New order is confirmed!')).toBe('new-order-is-confirmed');
    expect(nomeFile('  Àccesso   con SMS ')).toBe('accesso-con-sms');
  });
});

describe('cartelleDalCatalogo', () => {
  it('applicazioni e aree del catalogo, senza la cartella dei registrati', () => {
    const c = cartelleDalCatalogo([
      { app: 'shop', area: 'orders' }, { app: 'shop', area: 'cart' }, { app: 'shop', area: 'orders' },
      { app: 'generated', area: 'generated' }, { app: 'auth', area: 'auth' }, {},
    ]);
    expect(c).toEqual([
      { app: 'auth', flussi: ['auth'] },
      { app: 'shop', flussi: ['cart', 'orders'] },
    ]);
  });
});
