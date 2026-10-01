import { describe, it, expect } from 'vitest';
import { formattaQuando, formattaDurata, type Traduttore } from '@/lib/formato-quando';

/** Un traduttore finto che mostra la chiave e i valori: si vede quale frase sceglie. */
const t: Traduttore = (chiave, valori) =>
  valori ? `${chiave}(${Object.entries(valori).map(([k, v]) => `${k}=${v}`).join(',')})` : chiave;

// Orari costruiti in ora LOCALE: "oggi" e "ieri" sono giorni di calendario di chi guarda.
const locale = (y: number, mese: number, g: number, h: number, min: number) => new Date(y, mese - 1, g, h, min);

describe('formattaQuando', () => {
  it('"oggi" si decide sul giorno di calendario, non sulle 24 ore', () => {
    const adesso = locale(2026, 10, 1, 0, 10);
    const dueMinutiFa = locale(2026, 10, 1, 0, 8);
    expect(formattaQuando(dueMinutiFa.toISOString(), 'it', t, adesso)).toMatch(/^quandoOggi\(ora=0?0:08\)$/);
  });

  it('un orario di 25 minuti fa a cavallo della mezzanotte e\' "ieri", non "oggi"', () => {
    const adesso = locale(2026, 10, 1, 0, 10);
    const prima = locale(2026, 9, 30, 23, 50);
    expect(formattaQuando(prima.toISOString(), 'it', t, adesso)).toMatch(/^quandoIeri\(ora=23:50\)$/);
  });

  it('ieri a metà mattina visto da stamattina e\' "ieri"', () => {
    const adesso = locale(2026, 10, 1, 9, 0);
    const ieriSera = locale(2026, 9, 30, 10, 0);
    expect(formattaQuando(ieriSera.toISOString(), 'it', t, adesso)).toMatch(/^quandoIeri/);
  });

  it('piu\' di un giorno fa si scrive con la data nel formato della lingua', () => {
    const adesso = locale(2026, 10, 1, 12, 0);
    const vecchia = locale(2026, 9, 27, 16, 36);
    const it = formattaQuando(vecchia.toISOString(), 'it', t, adesso);
    expect(it).toMatch(/^quandoData\(data=27 settembre,ora=16:36\)$/);
    const en = formattaQuando(vecchia.toISOString(), 'en', t, adesso);
    expect(en).toContain('September 27');
  });

  it('una data di un altro anno porta l\'anno', () => {
    const adesso = locale(2026, 10, 1, 12, 0);
    const vecchia = locale(2025, 12, 31, 8, 0);
    expect(formattaQuando(vecchia.toISOString(), 'it', t, adesso)).toContain('2025');
  });

  it('una data illeggibile non lancia: una stringa vuota', () => {
    expect(formattaQuando('non e\' una data', 'it', t, new Date())).toBe('');
  });
});

describe('formattaDurata', () => {
  const td: Traduttore = (chiave, valori) => `${chiave}:${valori?.s ?? ''}:${valori?.m ?? ''}`;

  it('sotto il minuto, secondi con un decimale, con la virgola in italiano', () => {
    expect(formattaDurata(11_240, 'it', td)).toBe('durataSecondi:11,2:');
  });

  it('con il punto in inglese', () => {
    expect(formattaDurata(11_240, 'en', td)).toBe('durataSecondi:11.2:');
  });

  it('sopra il minuto, minuti e secondi con due cifre', () => {
    expect(formattaDurata(127_300, 'it', td)).toBe('durataMinutiSecondi:07:2');
  });

  it('esattamente un minuto', () => {
    expect(formattaDurata(60_000, 'it', td)).toBe('durataMinutiSecondi:00:1');
  });
});
