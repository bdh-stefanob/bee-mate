import { describe, it, expect } from 'vitest';
import { rigaDiComando } from '@/lib/esecuzione';

describe('elenco chiuso dei comandi', () => {
  it('rifiuta un comando che non e\' nell\'elenco', () => {
    // @ts-expect-error: e' proprio il caso che deve fallire a runtime
    expect(() => rigaDiComando('rm -rf /')).toThrow(/non e' un comando previsto/);
  });

  it('un test si lancia con le opzioni in forma nuda', () => {
    const r = rigaDiComando('test', { bersaglio: 'lavoro', vedi: true, pulito: true });
    expect(r.argomenti).toEqual([
      'ts-node', 'scripts/test-bersaglio.ts', 'lavoro', 'generati', 'vedi', 'pulito',
    ]);
  });

  it('nessuna opzione con i trattini, mai', () => {
    const tutti: Array<Parameters<typeof rigaDiComando>[0]> =
      ['diagnosi', 'sessione', 'registrazione', 'generazione', 'test', 'scansione',
        'installa-browser', 'sincronizza-regole'];
    for (const nome of tutti) {
      const r = rigaDiComando(nome, { bersaglio: 'x', manifesto: 'm.json', messaggi: 'g.ndjson' });
      expect(r.argomenti.some((a) => a.startsWith('-'))).toBe(false);
    }
  });

  it('installa-browser lancia playwright install chromium', () => {
    const r = rigaDiComando('installa-browser');
    expect(r.argomenti).toEqual(['playwright', 'install', 'chromium']);
  });

  it('sincronizza-regole lancia lo script di sync', () => {
    const r = rigaDiComando('sincronizza-regole');
    expect(r.argomenti).toEqual(['ts-node', 'scripts/sync-rules.ts']);
  });

  it('il bersaglio non puo\' iniettare argomenti', () => {
    expect(() => rigaDiComando('test', { bersaglio: 'lavoro && del *' }))
      .toThrow(/nome di bersaglio non valido/);
  });
});
