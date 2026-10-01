import { describe, it, expect } from 'vitest';
import { getFeatureTags, setFeatureTags } from '@/lib/feature-tags';

/** Quante righe di tag (che iniziano con @) ci sono prima di `Feature:`. */
function righeDiTag(testo: string): string[] {
  const righe = testo.split('\n');
  const iFeature = righe.findIndex(r => /^\s*Feature:/.test(r));
  return righe.slice(0, iFeature).filter(r => r.trim().startsWith('@'));
}

// Cio' che scrive il salvataggio dal cruscotto: intestazione con il marcatore,
// riga dei tag subito sopra Feature (app, flusso, poi i tag del generatore).
const SALVATO =
  '# generato-da: bdd-generate · rigenerabile\n' +
  '# src/features/shop/orders/pay.feature\n' +
  '\n' +
  '@shop @orders @generato @da-rivedere\n' +
  'Feature: Pay\n' +
  '  Scenario: Pay\n' +
  '    Given x\n';

describe('setFeatureTags — caratterizzazione di cio\' che il codice faceva (difetto (c) della spec)', () => {
  it('file salvato dal cruscotto (commento in testa): una sola riga di tag, @generato resta, il flusso cambia', () => {
    const dopo = setFeatureTags(SALVATO, 'shop', 'checkout');
    expect(righeDiTag(dopo)).toEqual(['@shop @checkout @generato @da-rivedere']);
  });

  it('file con i tag in prima riga: @non-automatizzato si conserva', () => {
    const doc = '@shop @orders @non-automatizzato\nFeature: Doc\n  Scenario: x\n';
    const dopo = setFeatureTags(doc, 'shop', 'checkout');
    expect(righeDiTag(dopo)).toEqual(['@shop @checkout @non-automatizzato']);
  });

  it('file con i tag in prima riga: @generato si conserva', () => {
    const f = '@shop @orders @generato\nFeature: F\n  Scenario: x\n';
    expect(righeDiTag(setFeatureTags(f, 'shop', 'checkout'))).toEqual(['@shop @checkout @generato']);
  });

  it('un tag di ticket e altri tag liberi si conservano', () => {
    const f = '@shop @orders @ticket:ABC-12 @smoke\nFeature: F\n  Scenario: x\n';
    expect(righeDiTag(setFeatureTags(f, 'shop', 'checkout'))).toEqual(['@shop @checkout @ticket:ABC-12 @smoke']);
  });

  it('con solo tag riservati sopra Feature, app e flusso si aggiungono davanti (non li sostituiscono)', () => {
    const f = '@generato @da-rivedere\nFeature: F\n  Scenario: x\n';
    expect(righeDiTag(setFeatureTags(f, 'shop', 'orders'))).toEqual(['@shop @orders @generato @da-rivedere']);
  });

  it('i commenti fra i tag e Feature: (marcatori di pagina) non nascondono la riga dei tag', () => {
    const f = '@shop @orders @generato\n# #CHECKOUT\nFeature: F\n  Scenario: x\n';
    expect(setFeatureTags(f, 'shop', 'checkout')).toBe('@shop @checkout @generato\n# #CHECKOUT\nFeature: F\n  Scenario: x\n');
    expect(getFeatureTags(f)).toEqual({ app: 'shop', flow: 'orders' });
  });

  it('i tag di uno scenario (dopo Feature:) non sono i tag del file', () => {
    const f = 'Feature: F\n  @smoke\n  Scenario: x\n';
    expect(getFeatureTags(f)).toEqual({ app: null, flow: null });
    expect(setFeatureTags(f, 'shop', 'orders')).toBe('@shop @orders\n\nFeature: F\n  @smoke\n  Scenario: x\n');
  });

  it('con fine riga CRLF mantiene CRLF sulla riga dei tag', () => {
    const f = '@shop @orders @generato\r\nFeature: F\r\n';
    expect(setFeatureTags(f, 'shop', 'checkout')).toBe('@shop @checkout @generato\r\nFeature: F\r\n');
  });

  it('senza nessuna riga di tag: ne inserisce una sopra Feature', () => {
    const f = 'Feature: F\n  Scenario: x\n';
    expect(setFeatureTags(f, 'shop', 'orders')).toBe('@shop @orders\n\nFeature: F\n  Scenario: x\n');
  });

  it('e\' idempotente: applicare due volte lo stesso app/flusso non cambia niente', () => {
    const una = setFeatureTags(SALVATO, 'shop', 'checkout');
    expect(setFeatureTags(una, 'shop', 'checkout')).toBe(una);
  });

  it('non tocca il resto del file (commento di testa, passi, fine riga)', () => {
    const dopo = setFeatureTags(SALVATO, 'shop', 'checkout');
    expect(dopo.replace('@shop @checkout', '@shop @orders')).toBe(SALVATO);
  });
});

describe('getFeatureTags', () => {
  it('legge app e flusso dalla riga dei tag, anche con commenti in testa', () => {
    expect(getFeatureTags(SALVATO)).toEqual({ app: 'shop', flow: 'orders' });
  });

  it('i tag riservati non sono ne\' app ne\' flusso', () => {
    expect(getFeatureTags('@generato @da-rivedere\nFeature: F\n')).toEqual({ app: null, flow: null });
    expect(getFeatureTags('@non-automatizzato @shop\nFeature: F\n')).toEqual({ app: 'shop', flow: null });
  });

  it('senza tag: null', () => {
    expect(getFeatureTags('Feature: F\n')).toEqual({ app: null, flow: null });
  });
});
