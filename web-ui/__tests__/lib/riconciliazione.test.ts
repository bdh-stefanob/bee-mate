import { describe, it, expect } from 'vitest';
import { individuaCoppie } from '@/lib/riconciliazione';
import type { CatalogStep } from '@/lib/types';

function step(expression: string, components?: CatalogStep['components']): CatalogStep {
  return {
    expression,
    parameters: [],
    app: 'human-recharge',
    area: 'recharge',
    domain: 'human-recharge/recharge',
    status: 'wanted',
    sourceRef: `x.ts:1`,
    documented: true,
    components,
  };
}

describe('individuaCoppie', () => {
  it('il caso guida del progetto: stessa frase (a meno di maiuscole), componenti diversi -> equivoco, non doppione', () => {
    const steps = [
      step('the user click on the login button', [{ role: 'button', name: 'Sign in', page: 'AccediPage' }]),
      step('The user click on the login button', [{ role: 'link', name: 'Sign in', page: 'HomePage' }]),
    ];

    const coppie = individuaCoppie(steps);

    expect(coppie).toHaveLength(1);
    expect(coppie[0]!.motivo).toBe('testo-quasi-uguale');
    expect(coppie[0]!.stessoComponente).toBe(false);
    expect(coppie[0]!.spiegazione).toMatch(/equivoco di denominazione/);
  });

  it('stessa frase (a meno di maiuscole), stessi componenti -> doppione vero', () => {
    const steps = [
      step('the user click on the login button', [{ role: 'button', name: 'Sign in', page: 'AccediPage' }]),
      step('The user click on the login button', [{ role: 'button', name: 'Sign in', page: 'AccediPage' }]),
    ];

    const coppie = individuaCoppie(steps);

    expect(coppie).toHaveLength(1);
    expect(coppie[0]!.motivo).toBe('testo-quasi-uguale');
    expect(coppie[0]!.stessoComponente).toBe(true);
    expect(coppie[0]!.spiegazione).toMatch(/doppione/);
  });

  it('frasi diverse ma stesso componente -> segnalato come motivo "stessi-componenti"', () => {
    const steps = [
      step('the user confirms the order', [{ role: 'button', name: 'Confirm', page: 'CheckoutPage' }]),
      step('the user submits the checkout', [{ role: 'button', name: 'Confirm', page: 'CheckoutPage' }]),
    ];

    const coppie = individuaCoppie(steps);

    expect(coppie).toHaveLength(1);
    expect(coppie[0]!.motivo).toBe('stessi-componenti');
    expect(coppie[0]!.stessoComponente).toBe(true);
  });

  it('non segnala step senza nessuna relazione', () => {
    const steps = [
      step('the user land on the homepage'),
      step('the user insert the password'),
    ];
    expect(individuaCoppie(steps)).toHaveLength(0);
  });

  it('non segnala una frase quasi simile solo per un errore di battitura in un\'altra parola (dati veri del catalogo)', () => {
    const steps = [
      step('the user clcik on the recharge button', [{ role: 'link', name: 'Recharges' }]),
      step('the user click on the login button', [{ role: 'button', name: 'Sign in', page: 'AccediPage' }]),
    ];
    expect(individuaCoppie(steps)).toHaveLength(0);
  });

  it('non conta uno step vero se stesso, e non duplica la stessa coppia', () => {
    const steps = [
      step('the user click on the login button', [{ role: 'button', name: 'Sign in' }]),
      step('The user click on the login button', [{ role: 'button', name: 'Sign in' }]),
    ];
    const coppie = individuaCoppie(steps);
    expect(coppie).toHaveLength(1);
  });

  it('due frasi quasi uguali dove uno step non ha ancora componenti dichiarati: non si conclude "doppione"', () => {
    const steps = [
      step('the user click on the login button'),
      step('The user click on the login button', [{ role: 'button', name: 'Sign in' }]),
    ];
    const coppie = individuaCoppie(steps);
    expect(coppie).toHaveLength(1);
    expect(coppie[0]!.stessoComponente).toBe(false);
    expect(coppie[0]!.spiegazione).toMatch(/non si puo' concludere/);
  });
});
