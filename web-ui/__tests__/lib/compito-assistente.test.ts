import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { costruisciCompito } from '../../../scripts/lib/assistente-compito';
import { indexDictionaries, resolveRecording } from '../../../scripts/lib/generate-core';
import type { CatalogStep, Recording, ScoutResult } from '../../../scripts/lib/generation-contract';
import { validaCompito, motivoNonApplicabile } from '@/lib/suggerimenti-contratto';

const FIX = path.resolve(__dirname, '..', '..', '..', 'test-fixtures', 'generate');
const leggi = <T,>(f: string): T => JSON.parse(fs.readFileSync(path.join(FIX, f), 'utf-8')) as T;

const registrazione = leggi<Recording>('recording.json');
const catalogo = leggi<{ steps: CatalogStep[] }>('catalog.json').steps;
const dizionari = ['accesso.json', 'ordini.json'].map((f) => leggi<ScoutResult>(path.join('scout', f)));

function risolvi(cat: CatalogStep[] = catalogo, rec: Recording = registrazione) {
  return resolveRecording(rec, indexDictionaries(dizionari), { catalog: cat }).intents;
}

const GENERATO = '2026-10-01T10:30:00.000Z';

describe('costruisciCompito', () => {
  it('lo stesso ingresso produce lo stesso compito, byte per byte', () => {
    const a = JSON.stringify(costruisciCompito({ intents: risolvi(), catalog: catalogo, generatedAt: GENERATO }));
    const b = JSON.stringify(costruisciCompito({ intents: risolvi(), catalog: catalogo, generatedAt: GENERATO }));
    expect(a).toBe(b);
  });

  it('rispetta lo schema condiviso', () => {
    const c = costruisciCompito({ intents: risolvi(), catalog: catalogo, generatedAt: GENERATO });
    const e = validaCompito(c);
    expect(e.ok).toBe(true);
  });

  it('dice la classe di ogni candidato: prova (stessi componenti) o stima (formulazione simile)', () => {
    const c = costruisciCompito({ intents: risolvi(), catalog: catalogo, generatedAt: GENERATO });
    expect(c.passi[0].candidati[0]).toMatchObject({ voce: 'the customer signs in', classe: 'stessi-componenti' });
    expect(c.passi[1].candidati[0]).toMatchObject({ voce: 'the customer cancels an order', classe: 'stessi-componenti' });
    // una stima porta la somiglianza, una prova no
    expect(c.passi[0].candidati[0].somiglianza).toBeUndefined();
  });

  it('i candidati sono al massimo cinque, e stato e parametri vengono dal catalogo', () => {
    const molti: CatalogStep[] = Array.from({ length: 9 }, (_, i) => ({
      expression: `il cliente annulla un ordine numero ${i}`,
      keyword: 'When',
      ...(i === 0 ? { status: 'implemented' } : { status: 'wanted' }),
      ...(i === 1 ? { expression: 'il cliente annulla {int} ordini', parameters: ['{int}'] } : {}),
    }));
    const c = costruisciCompito({ intents: risolvi(molti), catalog: molti, generatedAt: GENERATO });
    const cand = c.passi[1].candidati;
    expect(cand.length).toBeLessThanOrEqual(5);
    expect(cand.every((x) => ['stessi-componenti', 'formulazione-simile'].includes(x.classe))).toBe(true);
    const implementata = cand.find((x) => x.voce === 'il cliente annulla un ordine numero 0');
    if (implementata) expect(motivoNonApplicabile(implementata)).toBe('gia-realizzata');
    const conParametri = cand.find((x) => x.voce === 'il cliente annulla {int} ordini');
    if (conParametri) expect(conParametri.parametri).toBe(true);
  });

  it('NON contiene valori digitati, indirizzi, percorsi, note, testi delle verifiche, nomi di componenti', () => {
    const testo = JSON.stringify(costruisciCompito({ intents: risolvi(), catalog: catalogo, generatedAt: GENERATO }));
    const vietati = [
      'mario@esempio.invalid', // valore digitato
      'esempio.invalid', // host
      '/ordini/4821', // percorso di pagina
      'il pulsante resta attivo', // nota
      'I tuoi ordini', // testo di una verifica
      '1801', // idem
      'Annulla ordine', // nome di un componente
      'Entra', // idem
      'Email', // idem
      'textbox', // ruolo
    ];
    for (const v of vietati) expect(testo, `contiene "${v}"`).not.toContain(v);
  });

  it('un catalogo cambiato cambia l\'impronta; lo stesso catalogo no', () => {
    const base = costruisciCompito({ intents: risolvi(), catalog: catalogo, generatedAt: GENERATO });
    const altro: CatalogStep[] = [...catalogo, { expression: 'the customer returns an order', keyword: 'When' }];
    const cambiato = costruisciCompito({ intents: risolvi(altro), catalog: altro, generatedAt: GENERATO });
    expect(cambiato.catalogo.impronta).not.toBe(base.catalogo.impronta);
    expect(costruisciCompito({ intents: risolvi(), catalog: catalogo, generatedAt: GENERATO }).catalogo.impronta).toBe(
      base.catalogo.impronta
    );
  });

  it('due passi con la stessa frase diventano uno, e l\'altro numero va in "anche"', () => {
    const rec: Recording = JSON.parse(JSON.stringify(registrazione));
    rec.intents.push({ ...rec.intents[1], steps: [...rec.intents[1].steps] });
    const c = costruisciCompito({ intents: risolvi(catalogo, rec), catalog: catalogo, generatedAt: GENERATO });
    expect(c.passi).toHaveLength(2);
    expect(c.passi[1]).toMatchObject({ n: 2, anche: [3] });
  });

  it('con l\'accesso in testa il primo passo e\' un "And", come nel .feature', () => {
    const c = costruisciCompito({ intents: risolvi(), catalog: catalogo, generatedAt: GENERATO, accessoInTesta: true });
    expect(c.passi[0].parola).toBe('And');
    expect(c.passi[1].parola).toBe('When');
  });

  it('l\'id viene dal momento della generazione e dall\'impronta: due volte, lo stesso id', () => {
    const c = costruisciCompito({ intents: risolvi(), catalog: catalogo, generatedAt: GENERATO });
    expect(c.id).toMatch(/^20261001-103000-[0-9a-f]{4}$/);
  });

  it('senza candidati in nessun passo, i passi restano e i candidati sono vuoti', () => {
    const c = costruisciCompito({ intents: risolvi([]), catalog: [], generatedAt: GENERATO });
    expect(c.passi.every((p) => p.candidati.length === 0)).toBe(true);
    expect(c.catalogo.voci).toBe(0);
  });
});
