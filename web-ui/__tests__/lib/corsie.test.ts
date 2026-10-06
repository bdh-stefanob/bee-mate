import { describe, it, expect } from 'vitest';
import {
  MASSIMO_TEST_CONTEMPORANEI,
  avvisoStessoAmbiente,
  righeDaRiagganciare,
  puoLanciare,
  puoAggiungereRiga,
} from '@/lib/corsie';

describe('avvisoStessoAmbiente: due corsie sullo stesso account', () => {
  it('una corsia sola, o due su ambienti diversi: nessun avviso', () => {
    expect(avvisoStessoAmbiente(['demo'])).toBe(false);
    expect(avvisoStessoAmbiente(['demo', 'staging'])).toBe(false);
  });

  it('due corsie sullo stesso ambiente: avviso (Q4 = b, consentite con un avviso)', () => {
    expect(avvisoStessoAmbiente(['demo', 'demo'])).toBe(true);
  });

  it('un ambiente vuoto o sconosciuto non fa scattare l\'avviso da solo', () => {
    expect(avvisoStessoAmbiente(['', ''])).toBe(false);
  });
});

describe('righeDaRiagganciare: si riaggancia solo cio\' che e\' un test in corso', () => {
  it('nessuna operazione: nessuna corsia da riagganciare', () => {
    expect(righeDaRiagganciare([])).toEqual([]);
  });

  it('prende solo i test, con id e istante di avvio, nell\'ordine ricevuto', () => {
    const avvio1 = '2026-10-06T09:00:00.000Z';
    const avvio2 = '2026-10-06T09:00:05.000Z';
    expect(
      righeDaRiagganciare([
        { id: 'test-a-1', nome: 'test', avvio: avvio1 },
        { id: 'registrazione-b-2', nome: 'registrazione', avvio: avvio2 },
        { id: 'test-c-3', nome: 'test', avvio: avvio2 },
      ])
    ).toEqual([
      { id: 'test-a-1', avviatoAlle: Date.parse(avvio1) },
      { id: 'test-c-3', avviatoAlle: Date.parse(avvio2) },
    ]);
  });

  it('un avvio illeggibile non blocca il riaggancio: l\'istante resta vuoto', () => {
    expect(righeDaRiagganciare([{ id: 'test-x-1', nome: 'test', avvio: 'non-una-data' }])).toEqual([
      { id: 'test-x-1', avviatoAlle: null },
    ]);
  });
});

describe('capienza: il tetto e\' uno e vale per la schermata e per il server', () => {
  it('il tetto e\' due', () => {
    expect(MASSIMO_TEST_CONTEMPORANEI).toBe(2);
  });

  it('si puo\' aggiungere una riga solo fino al tetto', () => {
    expect(puoAggiungereRiga(1)).toBe(true);
    expect(puoAggiungereRiga(MASSIMO_TEST_CONTEMPORANEI)).toBe(false);
  });

  it('si puo\' lanciare solo se in corso piu\' nuove non superano il tetto', () => {
    expect(puoLanciare(0, 1)).toBe(true);
    expect(puoLanciare(0, 2)).toBe(true);
    expect(puoLanciare(1, 1)).toBe(true);
    expect(puoLanciare(1, 2)).toBe(false);
    expect(puoLanciare(2, 1)).toBe(false);
  });
});
