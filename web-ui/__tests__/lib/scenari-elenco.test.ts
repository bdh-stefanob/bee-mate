import { describe, it, expect } from 'vitest';
import {
  costruisciVoci,
  esitoPerAmbiente,
  raggruppa,
  cerca,
  filtraPerCategoria,
  riepiloga,
  risolviSelezione,
  prossimoIndice,
  indirizzoScenario,
  leggiRichiesta,
} from '@/lib/scenari-elenco';
import type { FileConEsiti, UltimoEsito } from '@/lib/esiti-tipi';

function esito(extra: Partial<UltimoEsito> = {}): UltimoEsito {
  return {
    esito: 'passato',
    quando: '2026-09-30T10:00:00.000Z',
    durataMs: 1000,
    ambiente: 'staging',
    esecuzione: 'test-a',
    aggiornato: true,
    ...extra,
  };
}

function file(
  percorso: string,
  scenari: Array<{ nome: string; riga?: number; esiti?: UltimoEsito[] }>,
  extra: Partial<FileConEsiti> = {}
): FileConEsiti {
  return {
    file: percorso,
    nome: extra.nome ?? 'Una Feature',
    generato: percorso.startsWith('generated/'),
    nonAutomatizzati: 0,
    impronta: 'x',
    scenari: scenari.map((s, i) => ({ nome: s.nome, riga: s.riga ?? 2 + i * 3, esiti: s.esiti ?? [] })),
    ...extra,
  };
}

const AMB = 'staging';

const ELENCO: FileConEsiti[] = [
  file('generated/appena-fatto.feature', [{ nome: 'Il cliente cerca' }], { nome: 'Ricerca' }),
  file('shop/order/completa.feature', [
    { nome: "Il cliente completa l'ordine", esiti: [esito({ esito: 'fallito' })] },
    { nome: 'Il cliente svuota il carrello', esiti: [esito()] },
  ], { nome: 'Ordini' }),
  file('shop/search/cerca.feature', [{ nome: 'Funzionalità di ricerca', esiti: [esito({ aggiornato: false })] }], { nome: 'Ricerca prodotti' }),
  file('admin/users/crea.feature', [{ nome: 'Crea utente', esiti: [esito({ ambiente: 'produzione' })] }]),
];

describe('esitoPerAmbiente (O5: l\'esito e\' per scenario e ambiente)', () => {
  it('prende l\'esito dell\'ambiente scelto', () => {
    const e = esitoPerAmbiente([esito({ ambiente: 'produzione', esito: 'fallito' }), esito({ ambiente: 'staging' })], 'staging');
    expect(e).toMatchObject({ tipo: 'passato' });
  });

  it('un esito non aggiornato non e\' ne\' verde ne\' rosso: modificato dopo l\'ultima prova', () => {
    expect(esitoPerAmbiente([esito({ aggiornato: false })], 'staging').tipo).toBe('modificato');
    expect(esitoPerAmbiente([esito({ aggiornato: false, esito: 'fallito' })], 'staging').tipo).toBe('modificato');
  });

  it('senza esito per quell\'ambiente e\' "mai", e dice dove esiste: un altro ambiente', () => {
    const r = esitoPerAmbiente([esito({ ambiente: 'produzione' })], 'staging');
    expect(r).toMatchObject({ tipo: 'mai' });
    if (r.tipo !== 'mai') throw new Error();
    expect(r.altrove?.ambiente).toBe('produzione');
  });

  it('senza nessun esito e\' "mai" e non c\'e\' un altrove', () => {
    const r = esitoPerAmbiente([], 'staging');
    expect(r).toEqual({ tipo: 'mai', altrove: null });
  });

  it('un esito di ambiente sconosciuto non conta mai per l\'ambiente scelto: e\' "mai", con un altrove sconosciuto', () => {
    const r = esitoPerAmbiente([esito({ ambiente: null })], 'staging');
    expect(r.tipo).toBe('mai');
    if (r.tipo !== 'mai') throw new Error();
    expect(r.altrove?.ambiente).toBeNull();
  });

  it('senza un ambiente scelto nessun esito conta: tutto "mai"', () => {
    expect(esitoPerAmbiente([esito()], null).tipo).toBe('mai');
    expect(esitoPerAmbiente([esito()], '').tipo).toBe('mai');
  });
});

describe('raggruppa', () => {
  const voci = costruisciVoci(ELENCO, AMB);

  it('"Registrati, non ancora salvati" viene per primo, poi applicazione/flusso in ordine alfabetico', () => {
    expect(raggruppa(voci).map((g) => g.chiave)).toEqual([
      'non-salvati',
      'admin/users',
      'shop/order',
      'shop/search',
    ]);
    expect(raggruppa(voci)[0].tipo).toBe('non-salvati');
  });

  it('un file direttamente sotto src/features/ o con la sola cartella dell\'applicazione non sparisce', () => {
    const strano: FileConEsiti[] = [
      file('radice.feature', [{ nome: 'A' }]),
      file('shop/solo-app.feature', [{ nome: 'B' }]),
      file('shop/order/normale.feature', [{ nome: 'C' }]),
    ];
    const gruppi = raggruppa(costruisciVoci(strano, AMB));
    const nomi = gruppi.flatMap((g) => g.voci.map((v) => v.nome)).sort();
    expect(nomi).toEqual(['A', 'B', 'C']);
    expect(gruppi.find((g) => g.tipo === 'senza-app')?.voci.map((v) => v.nome)).toEqual(['A']);
    expect(gruppi.find((g) => g.chiave === 'shop')?.voci.map((v) => v.nome)).toEqual(['B']);
  });

  it('dentro al gruppo l\'ordine e\' quello dell\'elenco', () => {
    const g = raggruppa(voci).find((x) => x.chiave === 'shop/order');
    expect(g?.voci.map((v) => v.nome)).toEqual(["Il cliente completa l'ordine", 'Il cliente svuota il carrello']);
  });

  it('senza scenari non c\'e\' nessun gruppo', () => {
    expect(raggruppa([])).toEqual([]);
  });
});

describe('cerca', () => {
  const voci = costruisciVoci(ELENCO, AMB);
  const nomi = (r: ReturnType<typeof cerca>) => r.map((v) => v.nome);

  it('ignora maiuscole e accenti', () => {
    expect(nomi(cerca(voci, 'FUNZIONALITA'))).toEqual(['Funzionalità di ricerca']);
    expect(nomi(cerca(voci, 'funzionalità'))).toEqual(['Funzionalità di ricerca']);
  });

  it('richiede tutte le parole, in qualunque ordine', () => {
    expect(nomi(cerca(voci, 'carrello cliente'))).toEqual(['Il cliente svuota il carrello']);
    expect(nomi(cerca(voci, 'carrello zebra'))).toEqual([]);
  });

  it('cerca nel titolo, nel nome della Feature, nell\'applicazione e nel flusso', () => {
    expect(nomi(cerca(voci, 'ordini'))).toHaveLength(2); // nome della Feature
    expect(nomi(cerca(voci, 'admin'))).toEqual(['Crea utente']); // applicazione
    expect(nomi(cerca(voci, 'users'))).toEqual(['Crea utente']); // flusso
    expect(nomi(cerca(voci, 'completa'))).toEqual(["Il cliente completa l'ordine"]); // titolo
  });

  it('una ricerca vuota o di soli spazi lascia tutto', () => {
    expect(cerca(voci, '')).toHaveLength(voci.length);
    expect(cerca(voci, '   ')).toHaveLength(voci.length);
  });

  it('dopo la ricerca i gruppi senza scenari spariscono', () => {
    const gruppi = raggruppa(cerca(voci, 'crea utente'));
    expect(gruppi.map((g) => g.chiave)).toEqual(['admin/users']);
  });

  it('non cerca nel testo dei passi e non lancia con caratteri speciali', () => {
    expect(() => cerca(voci, '(.*[')).not.toThrow();
    expect(cerca(voci, '(.*[')).toEqual([]);
  });
});

describe('riepiloga e filtraPerCategoria', () => {
  it('verdi, rossi, da eseguire: un esito non aggiornato e un mai eseguito contano fra i da eseguire', () => {
    // generated/: mai (da eseguire) · completa: rosso · svuota: verde · cerca: modificato · crea utente: solo su produzione = mai su staging
    const r = riepiloga(costruisciVoci(ELENCO, AMB));
    expect(r).toEqual({ superati: 1, nonSuperati: 1, daEseguire: 3, totale: 5 });
  });

  it('la somma e\' sempre il totale', () => {
    for (const amb of ['staging', 'produzione', 'altro', null]) {
      const r = riepiloga(costruisciVoci(ELENCO, amb));
      expect(r.superati + r.nonSuperati + r.daEseguire).toBe(r.totale);
    }
  });

  it('cambiando ambiente cambiano i numeri (O5)', () => {
    const staging = riepiloga(costruisciVoci(ELENCO, 'staging'));
    const produzione = riepiloga(costruisciVoci(ELENCO, 'produzione'));
    expect(produzione).toEqual({ superati: 1, nonSuperati: 0, daEseguire: 4, totale: 5 });
    expect(produzione).not.toEqual(staging);
  });

  it('i contatori contano TUTTI gli scenari, anche quelli che la ricerca nasconde', () => {
    const tutte = costruisciVoci(ELENCO, AMB);
    const trovate = cerca(tutte, 'crea utente');
    expect(trovate).toHaveLength(1);
    // Chi chiama riepiloga su `tutte`, non su `trovate`: qui si prova che la funzione e' per quello che riceve.
    expect(riepiloga(tutte).totale).toBe(5);
  });

  it('il filtro per categoria e la ricerca si compongono', () => {
    const tutte = costruisciVoci(ELENCO, AMB);
    const daEseguire = filtraPerCategoria(tutte, 'da-eseguire');
    expect(daEseguire.map((v) => v.nome).sort()).toEqual(['Crea utente', 'Funzionalità di ricerca', 'Il cliente cerca'].sort());
    expect(cerca(daEseguire, 'ricerca prodotti').map((v) => v.nome)).toEqual(['Funzionalità di ricerca']);
    expect(filtraPerCategoria(tutte, 'non-superati').map((v) => v.nome)).toEqual(["Il cliente completa l'ordine"]);
    expect(filtraPerCategoria(tutte, 'superati').map((v) => v.nome)).toEqual(['Il cliente svuota il carrello']);
    expect(filtraPerCategoria(tutte, null)).toHaveLength(5);
  });
});

describe('risolviSelezione', () => {
  const tutte = costruisciVoci(ELENCO, AMB);

  it('file + titolo: quello scenario', () => {
    const r = risolviSelezione(tutte, tutte, { file: 'shop/order/completa.feature', scenario: 'Il cliente svuota il carrello' }, true);
    expect(r).toMatchObject({ tipo: 'scelto', file: 'shop/order/completa.feature', nome: 'Il cliente svuota il carrello' });
  });

  it('un titolo inesistente in un file che c\'e\': il primo del file', () => {
    const r = risolviSelezione(tutte, tutte, { file: 'shop/order/completa.feature', scenario: 'Un titolo che non c\'e\' piu\'' }, true);
    expect(r).toMatchObject({ tipo: 'scelto', nome: "Il cliente completa l'ordine" });
  });

  it('un file senza titolo: il primo del file', () => {
    const r = risolviSelezione(tutte, tutte, { file: 'shop/order/completa.feature' }, false);
    expect(r).toMatchObject({ tipo: 'scelto', nome: "Il cliente completa l'ordine" });
  });

  it('un file inesistente: "non trovato", mai un altro scenario al suo posto', () => {
    const r = risolviSelezione(tutte, tutte, { file: 'shop/order/sparito.feature', scenario: 'x' }, true);
    expect(r).toEqual({ tipo: 'non-trovato' });
  });

  it('senza parametri: il primo dell\'elenco visibile se la pagina e\' larga, nessuno se e\' stretta', () => {
    const visibili = cerca(tutte, 'crea utente');
    expect(risolviSelezione(tutte, visibili, {}, true)).toMatchObject({ tipo: 'scelto', nome: 'Crea utente' });
    expect(risolviSelezione(tutte, visibili, {}, false)).toEqual({ tipo: 'nessuno' });
  });

  it('il primo dell\'elenco visibile e\' il primo in ordine di GRUPPO: quello non salvato', () => {
    const r = risolviSelezione(tutte, tutte, {}, true);
    expect(r).toMatchObject({ tipo: 'scelto', nome: 'Il cliente cerca' });
  });

  it('un elenco vuoto: nessuno', () => {
    expect(risolviSelezione([], [], {}, true)).toEqual({ tipo: 'nessuno' });
  });

  it('un file nascosto dalla ricerca ma esistente si apre lo stesso', () => {
    const visibili = cerca(tutte, 'crea utente');
    const r = risolviSelezione(tutte, visibili, { file: 'shop/order/completa.feature', scenario: 'Il cliente svuota il carrello' }, true);
    expect(r).toMatchObject({ tipo: 'scelto', nome: 'Il cliente svuota il carrello' });
  });
});

describe('prossimoIndice (la regola delle frecce)', () => {
  // Una riga per intestazione di gruppo (non si sceglie) e una per opzione.
  const righe = ['gruppo', 'opzione', 'opzione', 'gruppo', 'opzione'] as const;

  it('giu\' e su, saltando le intestazioni', () => {
    expect(prossimoIndice(righe, 1, 'giu')).toBe(2);
    expect(prossimoIndice(righe, 2, 'giu')).toBe(4);
    expect(prossimoIndice(righe, 4, 'su')).toBe(2);
    expect(prossimoIndice(righe, 2, 'su')).toBe(1);
  });

  it('Home e Fine vanno alla prima e all\'ultima opzione', () => {
    expect(prossimoIndice(righe, 2, 'home')).toBe(1);
    expect(prossimoIndice(righe, 2, 'fine')).toBe(4);
  });

  it('ai capi non gira: ci si ferma', () => {
    expect(prossimoIndice(righe, 4, 'giu')).toBe(4);
    expect(prossimoIndice(righe, 1, 'su')).toBe(1);
  });

  it('senza opzioni, o da una posizione fuori campo, non lancia', () => {
    expect(prossimoIndice(['gruppo'], 0, 'giu')).toBe(-1);
    expect(prossimoIndice([], 0, 'giu')).toBe(-1);
    expect(prossimoIndice(righe, -1, 'giu')).toBe(1);
    expect(prossimoIndice(righe, 99, 'su')).toBe(4);
  });
});

describe('indirizzo di uno scenario', () => {
  it('si costruisce con file e titolo codificati, e si rilegge uguale', () => {
    const url = indirizzoScenario('shop/order/completa-ordine.feature', "Il cliente completa l'ordine");
    expect(url).toBe('/scenari?file=shop%2Forder%2Fcompleta-ordine.feature&scenario=Il+cliente+completa+l%27ordine');
    const parametri = new URL(url, 'http://x').searchParams;
    expect(leggiRichiesta(parametri)).toEqual({ file: 'shop/order/completa-ordine.feature', scenario: "Il cliente completa l'ordine" });
  });

  it('senza parametri la richiesta e\' vuota', () => {
    expect(leggiRichiesta(new URLSearchParams(''))).toEqual({});
  });
});
