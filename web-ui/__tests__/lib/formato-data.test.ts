import { describe, it, expect } from 'vitest';
import { formatoData } from '@/lib/formato-data';

describe('formatoData', () => {
  it('in italiano: niente PM, comincia con il giorno', () => {
    const s = formatoData('2026-09-25T12:19:15Z', 'it', 'UTC')!;
    expect(s).not.toContain('PM');
    expect(s.startsWith('25')).toBe(true);
  });
  it('in inglese: il mese in inglese', () => {
    expect(formatoData('2026-09-25T12:19:15Z', 'en', 'UTC')).toContain('Sep');
  });
  it('stringa non valida: null (la pagina mostra "?")', () => {
    expect(formatoData('boh', 'it', 'UTC')).toBeNull();
    expect(formatoData(undefined, 'it', 'UTC')).toBeNull();
  });
});
