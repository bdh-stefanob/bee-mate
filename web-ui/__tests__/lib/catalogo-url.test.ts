import { describe, it, expect } from 'vitest';
import {
  parseVistaStep,
  serializzaVistaStep,
  parseVistaComponenti,
  serializzaVistaComponenti,
  parseVistaCoppie,
  serializzaVistaCoppie,
  urlCatalogo,
} from '@/lib/catalogo-url';
import { VISTA_STEP_VUOTA, VISTA_COMPONENTI_VUOTA, VISTA_COPPIE_VUOTA } from '@/lib/catalogo-filtri';

describe('vista degli step <-> indirizzo', () => {
  it('l\'indirizzo vuoto e\' la vista di default', () => {
    expect(parseVistaStep('')).toEqual(VISTA_STEP_VUOTA);
  });
  it('i valori di default non si scrivono', () => {
    expect(serializzaVistaStep(VISTA_STEP_VUOTA)).toBe('');
    expect(serializzaVistaStep({ ...VISTA_STEP_VUOTA, ordina: 'az' })).toBe('');
  });
  it('andata e ritorno, con ordine dei parametri stabile', () => {
    const v = { q: 'carrello', app: 'shop', stato: 'richiesto' as const, senzaComponente: true, ordina: 'usi' as const };
    const s = serializzaVistaStep(v);
    expect(s).toBe('q=carrello&app=shop&stato=richiesto&senza-componente=1&ordina=usi');
    expect(parseVistaStep(s)).toEqual(v);
    expect(parseVistaStep(new URLSearchParams('ordina=usi&stato=richiesto&q=carrello&senza-componente=1&app=shop'))).toEqual(v);
  });
  it('un valore sconosciuto si ignora, non svuota la lista', () => {
    expect(parseVistaStep('stato=boh&ordina=boh&senza-componente=forse')).toEqual(VISTA_STEP_VUOTA);
  });
  it('la ricerca di soli spazi non si scrive', () => {
    expect(serializzaVistaStep({ ...VISTA_STEP_VUOTA, q: '   ' })).toBe('');
  });
});

describe('vista dei componenti e delle coppie', () => {
  it('componenti: andata e ritorno; l\'ordine di default (step) non si scrive', () => {
    expect(serializzaVistaComponenti(VISTA_COMPONENTI_VUOTA)).toBe('');
    const v = { q: 'x', app: 'blog', ambigua: true, ordina: 'scenari' as const };
    expect(parseVistaComponenti(serializzaVistaComponenti(v))).toEqual(v);
    expect(parseVistaComponenti('ordina=boh')).toEqual(VISTA_COMPONENTI_VUOTA);
  });
  it('coppie: andata e ritorno', () => {
    expect(serializzaVistaCoppie(VISTA_COPPIE_VUOTA)).toBe('');
    const v = { q: 'login', app: 'shop' };
    expect(parseVistaCoppie(serializzaVistaCoppie(v))).toEqual(v);
  });
});

describe('urlCatalogo', () => {
  it('solo la scheda', () => {
    expect(urlCatalogo({ scheda: 'step' })).toBe('/catalogo?scheda=step');
  });
  it('scheda Step con ricerca e stato', () => {
    expect(urlCatalogo({ scheda: 'step', q: 'the page shows', stato: 'pronto' })).toBe(
      '/catalogo?scheda=step&q=the+page+shows&stato=pronto'
    );
  });
  it('da una riga componente alla scheda Step con la frase', () => {
    expect(urlCatalogo({ scheda: 'step', q: 'the user "x"' })).toBe('/catalogo?scheda=step&q=the+user+%22x%22');
  });
});
