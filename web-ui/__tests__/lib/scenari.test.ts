import { describe, it, expect, afterEach } from 'vitest';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { elencaScenari, leggiScenari } from '@/lib/scenari';

let tmp: string | null = null;
afterEach(() => {
  if (tmp) fs.rmSync(tmp, { recursive: true, force: true });
  tmp = null;
});

function albero(files: Record<string, string>): string {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'scenari-'));
  for (const [rel, testo] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(tmp, rel)), { recursive: true });
    fs.writeFileSync(path.join(tmp, rel), testo);
  }
  return tmp;
}

describe('leggiScenari', () => {
  it('ogni scenario porta il suo nome e la sua riga', () => {
    const f = leggiScenari(
      'Feature: Ordini\n\n  Scenario: nuovo ordine\n    Given x\n\n  Scenario Outline: annullo <n>\n    Given y\n',
      'app/ordini.feature'
    );
    expect(f.nome).toBe('Ordini');
    expect(f.scenari).toEqual([
      { nome: 'nuovo ordine', riga: 3 },
      { nome: 'annullo <n>', riga: 6 },
    ]);
  });

  it('uno scenario @non-automatizzato non si offre: e\' solo documentazione', () => {
    const f = leggiScenari(
      'Feature: Misto\n  @non-automatizzato\n  Scenario: solo scritto\n  Scenario: automatizzato\n',
      'a/b.feature'
    );
    expect(f.scenari.map((s) => s.nome)).toEqual(['automatizzato']);
    expect(f.nonAutomatizzati).toBe(1);
  });

  it('il tag sulla Feature vale per tutti i suoi scenari', () => {
    const f = leggiScenari(
      '@app @non-automatizzato\nFeature: Documento\n  Scenario: uno\n  Scenario: due\n',
      'a/b.feature'
    );
    expect(f.scenari).toEqual([]);
    expect(f.nonAutomatizzati).toBe(2);
  });

  it('un file senza "Feature:" ha comunque un nome da mostrare', () => {
    expect(leggiScenari('  Scenario: x\n', 'a/senza-nome.feature').nome).toBe('senza-nome');
  });
});

describe('elencaScenari', () => {
  it('i registrati sono riconosciuti dalla cartella, e vengono per primi', () => {
    const radice = albero({
      'app/login.feature': 'Feature: Login\n  Scenario: entra\n',
      'generated/sessione-1.feature': 'Feature: Sessione\n  Scenario: registrata\n',
    });
    const elenco = elencaScenari(radice);
    expect(elenco.map((f) => [f.file, f.generato])).toEqual([
      ['generated/sessione-1.feature', true],
      ['app/login.feature', false],
    ]);
  });

  it('un file con soli scenari documentati non compare, ma si contano', () => {
    const radice = albero({
      'a/doc.feature': '@non-automatizzato\nFeature: Doc\n  Scenario: x\n',
      'a/vero.feature': 'Feature: Vero\n  Scenario: y\n',
    });
    const elenco = elencaScenari(radice);
    expect(elenco.map((f) => f.file)).toEqual(['a/vero.feature']);
  });

  it('una cartella che non esiste da\' un elenco vuoto, non un errore', () => {
    expect(elencaScenari('/non/esiste/proprio')).toEqual([]);
  });
});
