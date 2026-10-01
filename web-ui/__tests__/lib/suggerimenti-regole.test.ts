import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  validaCompito,
  validaPropostaOggetto,
  type Compito,
  type PassoCompito,
} from '@/lib/suggerimenti-contratto';
import { proponiConRegole, vistaSuggerimenti } from '@/lib/suggerimenti-regole';

const CARTELLA = path.resolve(__dirname, '..', '..', '..', 'test-fixtures', 'assistente');
const grezzo = JSON.parse(fs.readFileSync(path.join(CARTELLA, 'compito.json'), 'utf-8'));

function compito(passi?: PassoCompito[]): Compito {
  const e = validaCompito(passi ? { ...grezzo, passi } : grezzo);
  if (!e.ok) throw new Error(e.motivo);
  return e.compito;
}

const cand = (voce: string, classe: 'stessi-componenti' | 'formulazione-simile', extra = {}) => ({
  voce, classe, stato: 'wanted' as const, parametri: false, ...extra,
});
const passo = (n: number, candidati: PassoCompito['candidati']): PassoCompito => ({
  n, parola: 'When', etichetta: `passo ${n}`, anche: [], candidati,
});

describe('proponiConRegole', () => {
  it('per ogni passo propone il primo candidato agganciato ai componenti, e "nessuna" dove non ce n\'e\'', () => {
    const p = proponiConRegole(compito());
    expect(p.origin).toBe('deterministico');
    expect(p.strumento).toEqual({ nome: 'regole' });
    const per = Object.fromEntries(p.proposte.map((r) => [r.passo, r]));
    expect(per[1]).toMatchObject({ scelta: 'voce', voce: 'the user is logged in' });
    expect(per[2]).toMatchObject({ scelta: 'voce', voce: 'the user confirms the order' });
    expect(per[4]).toMatchObject({ scelta: 'nessuna' });
  });

  it('senza agganciati, il primo candidato per formulazione', () => {
    const p = proponiConRegole(
      compito([passo(1, [cand('a b c', 'formulazione-simile', { somiglianza: 70 }), cand('d e f', 'formulazione-simile', { somiglianza: 50 })])])
    );
    expect(p.proposte).toEqual([{ passo: 1, scelta: 'voce', voce: 'a b c' }]);
  });

  it('un agganciato batte una stima, anche se la stima viene prima nell\'elenco', () => {
    const p = proponiConRegole(
      compito([passo(1, [cand('stima', 'formulazione-simile', { somiglianza: 90 }), cand('prova', 'stessi-componenti')])])
    );
    expect(p.proposte).toEqual([{ passo: 1, scelta: 'voce', voce: 'prova' }]);
  });

  it('non inventa frasi: ogni voce proposta e\' un candidato di quel passo, e il validatore la accetta', () => {
    const c = compito();
    const esito = validaPropostaOggetto(proponiConRegole(c), c);
    expect(esito.tipo).toBe('valida');
    if (esito.tipo !== 'valida') return;
    expect(esito.scartate).toEqual([]);
    for (const r of esito.righe) {
      if (r.scelta !== 'voce') continue;
      expect(c.passi.find((x) => x.n === r.passo)!.candidati.map((x) => x.voce)).toContain(r.voce);
    }
  });

  it('e\' ripetibile: lo stesso compito, la stessa proposta', () => {
    expect(JSON.stringify(proponiConRegole(compito()))).toBe(JSON.stringify(proponiConRegole(compito())));
  });

  it('un catalogo senza candidati da\' solo "nessuna"', () => {
    const p = proponiConRegole(compito([passo(1, []), passo(2, [])]));
    expect(p.proposte.every((r) => r.scelta === 'nessuna')).toBe(true);
  });

  it('porta l\'impronta e l\'id del compito, cosi\' scade se il catalogo cambia', () => {
    const c = compito();
    const p = proponiConRegole(c);
    expect(p.compito).toBe(c.id);
    expect(p.impronta).toBe(c.catalogo.impronta);
  });
});

describe('vistaSuggerimenti', () => {
  it('per ogni riga con una voce: la frase del tester, quella del catalogo, la classe e se si applica', () => {
    const c = compito();
    const v = vistaSuggerimenti(c, proponiConRegole(c).proposte.map((r) => ({ ...r, origin: 'deterministico' as const })));
    const per = Object.fromEntries(v.map((x) => [x.passo, x]));
    expect(per[2]).toMatchObject({
      etichetta: "Conferma l'ordine",
      voce: 'the user confirms the order',
      classe: 'stessi-componenti',
      motivoNonApplicabile: null,
    });
    expect(per[1].motivoNonApplicabile).toBe('gia-realizzata');
    expect(per[5].motivoNonApplicabile).toBe('parametri'); // proposta, ma non si applica
    expect(per[4]).toBeUndefined(); // "nessuna": non c'e' riga
  });

  it('una stima porta la somiglianza', () => {
    const c = compito();
    const v = vistaSuggerimenti(c, [{ passo: 3, scelta: 'voce', voce: 'the order total is shown', origin: 'deterministico' }]);
    expect(v[0]).toMatchObject({ classe: 'formulazione-simile', somiglianza: 58 });
  });

  it('il numero di righe applicabili decide se il riquadro compare', () => {
    const c = compito();
    const solo = vistaSuggerimenti(c, [{ passo: 1, scelta: 'voce', voce: 'the user is logged in', origin: 'deterministico' }]);
    expect(solo.filter((x) => x.motivoNonApplicabile === null)).toHaveLength(0);
  });
});
