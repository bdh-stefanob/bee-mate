import { describe, it, expect } from 'vitest';
import { indirizzoProva } from '@/lib/percorso-esecuzione';
import { idProvaValido } from '@/lib/prova-conclusa';

describe('indirizzoProva', () => {
  it('porta a Esecuzione con la prova', () => {
    expect(indirizzoProva('test-muo7kv2k')).toBe('/esecuzione?prova=test-muo7kv2k');
  });

  it('un id che il server rifiuterebbe non diventa un indirizzo', () => {
    expect(indirizzoProva('../x')).toBeNull();
    expect(indirizzoProva('')).toBeNull();
    expect(indirizzoProva('Test-A')).toBeNull();
  });

  it('client e server usano la stessa regola', () => {
    for (const id of ['test-a1', 'a/b', 'a.b', 'x'.repeat(81), 'ok-1', 'UP']) {
      expect(indirizzoProva(id) !== null).toBe(idProvaValido(id));
    }
  });
});
