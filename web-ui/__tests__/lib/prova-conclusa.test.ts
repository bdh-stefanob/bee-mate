import { describe, it, expect, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { idProvaValido, leggiProvaConclusa, provaEsiste } from '@/lib/prova-conclusa';

const FIXTURE = path.join(__dirname, '..', 'fixtures', 'messaggi-con-schermata.ndjson');

let tmp: string | null = null;
afterEach(() => {
  if (tmp) fs.rmSync(tmp, { recursive: true, force: true });
  tmp = null;
});

function radice(): string {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'prova-'));
  fs.mkdirSync(path.join(tmp, 'reports', 'cruscotto'), { recursive: true });
  return tmp;
}

describe('idProvaValido', () => {
  it('accetta un id di esecuzione com\'e\' fatto dal registro', () => {
    expect(idProvaValido('test-muo7kv2k')).toBe(true);
    expect(idProvaValido('test-mudrp7gp-12')).toBe(true);
  });

  it.each([
    ['vuoto', ''],
    ['percorso verso l\'alto', '../esiti-scenari'],
    ['barra', 'test-a/b'],
    ['barra rovesciata', 'test-a\\b'],
    ['punto', 'test-a.json'],
    ['maiuscole', 'TEST-A'],
    ['spazio', 'test a'],
    ['byte nullo', 'test-a\u0000'],
    ['troppo lungo', 'a'.repeat(81)],
  ])('rifiuta %s', (_nome, id) => {
    expect(idProvaValido(id)).toBe(false);
  });

  it('rifiuta cio\' che non e\' una stringa', () => {
    expect(idProvaValido(null)).toBe(false);
    expect(idProvaValido(undefined)).toBe(false);
    expect(idProvaValido(42 as unknown as string)).toBe(false);
  });
});

describe('leggiProvaConclusa', () => {
  it('un id non valido non apre niente, nemmeno se il file esiste', () => {
    const r = radice();
    fs.writeFileSync(path.join(r, 'reports', 'esiti-scenari.json'), '{}');
    expect(leggiProvaConclusa(r, '../esiti-scenari')).toEqual({ stato: 'non-valida' });
  });

  it('un id valido senza file dice che non c\'e\' piu\'', () => {
    const r = radice();
    expect(leggiProvaConclusa(r, 'test-aaaaaaaa')).toEqual({ stato: 'assente' });
    expect(provaEsiste(r, 'test-aaaaaaaa')).toBe(false);
  });

  it('legge i passi dal file dei messaggi, con la schermata del rosso', () => {
    const r = radice();
    fs.copyFileSync(FIXTURE, path.join(r, 'reports', 'cruscotto', 'test-aaaaaaaa.ndjson'));
    const lettura = leggiProvaConclusa(r, 'test-aaaaaaaa');
    expect(lettura.stato).toBe('ok');
    if (lettura.stato !== 'ok') return;
    expect(lettura.passi.length).toBeGreaterThan(0);
    expect(lettura.passi.some((p) => p.esito === 'fallito' && p.schermata?.startsWith('data:image/'))).toBe(true);
    expect(provaEsiste(r, 'test-aaaaaaaa')).toBe(true);
  });

  it('quando e ambiente vengono dallo stato su disco e dall\'indice', () => {
    const r = radice();
    const dir = path.join(r, 'reports', 'cruscotto');
    fs.copyFileSync(FIXTURE, path.join(dir, 'test-aaaaaaaa.ndjson'));
    fs.writeFileSync(
      path.join(dir, 'test-aaaaaaaa.json'),
      JSON.stringify({ id: 'test-aaaaaaaa', avvio: '2026-09-30T10:00:00.000Z', fine: '2026-09-30T10:00:05.000Z' })
    );
    fs.writeFileSync(
      path.join(r, 'reports', 'esiti-scenari.json'),
      JSON.stringify({
        versione: 1,
        voci: [
          {
            file: 'a.feature', nome: 'x', esito: 'fallito', quando: '2026-09-30T10:00:05.000Z', durataMs: 5000,
            ambiente: 'demo', esecuzione: 'test-aaaaaaaa', impronta: 'i',
          },
        ],
      })
    );
    const lettura = leggiProvaConclusa(r, 'test-aaaaaaaa');
    expect(lettura.stato).toBe('ok');
    if (lettura.stato !== 'ok') return;
    expect(lettura.quando).toBe('2026-09-30T10:00:05.000Z');
    expect(lettura.ambiente).toBe('demo');
  });

  it('un esito ricostruito senza ambiente si apre lo stesso: ambiente null', () => {
    const r = radice();
    const dir = path.join(r, 'reports', 'cruscotto');
    fs.copyFileSync(FIXTURE, path.join(dir, 'test-bbbbbbb1.ndjson'));
    fs.writeFileSync(
      path.join(r, 'reports', 'esiti-scenari.json'),
      JSON.stringify({
        versione: 1,
        voci: [
          {
            file: 'a.feature', nome: 'x', esito: 'fallito', quando: '2026-09-30T10:00:05.000Z', durataMs: 5000,
            ambiente: null, esecuzione: 'test-bbbbbbb1', impronta: 'i',
          },
        ],
      })
    );
    const lettura = leggiProvaConclusa(r, 'test-bbbbbbb1');
    expect(lettura.stato).toBe('ok');
    if (lettura.stato !== 'ok') return;
    expect(lettura.ambiente).toBeNull();
    // Senza file di stato, il momento e' quello dell'ultima scrittura dei messaggi.
    expect(Number.isNaN(Date.parse(lettura.quando ?? ''))).toBe(false);
  });
});
