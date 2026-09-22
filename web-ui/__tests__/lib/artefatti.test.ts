import { describe, it, expect } from 'vitest';
import * as path from 'path';
import { leggiTraccia, leggiPassiTest } from '@/lib/artefatti';

const FIXTURES = path.join(__dirname, '..', 'fixtures');

describe('lettura degli artefatti', () => {
  it('dalla traccia legge i passi con il nome dato dal tester', () => {
    const t = leggiTraccia(path.join(FIXTURES, 'traccia.json'));
    expect(t.passi).toEqual([
      { nome: 'the user logs in', gesti: 3, verifiche: 0 },
      { nome: 'the user opens the list', gesti: 1, verifiche: 2 },
    ]);
  });

  it('dai messaggi di Cucumber legge l\'esito di ogni passo', () => {
    const passi = leggiPassiTest(path.join(FIXTURES, 'messaggi.ndjson'));
    expect(passi.map((p) => p.esito)).toEqual(['passato', 'fallito', 'saltato']);
  });

  it('un file che non c\'e\' non fa cadere la finestra', () => {
    expect(leggiTraccia(path.join(FIXTURES, 'non-esiste.json')).passi).toEqual([]);
  });
});
