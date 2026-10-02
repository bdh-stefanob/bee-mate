import { describe, expect, it } from 'vitest';
import { senzaPercorsi } from '@/lib/senza-percorsi';

const INTESTAZIONE = [
  '# generato-da: bdd-generate · rigenerabile',
  '# src/features/clinic/weight-loss/a-user-complete-an-order-in-weight-loss.feature',
  '#',
  '# Derivato dalla sessione manuale registrata il 2026-10-01T13:46:03.109Z',
  '# (reports\\recordings\\qa-clinic.lemonaidhealth.co.uk-2026-10-01T13-46-03-103Z.json, 356s, 16 intenti dichiarati dal tester).',
  '',
  'Feature: Ordine',
].join('\n');

describe('senzaPercorsi', () => {
  it('toglie dai commenti i percorsi dei file, in entrambe le scritture', () => {
    const fuori = senzaPercorsi(INTESTAZIONE);
    expect(fuori).not.toMatch(/reports/);
    expect(fuori).not.toMatch(/recordings/);
    expect(fuori).not.toMatch(/\.json/);
    expect(fuori).not.toMatch(/src\/features/);
    expect(fuori).not.toMatch(/\.feature/);
  });

  it('non cambia il numero di righe: i numeri di riga dello scenario restano quelli del file', () => {
    expect(senzaPercorsi(INTESTAZIONE).split('\n')).toHaveLength(INTESTAZIONE.split('\n').length);
  });

  it('della riga con la registrazione resta il resto della frase, senza virgole orfane', () => {
    const riga = senzaPercorsi(INTESTAZIONE).split('\n')[4];
    expect(riga).toBe('# (356s, 16 intenti dichiarati dal tester).');
  });

  it('una riga che era solo un percorso diventa un commento vuoto', () => {
    expect(senzaPercorsi(INTESTAZIONE).split('\n')[1]).toBe('#');
  });

  it('non tocca i passi e i titoli, nemmeno se parlano di percorsi', () => {
    const testo = 'Feature: Sposta src/x\n  Scenario: apre reports/ok\n    When the user opens "src/features/a.feature"';
    expect(senzaPercorsi(testo)).toBe(testo);
  });

  it('un testo senza percorsi resta identico', () => {
    const testo = '# una nota qualunque\nFeature: A\n  Scenario: B\n    Given x';
    expect(senzaPercorsi(testo)).toBe(testo);
  });

  it('tiene i ritorni a capo di Windows', () => {
    expect(senzaPercorsi('# src/features/a.feature\r\nFeature: A')).toBe('#\r\nFeature: A');
  });
});
