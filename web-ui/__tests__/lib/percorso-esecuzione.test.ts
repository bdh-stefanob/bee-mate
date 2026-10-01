import { describe, it, expect } from 'vitest';
import { percorsoDiEsecuzione, SCENARIO_VALIDO, indirizzoEsecuzione } from '@/lib/percorso-esecuzione';
import { rigaDiComando } from '@/lib/esecuzione';

describe('percorsoDiEsecuzione: il percorso che Esecuzione accetta, o null', () => {
  it('file e riga danno src/features/<file>:<riga>', () => {
    expect(percorsoDiEsecuzione('shop/order/completa-ordine.feature', 12)).toBe('src/features/shop/order/completa-ordine.feature:12');
  });

  it('quello che costruisce passa la validazione vera del server', () => {
    // Un percorso accettato qui e rifiutato li' vorrebbe dire un pulsante
    // Esegui che porta a una scelta che il lancio poi rifiuta.
    const p = percorsoDiEsecuzione('shop/order/completa-ordine.feature', 12);
    expect(() => rigaDiComando('test', { bersaglio: 'demo', scenario: p ?? '' })).not.toThrow();
  });

  it('un nome con caratteri che l\'esecuzione non accetta da\' null', () => {
    expect(percorsoDiEsecuzione('shop/un file con spazi.feature', 3)).toBeNull();
    expect(percorsoDiEsecuzione('shop/a&b.feature', 3)).toBeNull();
    expect(percorsoDiEsecuzione("shop/l'ordine.feature", 3)).toBeNull();
  });

  it('un percorso che esce dalla cartella o con barre doppie da\' null', () => {
    expect(percorsoDiEsecuzione('../fuori.feature', 3)).toBeNull();
    expect(percorsoDiEsecuzione('shop/../x.feature', 3)).toBeNull();
    expect(percorsoDiEsecuzione('shop//x.feature', 3)).toBeNull();
    expect(percorsoDiEsecuzione('/assoluto.feature', 3)).toBeNull();
  });

  it('una riga che non e\' un intero positivo da\' null', () => {
    expect(percorsoDiEsecuzione('a/b.feature', 0)).toBeNull();
    expect(percorsoDiEsecuzione('a/b.feature', -1)).toBeNull();
    expect(percorsoDiEsecuzione('a/b.feature', 1.5)).toBeNull();
    expect(percorsoDiEsecuzione('a/b.feature', Number.NaN)).toBeNull();
  });

  it('un file che non e\' un .feature da\' null', () => {
    expect(percorsoDiEsecuzione('a/b.txt', 3)).toBeNull();
  });
});

describe('indirizzoEsecuzione', () => {
  it('porta a Esecuzione con lo scenario preselezionato (non avvia: O3)', () => {
    expect(indirizzoEsecuzione('shop/order/completa-ordine.feature', 12)).toBe(
      '/esecuzione?scenario=' + encodeURIComponent('src/features/shop/order/completa-ordine.feature:12')
    );
  });

  it('null se il nome non e\' accettabile', () => {
    expect(indirizzoEsecuzione('shop/un file.feature', 12)).toBeNull();
  });
});

describe('SCENARIO_VALIDO', () => {
  it('e\' una sola regola, quella che Esecuzione usa', () => {
    expect(SCENARIO_VALIDO.test('src/features/a/b.feature:3')).toBe(true);
    expect(SCENARIO_VALIDO.test('src/features/a/b.feature')).toBe(true);
    expect(SCENARIO_VALIDO.test('src/features/a/b.feature:0')).toBe(false);
  });
});
