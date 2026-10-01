import { describe, it, expect } from 'vitest';
import {
  schedaDaUrl,
  urlConScheda,
  schedaIniziale,
  leggiSchedaRicordata,
  ricordaScheda,
} from '@/lib/schede-url';

const VALIDE = ['step', 'componenti', 'da-sistemare'] as const;

describe('schedaDaUrl', () => {
  it('una scheda valida nell\'indirizzo: quella', () => {
    expect(schedaDaUrl('componenti', VALIDE, 'step')).toBe('componenti');
  });
  it('assente, vuoto o sconosciuto: la predefinita', () => {
    expect(schedaDaUrl(null, VALIDE, 'step')).toBe('step');
    expect(schedaDaUrl(undefined, VALIDE, 'step')).toBe('step');
    expect(schedaDaUrl('', VALIDE, 'step')).toBe('step');
    expect(schedaDaUrl('boh', VALIDE, 'step')).toBe('step');
  });
  it('il valore e\' esatto: le maiuscole non valgono', () => {
    expect(schedaDaUrl('STEP', VALIDE, 'componenti')).toBe('componenti');
  });
  it('parametro ripetuto: il primo', () => {
    const p = new URLSearchParams('scheda=da-sistemare&scheda=componenti');
    expect(schedaDaUrl(p.getAll('scheda'), VALIDE, 'step')).toBe('da-sistemare');
  });
});

describe('urlConScheda', () => {
  it('toglie i parametri di filtro e tiene `scheda`', () => {
    const url = urlConScheda('/catalogo', 'scheda=step&q=login&app=shop&stato=pronto&senza-componente=1&ambigua=1&ordina=usi', 'scheda', 'componenti');
    expect(url).toBe('/catalogo?scheda=componenti');
  });
  it('non tocca i parametri estranei', () => {
    const url = urlConScheda('/catalogo', 'altro=1&q=x', 'scheda', 'step');
    expect(url).toBe('/catalogo?altro=1&scheda=step');
  });
  it('scrive SEMPRE scheda=<id>, anche per la scheda predefinita', () => {
    expect(urlConScheda('/catalogo', '', 'scheda', 'step')).toBe('/catalogo?scheda=step');
  });
  it('accetta anche un URLSearchParams', () => {
    expect(urlConScheda('/catalogo', new URLSearchParams('q=a'), 'scheda', 'da-sistemare')).toBe('/catalogo?scheda=da-sistemare');
  });
});

describe('schedaIniziale (Q5: indirizzo, poi ultima visitata, poi Step)', () => {
  const base = { valide: VALIDE, predefinita: 'step' as const };
  it('l\'indirizzo valido vince sulla ricordata', () => {
    expect(schedaIniziale({ ...base, url: 'componenti', ricordata: 'da-sistemare' })).toEqual({ scheda: 'componenti', fonte: 'indirizzo' });
  });
  it('senza parametro: la ricordata', () => {
    expect(schedaIniziale({ ...base, url: null, ricordata: 'da-sistemare' })).toEqual({ scheda: 'da-sistemare', fonte: 'ricordata' });
  });
  it('nessuno dei due: la predefinita', () => {
    expect(schedaIniziale({ ...base, url: null, ricordata: null })).toEqual({ scheda: 'step', fonte: 'predefinita' });
  });
  it('indirizzo sconosciuto + ricordata valida: la ricordata', () => {
    expect(schedaIniziale({ ...base, url: 'boh', ricordata: 'componenti' })).toEqual({ scheda: 'componenti', fonte: 'ricordata' });
  });
  it('ricordata sconosciuta: la predefinita', () => {
    expect(schedaIniziale({ ...base, url: null, ricordata: 'vecchia-scheda' })).toEqual({ scheda: 'step', fonte: 'predefinita' });
  });
});

describe('memoria dell\'ultima scheda (protetta da try/catch)', () => {
  it('legge e scrive su un archivio che funziona', () => {
    const dati = new Map<string, string>();
    const archivio = { getItem: (k: string) => dati.get(k) ?? null, setItem: (k: string, v: string) => void dati.set(k, v) };
    ricordaScheda(archivio, 'da-sistemare');
    expect(leggiSchedaRicordata(archivio)).toBe('da-sistemare');
  });
  it('un archivio che lancia (finestra privata, dati bloccati): nessun errore, nessun valore', () => {
    const rotto = {
      getItem: () => {
        throw new Error('bloccato');
      },
      setItem: () => {
        throw new Error('bloccato');
      },
    };
    expect(leggiSchedaRicordata(rotto)).toBeNull();
    expect(() => ricordaScheda(rotto, 'step')).not.toThrow();
  });
  it('senza archivio (null): nessun errore', () => {
    expect(leggiSchedaRicordata(null)).toBeNull();
    expect(() => ricordaScheda(null, 'step')).not.toThrow();
  });
});
