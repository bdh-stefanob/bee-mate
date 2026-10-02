import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { leggiPassiTest } from '@/lib/artefatti';
import { leggiPassiTestIncrementale, statistichePassi, azzeraCachePassi } from '@/lib/passi-incrementali';

const FIXTURES = path.join(__dirname, '..', 'fixtures');
const COMPLETO = fs.readFileSync(path.join(FIXTURES, 'messaggi.ndjson'), 'utf-8');
const CON_SCHERMATA = fs.readFileSync(path.join(FIXTURES, 'messaggi-con-schermata.ndjson'), 'utf-8');

let tmp: string;
let file: string;
beforeEach(() => {
  azzeraCachePassi();
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'passi-incr-'));
  file = path.join(tmp, 'test-aaaaaaaa.ndjson');
});
afterEach(() => {
  fs.rmSync(tmp, { recursive: true, force: true });
});

const righe = (testo: string): string[] => testo.split('\n').filter((r) => r.trim() !== '');

describe('leggiPassiTestIncrementale', () => {
  it('da\' gli stessi passi di leggiPassiTest, schermate comprese', async () => {
    for (const testo of [COMPLETO, CON_SCHERMATA]) {
      azzeraCachePassi();
      fs.writeFileSync(file, testo);
      expect(await leggiPassiTestIncrementale(file)).toEqual(leggiPassiTest(file));
    }
  });

  it('un file che non c\'e\' da\' un elenco vuoto, e non lancia', async () => {
    expect(await leggiPassiTestIncrementale(path.join(tmp, 'non-esiste.ndjson'))).toEqual([]);
  });

  it('a file invariato non rilegge niente', async () => {
    fs.writeFileSync(file, COMPLETO);
    const a = await leggiPassiTestIncrementale(file);
    const letti = statistichePassi().byteLetti;
    expect(letti).toBeGreaterThan(0);
    const b = await leggiPassiTestIncrementale(file);
    expect(statistichePassi().byteLetti).toBe(letti);
    expect(b).toEqual(a);
  });

  it('un file che cresce: legge solo i byte nuovi e il risultato e\' quello di una lettura intera', async () => {
    const tutte = righe(COMPLETO);
    const primaParte = tutte.slice(0, 4).join('\n') + '\n';
    const secondaParte = tutte.slice(4).join('\n') + '\n';
    fs.writeFileSync(file, primaParte);
    const parziale = await leggiPassiTestIncrementale(file);
    expect(parziale).toEqual(leggiPassiTest(file));
    expect(parziale.length).toBeLessThan(3);
    const dopoPrima = statistichePassi().byteLetti;

    fs.appendFileSync(file, secondaParte);
    const intero = await leggiPassiTestIncrementale(file);
    expect(intero).toEqual(leggiPassiTest(file));
    expect(intero.map((p) => p.esito)).toEqual(['passato', 'fallito', 'saltato']);
    // Solo i byte aggiunti (piu' al massimo la piccola finestra di controllo della coda).
    expect(statistichePassi().byteLetti - dopoPrima).toBeLessThan(Buffer.byteLength(secondaParte) + 512);
    expect(statistichePassi().byteLetti - dopoPrima).toBeGreaterThanOrEqual(Buffer.byteLength(secondaParte));
  });

  it('una riga scritta a meta\' si aspetta: non si perde e non si legge due volte', async () => {
    const tutte = righe(COMPLETO);
    const meta = tutte[4].slice(0, 40);
    fs.writeFileSync(file, tutte.slice(0, 4).join('\n') + '\n' + meta);
    const prima = await leggiPassiTestIncrementale(file);
    expect(prima).toEqual(leggiPassiTest(file));
    fs.appendFileSync(file, tutte[4].slice(40) + '\n' + tutte[5] + '\n');
    const dopo = await leggiPassiTestIncrementale(file);
    expect(dopo).toEqual(leggiPassiTest(file));
    expect(dopo.map((p) => p.esito)).toEqual(['passato', 'fallito', 'saltato']);
  });

  it('un ultimo messaggio completo ma senza a capo si legge subito, e quello dopo non lo duplica', async () => {
    const tutte = righe(COMPLETO);
    fs.writeFileSync(file, tutte.join('\n')); // niente a capo finale
    expect(await leggiPassiTestIncrementale(file)).toEqual(leggiPassiTest(file));
    fs.appendFileSync(file, '\n' + tutte[5] + '\n');
    expect(await leggiPassiTestIncrementale(file)).toEqual(leggiPassiTest(file));
  });

  it('un file sostituito da un altro (anche piu\' lungo) non da\' i passi del vecchio', async () => {
    fs.writeFileSync(file, COMPLETO);
    expect((await leggiPassiTestIncrementale(file)).map((p) => p.esito)).toEqual(['passato', 'fallito', 'saltato']);
    fs.writeFileSync(file, CON_SCHERMATA + CON_SCHERMATA.replace(/"id":"/g, '"id":"bis-'));
    expect(await leggiPassiTestIncrementale(file)).toEqual(leggiPassiTest(file));
  });

  it('un file accorciato o svuotato riparte da zero', async () => {
    fs.writeFileSync(file, COMPLETO);
    await leggiPassiTestIncrementale(file);
    fs.writeFileSync(file, '');
    expect(await leggiPassiTestIncrementale(file)).toEqual([]);
    fs.writeFileSync(file, righe(COMPLETO).slice(0, 4).join('\n') + '\n');
    expect(await leggiPassiTestIncrementale(file)).toEqual(leggiPassiTest(file));
  });

  it('un file cancellato da\' un elenco vuoto', async () => {
    fs.writeFileSync(file, COMPLETO);
    await leggiPassiTestIncrementale(file);
    fs.rmSync(file);
    expect(await leggiPassiTestIncrementale(file)).toEqual([]);
  });

  it('chi riceve i passi li puo\' modificare senza sporcare la chiamata dopo', async () => {
    fs.writeFileSync(file, COMPLETO);
    const a = await leggiPassiTestIncrementale(file);
    a[0].testo = 'sporcato';
    a.pop();
    const b = await leggiPassiTestIncrementale(file);
    expect(b).toHaveLength(3);
    expect(b[0].testo).not.toBe('sporcato');
  });

  it('due richieste insieme sullo stesso file non leggono due volte e danno lo stesso risultato', async () => {
    fs.writeFileSync(file, COMPLETO);
    const [a, b] = await Promise.all([leggiPassiTestIncrementale(file), leggiPassiTestIncrementale(file)]);
    expect(a).toEqual(b);
    expect(statistichePassi().byteLetti).toBe(Buffer.byteLength(COMPLETO));
  });

  it('un file grande si legge a pezzi e restituisce il turno al server fra un pezzo e l\'altro', async () => {
    const allegato = JSON.stringify({ attachment: { body: Buffer.alloc(300_000, 7).toString('base64'), mediaType: 'image/png', testCaseStartedId: 'x', testStepId: 'y' } }) + '\n';
    fs.writeFileSync(file, COMPLETO + allegato.repeat(40)); // ~16 MB
    let giriDelServer = 0;
    const timer = setInterval(() => giriDelServer++, 1);
    const passi = await leggiPassiTestIncrementale(file);
    clearInterval(timer);
    expect(passi).toEqual(leggiPassiTest(file));
    expect(giriDelServer).toBeGreaterThan(0);
  });
});
