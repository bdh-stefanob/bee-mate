import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { togliVoceDalCatalogo } from '@/lib/catalogo-voci';

const RADICE = fs.mkdtempSync(path.join(os.tmpdir(), 'catalogo-voci-'));
const voce = (expression: string, status: string, documented = true) => ({ expression, status, documented, parameters: [], app: 'shop', area: 'a', domain: 'shop', sourceRef: '' });
const scrivi = (steps: unknown[]) => fs.writeFileSync(path.join(RADICE, 'step-catalog.json'), JSON.stringify({ generatedAt: 'x', totalSteps: steps.length, documentedSteps: 0, undocumentedSteps: 0, steps }));
const leggi = () => JSON.parse(fs.readFileSync(path.join(RADICE, 'step-catalog.json'), 'utf-8')) as { totalSteps: number; documentedSteps: number; undocumentedSteps: number; generatedAt: string; steps: Array<{ expression: string }> };

beforeEach(() => fs.rmSync(path.join(RADICE, 'step-catalog.json'), { force: true }));
afterAll(() => fs.rmSync(RADICE, { recursive: true, force: true }));

describe('togliVoceDalCatalogo', () => {
  it('toglie una voce wanted e riallinea i conteggi', () => {
    scrivi([voce('a', 'wanted', false), voce('b', 'wanted'), voce('c', 'implemented')]);
    expect(togliVoceDalCatalogo(RADICE, 'a')).toBe(true);
    const c = leggi();
    expect(c.steps.map((s) => s.expression)).toEqual(['b', 'c']);
    expect(c.totalSteps).toBe(2);
    expect(c.documentedSteps).toBe(2);
    expect(c.undocumentedSteps).toBe(0);
    expect(c.generatedAt).toBe('x');
  });

  it('una voce implemented non si tocca: la rigenerazione la rifa dal codice', () => {
    scrivi([voce('c', 'implemented')]);
    expect(togliVoceDalCatalogo(RADICE, 'c')).toBe(false);
    expect(leggi().steps).toHaveLength(1);
  });

  it('una frase che non c e, o un file che non si legge: niente, senza errori', () => {
    scrivi([voce('b', 'wanted')]);
    expect(togliVoceDalCatalogo(RADICE, 'zzz')).toBe(false);
    fs.writeFileSync(path.join(RADICE, 'step-catalog.json'), 'non e json');
    expect(togliVoceDalCatalogo(RADICE, 'b')).toBe(false);
    fs.rmSync(path.join(RADICE, 'step-catalog.json'));
    expect(togliVoceDalCatalogo(RADICE, 'b')).toBe(false);
  });
});
