import { describe, it, expect } from 'vitest';
import { bozzaIniziale, riduci, haModificheNonSalvate, type Bozza, type Azione } from '@/lib/bozza-scenario';

const T0 = 'Feature: F\n  Scenario: S\n    Given a\n';
const T1 = 'Feature: F2\n  Scenario: S\n    Given a\n';

function esegui(...azioni: Azione[]): Bozza {
  return azioni.reduce(riduci, bozzaIniziale());
}

const pulita = (extra: Azione[] = []) =>
  esegui({ tipo: 'apri' }, { tipo: 'letto', testo: T0, versione: 'v0', marcatore: true }, ...extra);
const sporca = () => pulita([{ tipo: 'modifica', testo: T1 }]);

describe('bozza: dalla lettura alla modifica', () => {
  it('parte in lettura', () => {
    expect(bozzaIniziale().fase).toBe('lettura');
    expect(haModificheNonSalvate(bozzaIniziale())).toBe(false);
  });

  it('"Modifica" apre il carico; il testo letto la rende pulita', () => {
    expect(esegui({ tipo: 'apri' }).fase).toBe('carico');
    const b = pulita();
    expect(b.fase).toBe('pulita');
    expect(b.testo).toBe(T0);
    expect(b.versione).toBe('v0');
    expect(b.marcatore).toBe(true);
  });

  it('l ingresso diretto porta il fuoco sul passo cliccato e lo conserva fino al caricamento', () => {
    const b = esegui({ tipo: 'apri', focus: { tipo: 'passo', riga: 7 } }, { tipo: 'letto', testo: T0, versione: 'v0', marcatore: false });
    expect(b.focus).toEqual({ tipo: 'passo', riga: 7 });
    expect(esegui({ tipo: 'apri', focus: { tipo: 'titolo' } }).focus).toEqual({ tipo: 'titolo' });
    expect(esegui({ tipo: 'apri' }).focus).toBeNull();
  });

  it('uno scenario che non si puo modificare porta la ragione', () => {
    const b = esegui({ tipo: 'apri' }, { tipo: 'non-modificabile', ragione: 'registrato' });
    expect(b.fase).toBe('non-modificabile');
    expect(b.ragione).toBe('registrato');
  });

  it('una lettura fallita e un errore, da cui si riprova', () => {
    const b = esegui({ tipo: 'apri' }, { tipo: 'lettura-fallita' });
    expect(b.fase).toBe('errore');
    expect(esegui({ tipo: 'apri' }, { tipo: 'lettura-fallita' }, { tipo: 'apri' }).fase).toBe('carico');
  });
});

describe('bozza: pulita e sporca', () => {
  it('un gesto la rende sporca; tornare al testo di prima la rende di nuovo pulita', () => {
    expect(sporca().fase).toBe('sporca');
    expect(haModificheNonSalvate(sporca())).toBe(true);
    const b = riduci(sporca(), { tipo: 'modifica', testo: T0 });
    expect(b.fase).toBe('pulita');
    expect(haModificheNonSalvate(b)).toBe(false);
  });

  it('i gesti si ignorano mentre si controlla o si salva', () => {
    const controllo = riduci(sporca(), { tipo: 'controlla' });
    expect(controllo.fase).toBe('controllo');
    expect(riduci(controllo, { tipo: 'modifica', testo: 'altro' }).testo).toBe(T1);
  });

  it('"Controlla e salva" parte solo da sporca', () => {
    expect(riduci(pulita(), { tipo: 'controlla' }).fase).toBe('pulita');
    expect(riduci(sporca(), { tipo: 'controlla' }).fase).toBe('controllo');
  });
});

describe('bozza: controllo', () => {
  const inControllo = () => riduci(sporca(), { tipo: 'controlla' });

  it('con dei blocchi torna sporca, e i blocchi sono in vista', () => {
    const b = riduci(inControllo(), { tipo: 'controllato', blocchi: 1, tocca: false });
    expect(b.fase).toBe('sporca');
    expect(b.blocchiVisibili).toBe(true);
    expect(b.testo).toBe(T1);
  });

  it('senza blocchi e senza toccare altro va a salvare', () => {
    expect(riduci(inControllo(), { tipo: 'controllato', blocchi: 0, tocca: false }).fase).toBe('salvataggio');
  });

  it('se tocca altro (altri scenari, una definizione) chiede conferma', () => {
    const b = riduci(inControllo(), { tipo: 'controllato', blocchi: 0, tocca: true });
    expect(b.fase).toBe('conferma');
    expect(riduci(b, { tipo: 'conferma' }).fase).toBe('salvataggio');
    expect(riduci(b, { tipo: 'indietro' }).fase).toBe('sporca');
  });

  it('una nuova modifica toglie i blocchi dalla vista', () => {
    const b = riduci(inControllo(), { tipo: 'controllato', blocchi: 1, tocca: false });
    expect(riduci(b, { tipo: 'modifica', testo: T1 + '#' }).blocchiVisibili).toBe(false);
  });
});

describe('bozza: rinomina, che vale ovunque', () => {
  it('parte solo da pulita: si apre la conferma', () => {
    const b = riduci(pulita(), { tipo: 'chiedi-rinomina' });
    expect(b.fase).toBe('conferma');
    expect(b.conferma).toBe('rinomina');
    expect(riduci(b, { tipo: 'indietro' }).fase).toBe('pulita');
    expect(riduci(b, { tipo: 'conferma' }).fase).toBe('salvataggio');
  });

  it('da sporca non parte: dice di salvare o scartare prima', () => {
    const b = riduci(sporca(), { tipo: 'chiedi-rinomina' });
    expect(b.fase).toBe('sporca');
    expect(b.avviso).toBe('salva-prima');
    expect(b.testo).toBe(T1);
  });
});

describe('bozza: salvataggio', () => {
  const inSalvataggio = () =>
    [{ tipo: 'controlla' } as Azione, { tipo: 'controllato', blocchi: 0, tocca: false } as Azione].reduce(riduci, sporca());

  it('ok: salvata, e il testo salvato e il nuovo letto', () => {
    const b = riduci(inSalvataggio(), { tipo: 'salvata', testo: T1, versione: 'v1' });
    expect(b.fase).toBe('salvata');
    expect(b.letto).toBe(T1);
    expect(b.versione).toBe('v1');
    expect(b.testo).toBe(T1);
    expect(haModificheNonSalvate(b)).toBe(false);
  });

  it('dopo salvata, un nuovo gesto la rende sporca', () => {
    const b = [{ tipo: 'salvata', testo: T1, versione: 'v1' } as Azione, { tipo: 'modifica', testo: T0 } as Azione].reduce(riduci, inSalvataggio());
    expect(b.fase).toBe('sporca');
  });

  it('"Annulla la modifica" da salvata torna pulita col testo di prima', () => {
    const b = [{ tipo: 'salvata', testo: T1, versione: 'v1' } as Azione, { tipo: 'annullata', testo: T0, versione: 'v0' } as Azione].reduce(riduci, inSalvataggio());
    expect(b.fase).toBe('pulita');
    expect(b.testo).toBe(T0);
    expect(b.versione).toBe('v0');
  });

  it('un rifiuto non cambia il testo del tester: errore, e "Riprova" torna sporca', () => {
    const b = riduci(inSalvataggio(), { tipo: 'rifiutata', codice: 'bocciato' });
    expect(b.fase).toBe('errore');
    expect(b.errore).toBe('bocciato');
    expect(b.testo).toBe(T1);
    expect(riduci(b, { tipo: 'riprova' }).fase).toBe('sporca');
  });
});

describe('bozza: conflitto col disco', () => {
  const inConflitto = () =>
    [
      { tipo: 'controlla' } as Azione,
      { tipo: 'controllato', blocchi: 0, tocca: false } as Azione,
      { tipo: 'conflitto', attuale: { testo: 'DISCO', versione: 'v9' } } as Azione,
    ].reduce(riduci, sporca());

  it('porta in conflitto senza perdere il testo del tester', () => {
    const b = inConflitto();
    expect(b.fase).toBe('conflitto');
    expect(b.testo).toBe(T1);
    expect(b.attuale).toEqual({ testo: 'DISCO', versione: 'v9' });
    expect(haModificheNonSalvate(b)).toBe(true);
  });

  it('"Guarda la versione attuale": si adotta il disco, e il testo del tester resta da parte', () => {
    const b = riduci(inConflitto(), { tipo: 'adotta-attuale' });
    expect(b.fase).toBe('pulita');
    expect(b.testo).toBe('DISCO');
    expect(b.versione).toBe('v9');
    expect(b.miaBozza).toBe(T1);
  });

  it('"Salva comunque": si riparte con la versione di adesso', () => {
    const b = riduci(inConflitto(), { tipo: 'salva-comunque' });
    expect(b.fase).toBe('salvataggio');
    expect(b.versione).toBe('v9');
    expect(b.testo).toBe(T1);
  });

  it('un conflitto nasce anche durante il controllo', () => {
    const b = [{ tipo: 'controlla' } as Azione, { tipo: 'conflitto', attuale: { testo: 'D', versione: 'v2' } } as Azione].reduce(riduci, sporca());
    expect(b.fase).toBe('conflitto');
  });
});

describe('bozza: modifiche non salvate', () => {
  it('cambiare scenario con la bozza sporca non cambia niente finche non si sceglie', () => {
    const b = riduci(sporca(), { tipo: 'vuole-uscire', verso: '/scenari?file=x' });
    expect(b.fase).toBe('sporca');
    expect(b.testo).toBe(T1);
    expect(b.inSospeso).toEqual({ tipo: 'verso', verso: '/scenari?file=x' });
    expect(b.proseguire).toBeNull();
  });

  it('"Resta qui" non perde il testo', () => {
    const b = [{ tipo: 'vuole-uscire', verso: '/x' } as Azione, { tipo: 'scelta', scelta: 'resta' } as Azione].reduce(riduci, sporca());
    expect(b.testo).toBe(T1);
    expect(b.inSospeso).toBeNull();
    expect(b.proseguire).toBeNull();
    expect(b.fase).toBe('sporca');
  });

  it('"Scarta" perde il testo e da il via libera', () => {
    const b = [{ tipo: 'vuole-uscire', verso: '/x' } as Azione, { tipo: 'scelta', scelta: 'scarta' } as Azione].reduce(riduci, sporca());
    expect(b.testo).toBe(T0);
    expect(b.fase).toBe('pulita');
    expect(b.proseguire).toEqual({ tipo: 'verso', verso: '/x' });
    expect(riduci(b, { tipo: 'proseguito' }).proseguire).toBeNull();
  });

  it('"Salva" controlla e salva, e solo dopo da il via libera', () => {
    let b = [{ tipo: 'vuole-uscire', verso: '/x' } as Azione, { tipo: 'scelta', scelta: 'salva' } as Azione].reduce(riduci, sporca());
    expect(b.fase).toBe('controllo');
    expect(b.proseguire).toBeNull();
    b = riduci(b, { tipo: 'controllato', blocchi: 0, tocca: false });
    b = riduci(b, { tipo: 'salvata', testo: T1, versione: 'v1' });
    expect(b.fase).toBe('salvata');
    expect(b.proseguire).toEqual({ tipo: 'verso', verso: '/x' });
  });

  it('"Salva" con dei blocchi resta qui e non va da nessuna parte', () => {
    let b = [{ tipo: 'vuole-uscire', verso: '/x' } as Azione, { tipo: 'scelta', scelta: 'salva' } as Azione].reduce(riduci, sporca());
    b = riduci(b, { tipo: 'controllato', blocchi: 2, tocca: false });
    expect(b.fase).toBe('sporca');
    expect(b.inSospeso).toBeNull();
    expect(b.proseguire).toBeNull();
  });

  it('con la bozza pulita si esce subito', () => {
    const b = riduci(pulita(), { tipo: 'vuole-uscire', verso: '/x' });
    expect(b.proseguire).toEqual({ tipo: 'verso', verso: '/x' });
    expect(b.inSospeso).toBeNull();
  });

  it('"Annulla modifiche" da sporca apre lo stesso dialogo; scartando si torna al testo letto', () => {
    const b = riduci(sporca(), { tipo: 'annulla-modifiche' });
    expect(b.inSospeso).toEqual({ tipo: 'annulla-modifiche' });
    const c = riduci(b, { tipo: 'scelta', scelta: 'scarta' });
    expect(c.testo).toBe(T0);
    expect(c.fase).toBe('pulita');
  });

  it('"Esci dalla modifica" torna in lettura', () => {
    const b = riduci(pulita(), { tipo: 'esci' });
    expect(b.fase).toBe('lettura');
  });
});
