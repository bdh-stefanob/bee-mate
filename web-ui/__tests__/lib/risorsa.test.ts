import { describe, expect, it, vi } from 'vitest';
import { condividi, creaRisorsa } from '@/lib/risorsa';

/** Una lettura che si conclude quando lo decide il test. */
function letturaComandata<T>() {
  const attese: Array<{ risolvi: (v: T) => void; rifiuta: (e: unknown) => void }> = [];
  const leggi = vi.fn(
    () =>
      new Promise<T>((risolvi, rifiuta) => {
        attese.push({ risolvi, rifiuta });
      })
  );
  return { leggi, attese };
}

describe('condividi', () => {
  it('dati uguali in profondita\' restano lo stesso oggetto', () => {
    const vecchio = { voci: [{ nome: 'a', dati: { n: 1 } }, { nome: 'b' }] };
    const nuovo = { voci: [{ nome: 'a', dati: { n: 1 } }, { nome: 'b' }] };
    expect(condividi(vecchio, nuovo)).toBe(vecchio);
  });

  it('cambia solo cio\' che e\' cambiato: le altre righe conservano l\'identita\'', () => {
    const vecchio = { voci: [{ nome: 'a', esito: 'ok' }, { nome: 'b', esito: 'manca' }] };
    const nuovo = { voci: [{ nome: 'a', esito: 'ok' }, { nome: 'b', esito: 'ok' }] };
    const esito = condividi(vecchio, nuovo);
    expect(esito).not.toBe(vecchio);
    expect(esito.voci[0]).toBe(vecchio.voci[0]);
    expect(esito.voci[1]).not.toBe(vecchio.voci[1]);
    expect(esito).toEqual(nuovo);
  });

  it('una riga in piu\' o una chiave in meno non passano per uguali', () => {
    expect(condividi([1, 2], [1, 2, 3])).toEqual([1, 2, 3]);
    expect(condividi([1, 2, 3], [1, 2])).toEqual([1, 2]);
    const vecchio = { a: 1, b: 2 } as Record<string, number>;
    const esito = condividi(vecchio, { a: 1 });
    expect(esito).toEqual({ a: 1 });
    expect(esito).not.toBe(vecchio);
  });
});

describe('creaRisorsa', () => {
  it('parte in caricamento e diventa pronta con i dati letti', async () => {
    const risorsa = creaRisorsa(async () => ({ n: 1 }));
    expect(risorsa.istantanea()).toEqual({ stato: 'caricamento', dati: null, aggiornando: false });
    await risorsa.carica();
    expect(risorsa.istantanea()).toEqual({ stato: 'pronto', dati: { n: 1 }, aggiornando: false });
  });

  it('due richieste insieme fanno una lettura sola', async () => {
    const { leggi, attese } = letturaComandata<number>();
    const risorsa = creaRisorsa(leggi);
    const prima = risorsa.carica();
    const seconda = risorsa.carica();
    expect(leggi).toHaveBeenCalledTimes(1);
    attese[0].risolvi(7);
    await Promise.all([prima, seconda]);
    expect(risorsa.istantanea().dati).toBe(7);
  });

  it('una modifica arrivata a lettura in volo la fa ripetere: non resta il dato di prima', async () => {
    const { leggi, attese } = letturaComandata<string>();
    const risorsa = creaRisorsa(leggi);
    const prima = risorsa.carica();
    const dopoModifica = risorsa.ricarica();
    attese[0].risolvi('prima della modifica');
    await vi.waitFor(() => expect(leggi).toHaveBeenCalledTimes(2));
    attese[1].risolvi('dopo la modifica');
    await Promise.all([prima, dopoModifica]);
    expect(risorsa.istantanea()).toEqual({ stato: 'pronto', dati: 'dopo la modifica', aggiornando: false });
  });

  it('rileggere gli stessi dati non cambia il riferimento, e avvisa solo per "aggiornando"', async () => {
    const risorsa = creaRisorsa(async () => ({ voci: [{ nome: 'a' }] }));
    await risorsa.carica();
    const primi = risorsa.istantanea().dati;
    const avvisi: boolean[] = [];
    risorsa.sottoscrivi(() => avvisi.push(risorsa.istantanea().aggiornando));
    await risorsa.ricarica();
    expect(risorsa.istantanea().dati).toBe(primi);
    expect(avvisi).toEqual([true, false]);
  });

  it('senza dati, una lettura fallita e\' un errore; riprovare riparte dal caricamento', async () => {
    let fallisce = true;
    const risorsa = creaRisorsa(async () => {
      if (fallisce) throw new Error('giu\'');
      return 1;
    });
    await risorsa.carica();
    expect(risorsa.istantanea().stato).toBe('errore');
    fallisce = false;
    const riprova = risorsa.carica();
    expect(risorsa.istantanea().stato).toBe('caricamento');
    await riprova;
    expect(risorsa.istantanea()).toEqual({ stato: 'pronto', dati: 1, aggiornando: false });
  });

  it('con dei dati gia\' a schermo, un aggiornamento fallito li lascia li\'', async () => {
    let fallisce = false;
    const risorsa = creaRisorsa(async () => {
      if (fallisce) throw new Error('giu\'');
      return { n: 1 };
    });
    await risorsa.carica();
    fallisce = true;
    await risorsa.ricarica();
    expect(risorsa.istantanea()).toEqual({ stato: 'pronto', dati: { n: 1 }, aggiornando: false });
  });

  it('chi si disiscrive non viene piu\' avvisato, e la risorsa sa se qualcuno la guarda', async () => {
    const risorsa = creaRisorsa(async () => 1);
    const ascoltatore = vi.fn();
    const via = risorsa.sottoscrivi(ascoltatore);
    expect(risorsa.osservata()).toBe(true);
    via();
    expect(risorsa.osservata()).toBe(false);
    await risorsa.carica();
    expect(ascoltatore).not.toHaveBeenCalled();
  });
});
