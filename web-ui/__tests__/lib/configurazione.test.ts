import { describe, it, expect, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  scriviVariabile,
  bersagliDaFile,
  ambientiDaFile,
  scriviBersaglio,
  scriviLoginBersaglio,
  ambientiConCredenziali,
} from '@/lib/configurazione';

describe('scrittura della configurazione', () => {
  it('aggiunge una variabile che non c\'era', () => {
    expect(scriviVariabile('ALTRA=1\n', 'PIMS_URL', 'https://x.invalid'))
      .toBe('ALTRA=1\nPIMS_URL=https://x.invalid\n');
  });

  it('sostituisce quella che c\'era, senza duplicarla', () => {
    const dopo = scriviVariabile('A=1\nPIMS_URL=vecchio\nB=2\n', 'PIMS_URL', 'nuovo');
    expect(dopo).toBe('A=1\nPIMS_URL=nuovo\nB=2\n');
    expect(dopo.match(/PIMS_URL/g)).toHaveLength(1);
  });

  it('rifiuta una chiave che non e\' una chiave', () => {
    expect(() => scriviVariabile('', 'A=1\nB', 'x')).toThrow(/chiave non valida/);
  });

  it('elenca i bersagli senza mostrarne gli indirizzi', () => {
    const json = '{"_commento":["x"],"lavoro":{"url":"${PIMS_URL}"},"altro":{"url":"${B}"}}';
    expect(bersagliDaFile(json)).toEqual(['lavoro', 'altro']);
  });

  it('se la chiave compare due volte, dopo la scrittura compare una sola volta (rilievo 1)', () => {
    const dopo = scriviVariabile('A=1\nPIMS_URL=x\nPIMS_URL=y\nB=2\n', 'PIMS_URL', 'nuovo');
    expect(dopo.match(/PIMS_URL/g)).toHaveLength(1);
    expect(dopo).toBe('A=1\nPIMS_URL=nuovo\nB=2\n');
  });

  it('conserva il fine riga CRLF del file originale (rilievo 2)', () => {
    const dopo = scriviVariabile('A=1\r\nPIMS_URL=old\r\nB=2\r\n', 'PIMS_URL', 'nuovo');
    expect(dopo).toBe('A=1\r\nPIMS_URL=nuovo\r\nB=2\r\n');
    expect(dopo).not.toMatch(/[^\r]\n/); // nessun \n non preceduto da \r: niente fine riga misti
  });

  it('il file termina sempre con un a capo, anche sostituendo una chiave esistente senza a capo finale (rilievo 3)', () => {
    const dopo = scriviVariabile('A=1\nPIMS_URL=old', 'PIMS_URL', 'nuovo');
    expect(dopo).toBe('A=1\nPIMS_URL=nuovo\n');
  });

  it('elenco vuoto se il json dei bersagli e\' malformato (rilievo 4)', () => {
    expect(bersagliDaFile('{questo non e\' json')).toEqual([]);
  });

  it('elenco vuoto se il json dei bersagli e\' un array (rilievo 4)', () => {
    expect(bersagliDaFile('["a","b","c"]')).toEqual([]);
  });
});

describe('ambienti con indirizzo, per la sezione Ambienti', () => {
  it('elenca nome e indirizzo, senza il blocco _commento', () => {
    const json = '{"_commento":["x"],"demo":{"url":"https://a.invalid"},"altro":{"url":"${B}"}}';
    expect(ambientiDaFile(json)).toEqual([
      { nome: 'demo', url: 'https://a.invalid', haLogin: false },
      { nome: 'altro', url: '${B}', haLogin: false },
    ]);
  });

  it('dice se un ambiente ha gia\' un blocco login', () => {
    const json = JSON.stringify({
      conLogin: { url: 'https://a.invalid', login: { steps: [] } },
      senzaLogin: { url: 'https://b.invalid' },
    });
    const risultato = ambientiDaFile(json);
    expect(risultato.find((a) => a.nome === 'conLogin')?.haLogin).toBe(true);
    expect(risultato.find((a) => a.nome === 'senzaLogin')?.haLogin).toBe(false);
  });

  it('elenco vuoto se il file e\' assente o malformato, come bersagliDaFile', () => {
    expect(ambientiDaFile('non e\' json')).toEqual([]);
    expect(ambientiDaFile('["a"]')).toEqual([]);
  });
});

describe('ambientiConCredenziali: quali variabili servono, quali mancano', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cruscotto-credenziali-'));
  const targetsPath = path.join(dir, 'bdd-targets.json');
  const envPath = path.join(dir, '.env');
  const puliti: string[] = [];

  afterEach(() => {
    // loadEnv scrive su process.env: senza pulizia, un test lascerebbe una
    // variabile impostata e il successivo la troverebbe "gia' li'".
    for (const chiave of puliti) delete process.env[chiave];
    puliti.length = 0;
  });

  it('elenca le variabili richieste (url compreso) e quelle mancanti, per nome soltanto', () => {
    fs.writeFileSync(
      targetsPath,
      JSON.stringify({
        'app-a': { url: '${T1_URL}', login: { steps: [{ fill: { role: 'textbox' }, value: '${T1_USER}' }] } },
      })
    );
    fs.writeFileSync(envPath, 'T1_URL=https://a.invalid\n');
    puliti.push('T1_URL', 'T1_USER');
    process.env.T1_URL = 'https://a.invalid';

    const json = fs.readFileSync(targetsPath, 'utf-8');
    const risultato = ambientiConCredenziali(json, targetsPath, envPath);

    expect(risultato).toHaveLength(1);
    expect(risultato[0].nome).toBe('app-a');
    expect(risultato[0].variabiliRichieste).toEqual(['T1_URL', 'T1_USER']);
    expect(risultato[0].variabiliMancanti).toEqual(['T1_USER']);
    // Nessun valore nell'output: solo nomi.
    expect(JSON.stringify(risultato)).not.toMatch(/https:\/\/a\.invalid/);
  });

  it('nessuna variabile mancante una volta che .env le ha tutte', () => {
    fs.writeFileSync(targetsPath, JSON.stringify({ 'app-b': { url: '${T2_URL}' } }));
    fs.writeFileSync(envPath, 'T2_URL=https://b.invalid\n');
    puliti.push('T2_URL');

    const json = fs.readFileSync(targetsPath, 'utf-8');
    const risultato = ambientiConCredenziali(json, targetsPath, envPath);

    expect(risultato[0].variabiliRichieste).toEqual(['T2_URL']);
    expect(risultato[0].variabiliMancanti).toEqual([]);
  });

  it('un ambiente senza ${VAR} non richiede e non manca niente', () => {
    fs.writeFileSync(targetsPath, JSON.stringify({ demo: { url: 'https://demo.invalid' } }));
    fs.writeFileSync(envPath, '');

    const json = fs.readFileSync(targetsPath, 'utf-8');
    const risultato = ambientiConCredenziali(json, targetsPath, envPath);

    expect(risultato[0].variabiliRichieste).toEqual([]);
    expect(risultato[0].variabiliMancanti).toEqual([]);
  });
});

describe('scrittura di un ambiente in bdd-targets.json', () => {
  const conCommento =
    '{"_commento":["nota"],"demo":{"url":"https://demo.invalid","readyWhen":"/x"}}';

  it('aggiunge un ambiente nuovo conservando gli altri e il _commento', () => {
    const dopo = scriviBersaglio(conCommento, 'nuovo', 'https://nuovo.invalid');
    const dati = JSON.parse(dopo);
    expect(dati._commento).toEqual(['nota']);
    expect(dati.demo).toEqual({ url: 'https://demo.invalid', readyWhen: '/x' });
    expect(dati.nuovo).toEqual({ url: 'https://nuovo.invalid' });
  });

  it('aggiornando un ambiente esistente cambia solo url, il resto (login compreso) resta intatto', () => {
    const conLogin = JSON.stringify({
      demo: {
        url: 'https://vecchio.invalid',
        readyWhen: '/x',
        login: { steps: [{ click: { role: 'button', name: 'Login' } }] },
      },
    });
    const dopo = scriviBersaglio(conLogin, 'demo', 'https://nuovo.invalid');
    const dati = JSON.parse(dopo);
    expect(dati.demo.url).toBe('https://nuovo.invalid');
    expect(dati.demo.readyWhen).toBe('/x');
    expect(dati.demo.login).toEqual({ steps: [{ click: { role: 'button', name: 'Login' } }] });
  });

  it('un file assente (contenuto vuoto) si comporta come un oggetto vuoto', () => {
    const dopo = scriviBersaglio('', 'primo', 'https://a.invalid');
    expect(JSON.parse(dopo)).toEqual({ primo: { url: 'https://a.invalid' } });
  });

  it('rifiuta un nome di ambiente non valido', () => {
    expect(() => scriviBersaglio('{}', 'con spazi qui', 'https://a.invalid')).toThrow(/nome di ambiente/);
  });

  it('rifiuta il nome riservato _commento anche se rispetta il charset', () => {
    expect(() => scriviBersaglio('{}', '_commento', 'https://a.invalid')).toThrow(/nome di ambiente/);
  });

  it('rifiuta uno schema javascript:', () => {
    expect(() => scriviBersaglio('{}', 'x', 'javascript:alert(1)')).toThrow(/http/);
  });

  it('rifiuta uno schema file:', () => {
    expect(() => scriviBersaglio('{}', 'x', 'file:///etc/passwd')).toThrow(/http/);
  });

  it('rifiuta uno schema data:', () => {
    expect(() => scriviBersaglio('{}', 'x', 'data:text/html,<script>1</script>')).toThrow(/http/);
  });

  it('rifiuta un indirizzo con credenziali, senza ripeterle nel messaggio', () => {
    expect(() => scriviBersaglio('{}', 'x', 'https://utente:segreto@host.invalid'))
      .toThrow(/credenziali/);
    try {
      scriviBersaglio('{}', 'x', 'https://utente:segreto@host.invalid');
    } catch (err) {
      expect((err as Error).message).not.toMatch(/segreto/);
    }
  });

  it('rifiuta un file esistente ma illeggibile, invece di sovrascriverlo alla cieca', () => {
    expect(() => scriviBersaglio('{questo non e\' json', 'x', 'https://a.invalid'))
      .toThrow(/non e\'.*json leggibile|json leggibile/);
  });

  it('rifiuta un file che non e\' un oggetto (es. un array)', () => {
    expect(() => scriviBersaglio('["a","b"]', 'x', 'https://a.invalid'))
      .toThrow(/forma attesa/);
  });

  it('conserva il fine riga CRLF del file originale', () => {
    const dopo = scriviBersaglio('{"a":{"url":"https://a.invalid"}}\r\n', 'b', 'https://b.invalid');
    expect(dopo.includes('\r\n')).toBe(true);
    expect(dopo).not.toMatch(/[^\r]\n/);
  });
});

describe('scrittura del blocco login in bdd-targets.json', () => {
  const login = { steps: [{ fill: { role: 'textbox', name: 'Email' }, value: '${DEMO_USER}' }] };

  it('scrive il login su un ambiente esistente, conservando url e il resto', () => {
    const prima = JSON.stringify({
      _commento: ['nota'],
      demo: { url: 'https://demo.invalid', hint: 'una nota' },
      altro: { url: 'https://altro.invalid' },
    });
    const dopo = scriviLoginBersaglio(prima, 'demo', login);
    const dati = JSON.parse(dopo);
    expect(dati._commento).toEqual(['nota']);
    expect(dati.demo.url).toBe('https://demo.invalid');
    expect(dati.demo.hint).toBe('una nota');
    expect(dati.demo.login).toEqual(login);
    expect(dati.altro).toEqual({ url: 'https://altro.invalid' });
  });

  it('sostituisce per intero un login gia\' presente (seconda registrazione)', () => {
    const prima = JSON.stringify({
      demo: { url: 'https://demo.invalid', login: { steps: [{ click: { role: 'button', name: 'Vecchio' } }] } },
    });
    const dopo = scriviLoginBersaglio(prima, 'demo', login);
    expect(JSON.parse(dopo).demo.login).toEqual(login);
  });

  it('scrive anche readyWhen quando fornito', () => {
    const prima = JSON.stringify({ demo: { url: 'https://demo.invalid' } });
    const dopo = scriviLoginBersaglio(prima, 'demo', login, '/account');
    expect(JSON.parse(dopo).demo.readyWhen).toBe('/account');
  });

  it('non tocca readyWhen se non fornito', () => {
    const prima = JSON.stringify({ demo: { url: 'https://demo.invalid', readyWhen: '/gia-cera' } });
    const dopo = scriviLoginBersaglio(prima, 'demo', login);
    expect(JSON.parse(dopo).demo.readyWhen).toBe('/gia-cera');
  });

  it('rifiuta un ambiente che non esiste ancora', () => {
    expect(() => scriviLoginBersaglio('{}', 'fantasma', login)).toThrow(/ambiente sconosciuto/);
  });

  it('rifiuta un nome non valido', () => {
    expect(() => scriviLoginBersaglio('{}', '_commento', login)).toThrow(/nome di ambiente/);
  });
});
