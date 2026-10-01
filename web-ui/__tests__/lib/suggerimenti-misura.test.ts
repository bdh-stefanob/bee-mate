import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  validaInsiemeOro,
  braccioRegole,
  misura,
  accordoFraGiudici,
  giudizioComposizione,
  stabilita,
  intervalloWilson,
  criterioDiIngresso,
  formattaMisura,
  SOGLIE,
  type InsiemeOro,
  type Decisioni,
} from '@/lib/suggerimenti-misura';

const grezzo = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '..', '..', '..', 'test-fixtures', 'assistente', 'insieme-d-oro.esempio.json'), 'utf-8')
);

function oro(): InsiemeOro {
  const e = validaInsiemeOro(grezzo);
  if (!e.ok) throw new Error(e.motivo);
  return e.insieme;
}

describe('validaInsiemeOro', () => {
  it('accetta l\'esempio', () => {
    expect(validaInsiemeOro(grezzo).ok).toBe(true);
  });
  it('rifiuta id doppi, campi sconosciuti, una fonte che non esiste', () => {
    const passi = JSON.parse(JSON.stringify(grezzo.passi));
    passi[1].id = 'p01';
    expect(validaInsiemeOro({ ...grezzo, passi }).ok).toBe(false);
    expect(validaInsiemeOro({ ...grezzo, giudizio: 'x' }).ok).toBe(false);
    const altra = JSON.parse(JSON.stringify(grezzo.passi));
    altra[0].fonte = 'sogno';
    expect(validaInsiemeOro({ ...grezzo, passi: altra }).ok).toBe(false);
  });
  it('un passo "oro" assente e\' diverso da "oro: null": l\'etichetta mancante non vale come "nessuna"', () => {
    const passi = JSON.parse(JSON.stringify(grezzo.passi));
    delete passi[0].oro;
    expect(validaInsiemeOro({ ...grezzo, passi }).ok).toBe(false);
  });
});

describe('misura del braccio "regole" sull\'esempio', () => {
  // Calcolato a mano sui dodici passi: 9 proposte (p01 p02 p03 p04 p06 p07 p08 p10 p12),
  // giuste 4 (p01 p03 p08 p12). Passi con una voce giusta: 7. Senza: 5, astenuti 2 (p05 p11).
  // La voce giusta e' fra i candidati in 6 dei 7 (manca in p09).
  const decisioni = () => braccioRegole(oro());
  const m = () => misura(oro(), decisioni());

  it('le regole propongono il primo agganciato, altrimenti la prima stima, altrimenti nessuna', () => {
    const d = decisioni();
    expect(d.get('p02')).toBe('Y1'); // l'agganciato batte la stima giusta
    expect(d.get('p07')).toBe('U1');
    expect(d.get('p05')).toBeNull();
    expect(d.get('p09')).toBeNull();
  });

  it('precisione: fra le proposte con una voce, quante giuste', () => {
    expect(m().proposte).toBe(9);
    expect(m().giuste).toBe(4);
    expect(m().precisione).toBeCloseTo(4 / 9, 10);
  });

  it('copertura: fra i passi che HANNO una voce giusta, quanti l\'hanno ricevuta', () => {
    expect(m().conVoceGiusta).toBe(7);
    expect(m().copertura).toBeCloseTo(4 / 7, 10);
  });

  it('astensione: fra i passi SENZA voce giusta, quanti hanno ricevuto "nessuna"', () => {
    expect(m().senzaVoceGiusta).toBe(5);
    expect(m().astenuti).toBe(2);
    expect(m().astensione).toBeCloseTo(2 / 5, 10);
  });

  it('richiamo della rosa: la voce giusta e\' fra i candidati? (bassa = nessuna scelta puo\' aiutare)', () => {
    expect(m().richiamoRosa).toBeCloseTo(6 / 7, 10);
  });

  it('un numero senza denominatore e\' null, non 0 e non 1', () => {
    const solo = { ...oro(), passi: oro().passi.filter((p) => p.oro === null && p.candidati.length === 0) };
    const x = misura(solo, braccioRegole(solo));
    expect(x.precisione).toBeNull(); // nessuna proposta: la precisione non esiste
    expect(x.copertura).toBeNull(); // nessun passo con una voce giusta
    expect(x.astensione).toBe(1);
  });

  it('una decisione per un passo che non esiste, o una mancante, e\' un errore: non si misura a meta\'', () => {
    const d: Decisioni = new Map([['p01', 'X1'], ['pXX', null]]);
    expect(() => misura(oro(), d)).toThrow();
  });

  it('per ogni passo dice anche com\'e\' andata, senza le frasi', () => {
    const per = Object.fromEntries(m().perPasso.map((p) => [p.id, p.esito]));
    expect(per['p01']).toBe('giusta');
    expect(per['p02']).toBe('sbagliata');
    expect(per['p05']).toBe('astenuta-bene');
    expect(per['p04']).toBe('doveva-astenersi');
    expect(per['p09']).toBe('persa');
  });
});

describe('falsi accetti', () => {
  it('le proposte sbagliate che una persona ha accettato, su tutte le accettate', () => {
    const d = braccioRegole(oro());
    const accettate = new Set(['p01', 'p02', 'p04']); // p02 e p04 sono sbagliate
    const m = misura(oro(), d, { accettate });
    expect(m.accettate).toBe(3);
    expect(m.falsiAccetti).toBe(2);
    expect(m.tassoFalsiAccetti).toBeCloseTo(2 / 3, 10);
  });
  it('senza nessuna accettata il tasso non esiste (null)', () => {
    expect(misura(oro(), braccioRegole(oro()), { accettate: new Set() }).tassoFalsiAccetti).toBeNull();
    expect(misura(oro(), braccioRegole(oro())).tassoFalsiAccetti).toBeNull();
  });
});

describe('quanto e\' soggettivo il metro', () => {
  it('l\'accordo fra i due giudici, sui soli passi che il secondo ha etichettato', () => {
    expect(accordoFraGiudici(oro())).toEqual({ confrontati: 3, concordi: 2, accordo: 2 / 3 });
  });
  it('senza secondo giudizio: nessun accordo calcolabile', () => {
    const solo = { ...oro(), passi: oro().passi.map(({ secondoGiudizio: _s, ...p }) => p) };
    expect(accordoFraGiudici(solo).accordo).toBeNull();
  });
});

describe('giudizioComposizione: quando il risultato e\' solo aneddotico', () => {
  it('l\'esempio, con dodici passi, non basta', () => {
    const g = giudizioComposizione(oro());
    expect(g.sufficiente).toBe(false);
    expect(g.motivi.join(' ')).toMatch(/60/);
  });
  it('60 passi, 30 da almeno 3 registrazioni, 25% di "nessuna": basta', () => {
    const passi = Array.from({ length: 60 }, (_, i) => ({
      id: `q${i}`,
      fonte: (i < 30 ? 'registrazione' : 'wiki') as 'registrazione' | 'wiki',
      ...(i < 30 ? { registrazione: `R${i % 3}` } : {}),
      etichetta: 'x',
      candidati: [],
      oro: i % 3 === 0 ? null : `voce${i}`,
    }));
    expect(giudizioComposizione({ schema: 1, nome: 'n', esempio: false, passi }).sufficiente).toBe(true);
  });
  it('senza abbastanza "nessuna" non si prova l\'astensione', () => {
    const passi = Array.from({ length: 60 }, (_, i) => ({
      id: `q${i}`,
      fonte: (i < 30 ? 'registrazione' : 'wiki') as 'registrazione' | 'wiki',
      ...(i < 30 ? { registrazione: `R${i % 3}` } : {}),
      etichetta: 'x',
      candidati: [],
      oro: i === 0 ? null : `voce${i}`,
    }));
    const g = giudizioComposizione({ schema: 1, nome: 'n', esempio: false, passi });
    expect(g.sufficiente).toBe(false);
    expect(g.motivi.join(' ')).toMatch(/25/);
  });
  it('un insieme dichiarato "esempio" non e\' mai sufficiente', () => {
    const passi = Array.from({ length: 60 }, (_, i) => ({
      id: `q${i}`, fonte: 'wiki' as const, etichetta: 'x', candidati: [], oro: i % 2 ? null : 'v',
    }));
    expect(giudizioComposizione({ schema: 1, nome: 'n', esempio: true, passi }).sufficiente).toBe(false);
  });
});

describe('stabilita', () => {
  it('la quota di passi con la stessa decisione in tutte le esecuzioni', () => {
    const a: Decisioni = new Map([['p1', 'x'], ['p2', null], ['p3', 'y']]);
    const b: Decisioni = new Map([['p1', 'x'], ['p2', null], ['p3', 'z']]);
    const c: Decisioni = new Map([['p1', 'x'], ['p2', 'w'], ['p3', 'y']]);
    expect(stabilita([a, b, c])).toBeCloseTo(1 / 3, 10);
    expect(stabilita([a, a, a])).toBe(1);
  });
  it('con una sola esecuzione non c\'e\' niente da confrontare', () => {
    expect(stabilita([new Map([['p1', 'x']])])).toBeNull();
  });
});

describe('intervalloWilson', () => {
  it('con 45 proposte e P = 0,90 l\'intervallo e\' largo circa nove punti, come dice la spec', () => {
    const [basso, alto] = intervalloWilson(41, 45);
    expect(alto - basso).toBeGreaterThan(0.1);
    expect(alto - basso).toBeLessThan(0.2);
    expect(basso).toBeLessThan(0.9);
  });
  it('senza osservazioni non c\'e\' intervallo', () => {
    expect(intervalloWilson(0, 0)).toEqual([0, 1]);
  });
});

describe('criterioDiIngresso (soglie confermate il 2026-10-01)', () => {
  it('le soglie sono quelle del proprietario', () => {
    expect(SOGLIE).toEqual({ precisione: 0.9, astensione: 0.8, guadagnoCopertura: 0.15, stabilita: 0.8, tolleranzaPrecisione: 0.02 });
  });
  const base = { precisione: 0.5, copertura: 0.4, astensione: 0.5 };
  it('un assistente che non supera le regole di 0,15 in copertura non vale le parti in movimento', () => {
    const r = criterioDiIngresso({ precisione: 0.95, copertura: 0.5, astensione: 0.9, stabilita: 0.9 }, base);
    expect(r.valore).toBe(false);
    expect(r.passa).toBe(false);
  });
  it('passa solo se passano tutti', () => {
    const r = criterioDiIngresso({ precisione: 0.95, copertura: 0.7, astensione: 0.9, stabilita: 0.9 }, base);
    expect(r.passa).toBe(true);
  });
  it('un numero che manca non passa: non e\' calcolabile, quindi non e\' un si\'', () => {
    const r = criterioDiIngresso({ precisione: null, copertura: 0.9, astensione: 0.9, stabilita: 0.9 }, base);
    expect(r.sicurezza).toBeNull();
    expect(r.passa).toBe(false);
  });
});

describe('formattaMisura', () => {
  it('e\' un referto di soli numeri: nessuna frase dei passi', () => {
    const m = misura(oro(), braccioRegole(oro()));
    const testo = formattaMisura(m);
    expect(testo).toMatch(/precisione/i);
    for (const p of oro().passi) expect(testo).not.toContain(p.etichetta);
    expect(testo).not.toContain('X1');
  });
  it('un valore non calcolabile si scrive "n/d"', () => {
    const solo = { ...oro(), passi: oro().passi.filter((p) => p.candidati.length === 0 && p.oro === null) };
    expect(formattaMisura(misura(solo, braccioRegole(solo)))).toContain('n/d');
  });
});
