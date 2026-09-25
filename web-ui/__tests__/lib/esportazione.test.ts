import { describe, it, expect } from 'vitest';
import { fileDiDefinizioneUsati, importPagineUsate, costruisciEsportazione } from '@/lib/esportazione';
import type { CatalogStep } from '@/lib/types';

function step(expression: string, sourceRef: string): CatalogStep {
  return {
    expression,
    parameters: [],
    app: 'a',
    area: 'a',
    domain: 'a',
    status: 'implemented',
    sourceRef,
    documented: true,
  };
}

describe('fileDiDefinizioneUsati', () => {
  it('elenca i file di definizione usati, senza doppioni, nell\'ordine dei passi', () => {
    const feature = [
      'Feature: x',
      '  Scenario: y',
      '    Given the user land on the homepage',
      '    When the user insert the password',
      '    Then the user land on the homepage',
    ].join('\n');

    const steps = [
      step('the user land on the homepage', 'src\\steps\\a.steps.ts:10'),
      step('the user insert the password', 'src\\steps\\b.steps.ts:20'),
    ];

    expect(fileDiDefinizioneUsati(feature, steps)).toEqual([
      'src\\steps\\a.steps.ts:10',
      'src\\steps\\b.steps.ts:20',
    ]);
  });

  it('un passo senza step corrispondente nel catalogo non contribuisce (non e\' un errore)', () => {
    const feature = 'Given passo mai catalogato\n';
    expect(fileDiDefinizioneUsati(feature, [])).toEqual([]);
  });

  it('due step diversi definiti nello stesso file (righe diverse) contano come un solo file, non due', () => {
    const feature = [
      'Feature: x',
      '  Scenario: y',
      '    Given uno',
      '    When due',
    ].join('\n');
    const steps = [step('uno', 'src\\steps\\a.steps.ts:10'), step('due', 'src\\steps\\a.steps.ts:40')];

    expect(fileDiDefinizioneUsati(feature, steps)).toEqual(['src\\steps\\a.steps.ts:10']);
  });
});

describe('importPagineUsate', () => {
  it('trova solo gli import che vengono da /pages/', () => {
    const testo = [
      `import { Given } from "@cucumber/cucumber";`,
      `import { AccediPage } from "../../../pages/human-recharge/accedi.page";`,
      `import { HomePage } from '../../../pages/human-recharge/home.page';`,
    ].join('\n');

    expect(importPagineUsate(testo)).toEqual([
      '../../../pages/human-recharge/accedi.page',
      '../../../pages/human-recharge/home.page',
    ]);
  });

  it('nessun import di pagine: elenco vuoto', () => {
    expect(importPagineUsate('import { Given } from "@cucumber/cucumber";')).toEqual([]);
  });
});

describe('costruisciEsportazione', () => {
  it('mette un marcatore col percorso prima di ogni file, in ordine', () => {
    const pacchetto = costruisciEsportazione([
      { percorso: 'src/features/x.feature', contenuto: 'Feature: x\n' },
      { percorso: 'src/steps/x.steps.ts', contenuto: 'When(...)\n' },
    ]);
    expect(pacchetto).toBe(
      '=== src/features/x.feature ===\nFeature: x\n\n\n=== src/steps/x.steps.ts ===\nWhen(...)\n\n'
    );
  });

  it('normalizza CRLF nel contenuto a LF', () => {
    const pacchetto = costruisciEsportazione([{ percorso: 'a.txt', contenuto: 'riga1\r\nriga2\r\n' }]);
    expect(pacchetto).not.toContain('\r');
  });
});
