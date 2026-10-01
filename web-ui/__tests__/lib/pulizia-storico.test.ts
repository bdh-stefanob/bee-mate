import { describe, it, expect, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { cosaCancellare, ripulisciStorico, idDelFile, type FileStorico } from '@/lib/pulizia-storico';

/** Un id nella forma del registro: 8 caratteri di base 36 col numero d'ordine. */
const ts = (n: number) => `m${String(n).padStart(7, '0')}`;
const f = (nome: string, mtimeMs: number, byte = 100): FileStorico => ({ nome, mtimeMs, byte });
/** Le due facce di un'esecuzione di test. */
const coppia = (n: number): FileStorico[] => [f(`test-${ts(n)}-1.json`, n), f(`test-${ts(n)}-1.ndjson`, n, 5000)];

describe('idDelFile', () => {
  it('riconosce i file che il registro scrive', () => {
    expect(idDelFile('test-muo7kv2k-3.json')).toEqual({ id: 'test-muo7kv2k-3', tipo: 'test' });
    expect(idDelFile('test-muo7kv2k.ndjson')).toEqual({ id: 'test-muo7kv2k', tipo: 'test' });
    // Il rapporto HTML di una prova (~1 MB) e' dell'esecuzione come gli altri due.
    // Un id di sole lettere e' un id (e' successo: catalogo-munydlet).
    expect(idDelFile('catalogo-munydlet.json')).toEqual({ id: 'catalogo-munydlet', tipo: 'catalogo' });
    expect(idDelFile('test-muo7kv2k-3.html')).toEqual({ id: 'test-muo7kv2k-3', tipo: 'test' });
    expect(idDelFile('installa-browser-muo7kv2k-2.json')).toEqual({ id: 'installa-browser-muo7kv2k-2', tipo: 'installa-browser' });
  });

  it.each([
    'catalogo-stato.json',
    'generazione-manifesto.json',
    'catalogo-messages.ndjson',
    'catalogo.ndjson',
    'esiti-scenari.json',
    'test-muo7kv2k-3.tmp',
    'test-muo7kv2k-3.json.illeggibile',
    'misterioso-muo7kv2k-3.json',
  ])('non tocca %s: non e\' un\'esecuzione', (nome) => {
    expect(idDelFile(nome)).toBeNull();
  });
});

describe('cosaCancellare', () => {
  it('sotto il limite non cancella niente', () => {
    const file = [...coppia(1), ...coppia(2)];
    expect(cosaCancellare(file, { tieni: 5, referenziate: [], inCorso: [] })).toEqual([]);
  });

  it('tiene le ultime N per tipo e cancella le piu\' vecchie, con tutti i loro file', () => {
    const file = [...coppia(1), ...coppia(2), ...coppia(3), ...coppia(4)];
    const via = cosaCancellare(file, { tieni: 2, referenziate: [], inCorso: [] });
    expect(via.sort()).toEqual([
      `test-${ts(1)}-1.json`, `test-${ts(1)}-1.ndjson`,
      `test-${ts(2)}-1.json`, `test-${ts(2)}-1.ndjson`,
    ].sort());
  });

  it('un\'esecuzione a cui l\'indice punta ancora non si cancella, anche se vecchia', () => {
    const file = [...coppia(1), ...coppia(2), ...coppia(3)];
    const via = cosaCancellare(file, { tieni: 1, referenziate: [`test-${ts(1)}-1`], inCorso: [] });
    expect(via.sort()).toEqual([`test-${ts(2)}-1.json`, `test-${ts(2)}-1.ndjson`].sort());
  });

  it('un\'esecuzione in corso non si cancella mai', () => {
    const file = [...coppia(1), ...coppia(2), ...coppia(3)];
    const via = cosaCancellare(file, { tieni: 1, referenziate: [], inCorso: [`test-${ts(1)}-1`] });
    expect(via).not.toContain(`test-${ts(1)}-1.json`);
    expect(via).not.toContain(`test-${ts(1)}-1.ndjson`);
  });

  it('le protette non contano nel limite: restano le ultime N piu\' le protette', () => {
    const file = [...coppia(1), ...coppia(2), ...coppia(3), ...coppia(4)];
    const via = cosaCancellare(file, { tieni: 2, referenziate: [`test-${ts(1)}-1`], inCorso: [] });
    expect(via.sort()).toEqual([`test-${ts(2)}-1.json`, `test-${ts(2)}-1.ndjson`].sort());
  });

  it('il limite e\' per tipo: tante registrazioni non mandano via i test', () => {
    const registrazioni = [1, 2, 3, 4, 5].map((n) => f(`registrazione-${ts(n)}-1.json`, 100 + n));
    const via = cosaCancellare([...coppia(1), ...registrazioni], { tieni: 2, referenziate: [], inCorso: [] });
    expect(via.sort()).toEqual([
      `registrazione-${ts(1)}-1.json`, `registrazione-${ts(2)}-1.json`, `registrazione-${ts(3)}-1.json`,
    ].sort());
  });

  it('l\'ordine e\' quello dell\'ultima scrittura, non quello dei nomi', () => {
    const file = [f(`test-${ts(9)}-1.json`, 1), f(`test-${ts(1)}-1.json`, 999)];
    expect(cosaCancellare(file, { tieni: 1, referenziate: [], inCorso: [] })).toEqual([`test-${ts(9)}-1.json`]);
  });

  it('i file che non sono esecuzioni non finiscono mai nell\'elenco', () => {
    const file = [
      f('catalogo-stato.json', 1), f('generazione-manifesto.json', 1), f('catalogo-messages.ndjson', 1),
      ...coppia(1), ...coppia(2),
    ];
    const via = cosaCancellare(file, { tieni: 0, referenziate: [], inCorso: [] });
    expect(via).not.toContain('catalogo-stato.json');
    expect(via).not.toContain('generazione-manifesto.json');
    expect(via).not.toContain('catalogo-messages.ndjson');
    expect(via).toHaveLength(4);
  });
});

describe('ripulisciStorico (su disco)', () => {
  let tmp: string | null = null;
  afterEach(() => {
    if (tmp) fs.rmSync(tmp, { recursive: true, force: true });
    tmp = null;
  });

  function prepara(): { radice: string; dir: string } {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pulizia-'));
    const dir = path.join(tmp, 'reports', 'cruscotto');
    fs.mkdirSync(dir, { recursive: true });
    return { radice: tmp, dir };
  }

  function scrivi(dir: string, nome: string, secondiFa: number, contenuto = 'x'): void {
    const p = path.join(dir, nome);
    fs.writeFileSync(p, contenuto);
    const t = new Date(Date.now() - secondiFa * 1000);
    fs.utimesSync(p, t, t);
  }

  const indice = (radice: string, esecuzioni: string[]) =>
    fs.writeFileSync(
      path.join(radice, 'reports', 'esiti-scenari.json'),
      JSON.stringify({
        versione: 1,
        voci: esecuzioni.map((e, i) => ({
          file: 'a.feature', nome: `s${i}`, esito: 'fallito', quando: '2026-09-30T10:00:00.000Z', durataMs: 1,
          ambiente: 'demo', esecuzione: e, impronta: 'i',
        })),
      })
    );

  it('cancella le vecchie, tiene le recenti e quelle dell\'indice, e riporta lo spazio', () => {
    const { radice, dir } = prepara();
    scrivi(dir, `test-${ts(1)}-1.json`, 400);
    scrivi(dir, `test-${ts(1)}-1.ndjson`, 400, 'a'.repeat(1000));
    scrivi(dir, `test-${ts(2)}-1.json`, 300);
    scrivi(dir, `test-${ts(2)}-1.ndjson`, 300, 'b'.repeat(500));
    scrivi(dir, `test-${ts(3)}-1.json`, 200);
    scrivi(dir, `test-${ts(4)}-1.json`, 100);
    scrivi(dir, 'catalogo-stato.json', 9999);
    indice(radice, [`test-${ts(1)}-1`]);

    const r = ripulisciStorico(radice, { tieni: 2, inCorso: [] });
    expect(r.cancellati).toBe(2);
    expect(r.byteLiberati).toBe(501);
    expect(fs.existsSync(path.join(dir, `test-${ts(1)}-1.ndjson`))).toBe(true);
    expect(fs.existsSync(path.join(dir, `test-${ts(2)}-1.ndjson`))).toBe(false);
    expect(fs.existsSync(path.join(dir, `test-${ts(3)}-1.json`))).toBe(true);
    expect(fs.existsSync(path.join(dir, 'catalogo-stato.json'))).toBe(true);
  });

  it('senza indice non cancella niente: non sa cosa serve', () => {
    const { radice, dir } = prepara();
    for (let n = 1; n <= 4; n++) scrivi(dir, `test-${ts(n)}-1.json`, 500 - n);
    expect(ripulisciStorico(radice, { tieni: 1, inCorso: [] }).cancellati).toBe(0);
    expect(fs.readdirSync(dir)).toHaveLength(4);
  });

  it('con un indice illeggibile non cancella niente', () => {
    const { radice, dir } = prepara();
    for (let n = 1; n <= 4; n++) scrivi(dir, `test-${ts(n)}-1.json`, 500 - n);
    fs.writeFileSync(path.join(radice, 'reports', 'esiti-scenari.json'), '{non json');
    expect(ripulisciStorico(radice, { tieni: 1, inCorso: [] }).cancellati).toBe(0);
    expect(fs.readdirSync(dir)).toHaveLength(4);
  });

  it('un\'esecuzione in corso resta anche se vecchissima', () => {
    const { radice, dir } = prepara();
    scrivi(dir, `test-${ts(1)}-1.json`, 9000);
    scrivi(dir, `test-${ts(2)}-1.json`, 100);
    scrivi(dir, `test-${ts(3)}-1.json`, 50);
    indice(radice, []);
    ripulisciStorico(radice, { tieni: 1, inCorso: [`test-${ts(1)}-1`] });
    expect(fs.existsSync(path.join(dir, `test-${ts(1)}-1.json`))).toBe(true);
    expect(fs.existsSync(path.join(dir, `test-${ts(2)}-1.json`))).toBe(false);
  });

  it('una cartella che non c\'e\' non da errore', () => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pulizia-'));
    expect(ripulisciStorico(tmp, { tieni: 1, inCorso: [] })).toEqual({ cancellati: 0, byteLiberati: 0 });
  });
});
