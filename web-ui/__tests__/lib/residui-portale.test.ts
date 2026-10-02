import { describe, it, expect } from 'vitest';
import { CHIAVI_RESIDUI_PORTALE, ripulisciResiduiPortale } from '@/lib/residui-portale';

/** Un finto `Storage`: solo cio' che serve alla pulizia. */
function archivioFinto(iniziale: Record<string, string>) {
  const dati = new Map(Object.entries(iniziale));
  return {
    dati,
    getItem: (k: string) => dati.get(k) ?? null,
    removeItem: (k: string) => void dati.delete(k),
  };
}

describe('ripulisciResiduiPortale', () => {
  it('toglie il token GitHub e le bozze del vecchio portale, e solo quelli', () => {
    const a = archivioFinto({
      'bdd-scaffold-settings': '{"githubToken":"segreto"}',
      'gsd-editor-tabs': '[]',
      'gsd-editor-active-tab': 'x',
      'gsd-editor-incoming': '{}',
      'gsd-editor-draft': 'Feature: x',
      'gsd-editor-sidebar': 'true',
      theme: 'dark',
      'bdd-cruscotto-ultima-scheda': 'step',
    });
    const tolte = ripulisciResiduiPortale(a);
    expect([...a.dati.keys()].sort()).toEqual(['bdd-cruscotto-ultima-scheda', 'theme'].sort());
    expect(tolte).toBe(6);
  });

  it('elenca esattamente le sei chiavi del portale', () => {
    expect([...CHIAVI_RESIDUI_PORTALE].sort()).toEqual(
      [
        'bdd-scaffold-settings',
        'gsd-editor-active-tab',
        'gsd-editor-draft',
        'gsd-editor-incoming',
        'gsd-editor-sidebar',
        'gsd-editor-tabs',
      ].sort(),
    );
  });

  it('non fa nulla se non c\'e\' niente da togliere', () => {
    expect(ripulisciResiduiPortale(archivioFinto({ theme: 'light' }))).toBe(0);
  });

  it('archivio assente: nessun errore', () => {
    expect(ripulisciResiduiPortale(null)).toBe(0);
  });

  it('archivio che lancia (dati bloccati): nessun errore', () => {
    const rotto = {
      getItem: () => {
        throw new Error('SecurityError');
      },
      removeItem: () => {
        throw new Error('SecurityError');
      },
    };
    expect(() => ripulisciResiduiPortale(rotto)).not.toThrow();
  });

  it('se una chiave non si riesce a togliere prosegue con le altre', () => {
    const dati = new Map([
      ['bdd-scaffold-settings', 'x'],
      ['gsd-editor-tabs', 'y'],
    ]);
    const a = {
      getItem: (k: string) => dati.get(k) ?? null,
      removeItem: (k: string) => {
        if (k === 'bdd-scaffold-settings') throw new Error('no');
        dati.delete(k);
      },
    };
    ripulisciResiduiPortale(a);
    expect(dati.has('gsd-editor-tabs')).toBe(false);
  });
});
