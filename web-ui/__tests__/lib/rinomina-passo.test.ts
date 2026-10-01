import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { pianificaRinomina } from '@/lib/rinomina-passo';

const RADICE = fs.mkdtempSync(path.join(os.tmpdir(), 'rinomina-passo-'));
const radici = { repoRoot: RADICE, featuresDir: path.join(RADICE, 'src', 'features') };

const DA = 'the user adds the item';
const A = 'the user puts the item in the cart';

function scrivi(rel: string, testo: string) {
  const p = path.join(RADICE, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, testo);
}

function istantanea(): string[] {
  const out: string[] = [];
  const visita = (d: string) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) visita(p);
      else out.push(`${path.relative(RADICE, p)}:${fs.readFileSync(p, 'utf-8')}`);
    }
  };
  visita(RADICE);
  return out.sort();
}

beforeEach(() => {
  fs.rmSync(RADICE, { recursive: true, force: true });
  fs.mkdirSync(RADICE, { recursive: true });
  scrivi('step-catalog.json', JSON.stringify({ steps: [{ expression: DA, sourceRef: 'src\\steps\\shop\\cart.steps.ts:2' }] }));
  scrivi('src/steps/shop/cart.steps.ts', `/**\n * @intent ${DA}\n */\nWhen("${DA}", async function () {});\n`);
  scrivi('src/features/shop/a.feature', `Feature: A\n  Scenario: A\n    When ${DA}\n`);
  scrivi('src/features/shop/b.feature', 'Feature: B\n  Scenario: B\n    When altro\n');
});
afterAll(() => fs.rmSync(RADICE, { recursive: true, force: true }));

describe('pianificaRinomina', () => {
  it('restituisce le scritture (definizione prima, poi gli scenari) e non scrive niente', () => {
    const prima = istantanea();
    const piano = pianificaRinomina(radici, DA, A);
    expect(piano.ok).toBe(true);
    if (!piano.ok) return;
    expect(piano.fileFeatureAggiornati).toBe(1);
    expect(piano.scritture.map((s) => path.relative(RADICE, s.percorso).replace(/\\/g, '/'))).toEqual([
      'src/steps/shop/cart.steps.ts',
      'src/features/shop/a.feature',
    ]);
    expect(piano.scritture[0].testo).toContain(`When("${A}"`);
    expect(piano.scritture[1].testo).toBe(`Feature: A\n  Scenario: A\n    When ${A}\n`);
    expect(istantanea()).toEqual(prima);
  });

  it('rifiuta con il codice e lo stato giusti', () => {
    expect(pianificaRinomina(radici, DA, DA)).toEqual({ ok: false, stato: 400, errore: 'le_frasi_sono_uguali' });
    expect(pianificaRinomina(radici, DA, 'a\nb')).toEqual({ ok: false, stato: 400, errore: 'frase_non_valida' });
    expect(pianificaRinomina(radici, DA, 'shows {string}')).toEqual({ ok: false, stato: 400, errore: 'step_con_parametri_non_supportato' });
    expect(pianificaRinomina(radici, 'sconosciuta', A)).toEqual({ ok: false, stato: 404, errore: 'step_non_trovato' });
  });

  it('non dipende da costanti del repository: la stessa funzione lavora su qualunque radice', () => {
    const altra = fs.mkdtempSync(path.join(os.tmpdir(), 'rinomina-passo-altra-'));
    try {
      const piano = pianificaRinomina({ repoRoot: altra, featuresDir: path.join(altra, 'src', 'features') }, DA, A);
      expect(piano).toEqual({ ok: false, stato: 500, errore: 'catalogo_non_disponibile' });
    } finally {
      fs.rmSync(altra, { recursive: true, force: true });
    }
  });
});
