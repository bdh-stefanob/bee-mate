import { describe, it, expect } from 'vitest';
import { percorsoScenario } from '@/lib/percorso-scenario';

describe('percorsoScenario', () => {
  it('app/flusso/nome.feature', () => {
    expect(percorsoScenario('shop/orders/checkout.feature')).toEqual({ app: 'shop', flusso: 'orders' });
  });
  it('generated/x.feature: nessun flusso', () => {
    expect(percorsoScenario('generated/x.feature')).toEqual({ app: 'generated', flusso: '—' });
  });
  it('senza cartelle: entrambi trattino', () => {
    expect(percorsoScenario('x.feature')).toEqual({ app: '—', flusso: '—' });
  });
  it('separatore di Windows: stesso risultato', () => {
    expect(percorsoScenario('shop\\orders\\checkout.feature')).toEqual({ app: 'shop', flusso: 'orders' });
  });
});
