import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  validaCompito,
  validaPropostaOggetto,
  validaPropostaTesto,
  motivoNonApplicabile,
  type Compito,
} from '@/lib/suggerimenti-contratto';

const CARTELLA = path.resolve(__dirname, '..', '..', '..', 'test-fixtures', 'assistente');
const leggi = (nome: string) => JSON.parse(fs.readFileSync(path.join(CARTELLA, nome), 'utf-8'));

const compitoGrezzo = leggi('compito.json');
const proposta = leggi('proposta-valida.json');
const avversarie = leggi('avversarie.json') as {
  base: Record<string, unknown>;
  casi: Array<{
    nome: string;
    atteso: 'rifiutata' | 'scaduta' | 'righe-scartate';
    extra?: Record<string, unknown>;
    override?: Record<string, unknown>;
    proposte: unknown;
  }>;
};

function compito(): Compito {
  const e = validaCompito(compitoGrezzo);
  if (!e.ok) throw new Error(`fixture del compito non valida: ${e.motivo}`);
  return e.compito;
}

describe('validaCompito', () => {
  it('accetta il compito di esempio', () => {
    expect(validaCompito(compitoGrezzo).ok).toBe(true);
  });

  it('rifiuta un campo sconosciuto, uno schema diverso, una classe che non esiste', () => {
    expect(validaCompito({ ...compitoGrezzo, valori: ['x'] }).ok).toBe(false);
    expect(validaCompito({ ...compitoGrezzo, schema: 2 }).ok).toBe(false);
    const passi = JSON.parse(JSON.stringify(compitoGrezzo.passi));
    passi[1].candidati[0].classe = 'a-sensazione';
    expect(validaCompito({ ...compitoGrezzo, passi }).ok).toBe(false);
  });

  it('rifiuta piu\' di cinque candidati per passo', () => {
    const passi = JSON.parse(JSON.stringify(compitoGrezzo.passi));
    passi[1].candidati = Array.from({ length: 6 }, (_, i) => ({
      voce: `voce ${i}`, classe: 'formulazione-simile', stato: 'wanted', parametri: false,
    }));
    expect(validaCompito({ ...compitoGrezzo, passi }).ok).toBe(false);
  });

  it('rifiuta due passi con lo stesso numero', () => {
    const passi = JSON.parse(JSON.stringify(compitoGrezzo.passi));
    passi[1].n = 1;
    expect(validaCompito({ ...compitoGrezzo, passi }).ok).toBe(false);
  });

  it('rifiuta un id che potrebbe essere un percorso', () => {
    expect(validaCompito({ ...compitoGrezzo, id: '../../x' }).ok).toBe(false);
  });
});

describe('motivoNonApplicabile', () => {
  const c = compito();
  it('una voce wanted e senza parametri si applica', () => {
    expect(motivoNonApplicabile(c.passi[1].candidati[0])).toBeNull();
  });
  it('una voce gia\' realizzata no', () => {
    expect(motivoNonApplicabile(c.passi[0].candidati[0])).toBe('gia-realizzata');
  });
  it('una voce con parametri no', () => {
    expect(motivoNonApplicabile(c.passi[4].candidati[0])).toBe('parametri');
  });
  it('una voce con virgolette, barre o dollari no: finirebbe dentro una stringa del codice', () => {
    for (const voce of ['the user sees "x"', "the user's cart", 'a \\ b', 'costs $5', 'a`b']) {
      expect(
        motivoNonApplicabile({ voce, classe: 'formulazione-simile', stato: 'wanted', parametri: false })
      ).toBe('caratteri');
    }
  });
  it('una voce deprecata no', () => {
    expect(
      motivoNonApplicabile({ voce: 'x', classe: 'formulazione-simile', stato: 'deprecated', parametri: false })
    ).toBe('non-wanted');
  });
});

describe('validaPropostaOggetto', () => {
  it('una proposta valida passa, e ogni riga porta l\'origine del file', () => {
    const e = validaPropostaOggetto(proposta, compito());
    expect(e.tipo).toBe('valida');
    if (e.tipo !== 'valida') return;
    expect(e.origin).toBe('assistito');
    expect(e.righe).toHaveLength(3);
    expect(e.righe.every((r) => r.origin === 'assistito')).toBe(true);
    expect(e.scartate).toEqual([]);
  });

  it('una riga puo\' ripetere l\'origine del file, non contraddirla', () => {
    const ok = validaPropostaOggetto(
      { ...proposta, proposte: [{ passo: 4, scelta: 'nessuna', origin: 'assistito' }] },
      compito()
    );
    expect(ok.tipo).toBe('valida');
    const no = validaPropostaOggetto(
      { ...proposta, proposte: [{ passo: 4, scelta: 'nessuna', origin: 'deterministico' }] },
      compito()
    );
    expect(no.tipo).toBe('valida');
    if (no.tipo === 'valida') {
      expect(no.righe).toHaveLength(0);
      expect(no.scartate).toHaveLength(1);
    }
  });

  it('una riga scartata non fa cadere le altre', () => {
    const e = validaPropostaOggetto(
      {
        ...proposta,
        proposte: [
          { passo: 2, scelta: 'voce', voce: 'inventata' },
          { passo: 3, scelta: 'voce', voce: 'the order total is shown' },
        ],
      },
      compito()
    );
    expect(e.tipo).toBe('valida');
    if (e.tipo !== 'valida') return;
    expect(e.righe.map((r) => r.passo)).toEqual([3]);
    expect(e.scartate).toEqual([{ passo: 2, motivo: 'voce-non-candidata' }]);
  });

  it('un file rifiutato non lascia righe applicabili', () => {
    const e = validaPropostaOggetto({ ...proposta, istruzioni: 'x' }, compito());
    expect(e.tipo).toBe('rifiutata');
    expect('righe' in e).toBe(false);
  });

  it('il testo di "perche" resta testo: markup e collegamenti passano com\'e\'', () => {
    const perche = '<b>ciao</b> [x](http://esempio.invalid)';
    const e = validaPropostaOggetto(
      { ...proposta, proposte: [{ passo: 4, scelta: 'nessuna', perche }] },
      compito()
    );
    expect(e.tipo).toBe('valida');
    if (e.tipo === 'valida') expect(e.righe[0].perche).toBe(perche);
  });

  it('"perche" di esattamente 200 caratteri passa, di 201 no', () => {
    const riga = (n: number) => ({ passo: 4, scelta: 'nessuna', perche: 'a'.repeat(n) });
    const a = validaPropostaOggetto({ ...proposta, proposte: [riga(200)] }, compito());
    const b = validaPropostaOggetto({ ...proposta, proposte: [riga(201)] }, compito());
    expect(a.tipo === 'valida' && a.righe.length).toBe(1);
    expect(b.tipo === 'valida' && b.righe.length).toBe(0);
  });

  it('le regole dichiarano origin deterministico, e solo loro', () => {
    const regole = {
      ...proposta,
      origin: 'deterministico',
      strumento: { nome: 'regole' },
      proposte: [{ passo: 2, scelta: 'voce', voce: 'the user confirms the order' }],
    };
    expect(validaPropostaOggetto(regole, compito()).tipo).toBe('valida');
    expect(validaPropostaOggetto({ ...regole, strumento: { nome: 'kiro-ide' } }, compito()).tipo).toBe('rifiutata');
  });

  describe('l\'insieme avversario e\' rifiutato al 100%', () => {
    for (const caso of avversarie.casi) {
      it(caso.nome, () => {
        const grezza = { ...avversarie.base, ...(caso.extra ?? {}), proposte: caso.proposte, ...(caso.override ?? {}) };
        const e = validaPropostaOggetto(grezza, compito());
        if (caso.atteso === 'righe-scartate') {
          expect(e.tipo).toBe('valida');
          if (e.tipo === 'valida') {
            expect(e.righe).toHaveLength(0);
            expect(e.scartate.length).toBeGreaterThan(0);
          }
        } else {
          expect(e.tipo).toBe(caso.atteso);
        }
      });
    }
  });
});

describe('validaPropostaTesto', () => {
  const testo = JSON.stringify(proposta);

  it('un JSON nudo passa', () => {
    expect(validaPropostaTesto(testo, compito()).tipo).toBe('valida');
  });

  it('un solo blocco di codice, senza altro attorno, passa', () => {
    expect(validaPropostaTesto('```json\n' + testo + '\n```', compito()).tipo).toBe('valida');
  });

  it('un blocco di codice con testo attorno e\' rifiutato', () => {
    const e = validaPropostaTesto('Ecco la proposta:\n```json\n' + testo + '\n```\nSpero vada bene.', compito());
    expect(e).toMatchObject({ tipo: 'rifiutata', motivo: 'testo-attorno' });
  });

  it('due blocchi sono rifiutati', () => {
    const e = validaPropostaTesto('```json\n' + testo + '\n```\n```json\n' + testo + '\n```', compito());
    expect(e).toMatchObject({ tipo: 'rifiutata', motivo: 'blocchi-multipli' });
  });

  it('non JSON e\' rifiutato', () => {
    expect(validaPropostaTesto('ciao', compito())).toMatchObject({ tipo: 'rifiutata', motivo: 'non-json' });
    expect(validaPropostaTesto('{ rotto', compito())).toMatchObject({ tipo: 'rifiutata', motivo: 'non-json' });
  });

  it('oltre 64 KB e\' rifiutato prima di essere letto', () => {
    const grande = JSON.stringify({ ...proposta, proposte: [{ passo: 4, scelta: 'nessuna', perche: 'a'.repeat(70_000) }] });
    expect(validaPropostaTesto(grande, compito())).toMatchObject({ tipo: 'rifiutata', motivo: 'troppo-grande' });
  });

  it('un array al posto dell\'oggetto e\' rifiutato', () => {
    expect(validaPropostaTesto('[]', compito())).toMatchObject({ tipo: 'rifiutata', motivo: 'non-oggetto' });
  });
});
