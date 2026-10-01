import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  validaCompito,
  validaPropostaOggetto,
  type Compito,
  type PassoCompito,
} from '@/lib/suggerimenti-contratto';
import { proponiConRegole } from '@/lib/suggerimenti-regole';
import {
  applica,
  annulla,
  ErroreApplicazione,
  type Giudici,
} from '@/lib/suggerimenti-applica';

const RADICE = fs.mkdtempSync(path.join(os.tmpdir(), 'suggerimenti-'));
afterAll(() => fs.rmSync(RADICE, { recursive: true, force: true }));

const MARCATORE = '# generato-da: bdd-generate · rigenerabile';
const FEATURE_REL = 'src/features/generated/s1.feature';
const STEPS_REL = 'src/steps/generated/s1.steps.ts';
const CARTELLA = path.join(RADICE, 'reports', 'assistente', '20261001-153000-a1b2');

const FEATURE =
  `${MARCATORE}\n# src/features/generated/s1.feature\n\n@generato @da-rivedere\nFeature: s1\n  Scenario: s1\n` +
  `    Given Sono dentro\n    When Conferma l'ordine\n    When Controllo il totale\n    When Apro il carrello\n` +
  `    Then the page shows "x"\n`;

function blocco(frase: string, parola: string): string {
  return (
    `/**\n * @intent  ${frase}\n * @page    Pagina\n * @wanted\n */\n` +
    `${parola}(${JSON.stringify(frase)}, async function (this: CustomWorld) {\n  // corpo di ${frase}\n});\n`
  );
}
const STEPS =
  `// generato-da: bdd-generate · rigenerabile\n// src/steps/generated/s1.steps.ts\n\n` +
  [blocco('Sono dentro', 'Given'), blocco("Conferma l'ordine", 'When'), blocco('Controllo il totale', 'When'), blocco('Apro il carrello', 'When')].join('\n');

const grezzo = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '..', '..', '..', 'test-fixtures', 'assistente', 'compito.json'), 'utf-8')
);

function compito(passi?: PassoCompito[]): Compito {
  const e = validaCompito(passi ? { ...grezzo, passi } : grezzo);
  if (!e.ok) throw new Error(e.motivo);
  return e.compito;
}

function valida(c: Compito) {
  const e = validaPropostaOggetto(proponiConRegole(c), c);
  if (e.tipo !== 'valida') throw new Error('proposta non valida');
  return e;
}

const leggi = (rel: string) => fs.readFileSync(path.join(RADICE, rel), 'utf-8');
const giudiciOk: Giudici = async () => [
  { nome: 'tsc', ok: true },
  { nome: 'dry-run', ok: true },
  { nome: 'validatore', ok: true },
];
const giudiceRosso = (quale: 'tsc' | 'dry-run' | 'validatore'): Giudici => async () =>
  (['tsc', 'dry-run', 'validatore'] as const).map((nome) => ({
    nome,
    ok: nome !== quale,
    ...(nome === quale ? { dettaglio: 'errore finto' } : {}),
  }));

beforeEach(() => {
  fs.rmSync(RADICE, { recursive: true, force: true });
  fs.mkdirSync(path.join(RADICE, 'src', 'features', 'generated'), { recursive: true });
  fs.mkdirSync(path.join(RADICE, 'src', 'steps', 'generated'), { recursive: true });
  fs.writeFileSync(path.join(RADICE, FEATURE_REL), FEATURE);
  fs.writeFileSync(path.join(RADICE, STEPS_REL), STEPS);
});

function contesto(c: Compito, scelte: Array<{ passo: number; voce: string }>, giudici: Giudici = giudiciOk) {
  return {
    radice: RADICE, cartella: CARTELLA, featureRel: FEATURE_REL, stepsRel: STEPS_REL,
    compito: c, proposta: valida(c), scelte, giudici,
  };
}

const CONFERMA = { passo: 2, voce: 'the user confirms the order' };
const TOTALE = { passo: 3, voce: 'the order total is shown' };

describe('applica: una scelta valida', () => {
  it('riscrive il .feature E il file di step insieme, e la frase del tester resta come commento', async () => {
    const r = await applica(contesto(compito(), [CONFERMA]));
    expect(r.esito).toBe('applicato');

    const feature = leggi(FEATURE_REL);
    expect(feature).toContain("    # frase del tester: Conferma l'ordine\n    When the user confirms the order\n");
    expect(feature).not.toContain("When Conferma l'ordine");
    // le altre righe non si toccano
    expect(feature).toContain('    Given Sono dentro\n');
    expect(feature).toContain('    When Controllo il totale\n');

    const steps = leggi(STEPS_REL);
    expect(steps).toContain('When("the user confirms the order", async function');
    expect(steps).toContain(' * @intent  the user confirms the order');
    expect(steps).not.toContain('When("Conferma l\'ordine"');
    expect(steps).not.toContain('@intent  Conferma l\'ordine');
    // il corpo dello step non si tocca
    expect(steps).toContain("// corpo di Conferma l'ordine");
    expect(steps).toContain('When("Controllo il totale"');
  });

  it('dichiara chi ha scelto le frasi, accanto al marcatore', async () => {
    await applica(contesto(compito(), [CONFERMA]));
    expect(leggi(FEATURE_REL)).toContain('# origine-frasi: deterministico\n');
  });

  it('piu\' scelte insieme', async () => {
    await applica(contesto(compito(), [CONFERMA, TOTALE]));
    const feature = leggi(FEATURE_REL);
    expect(feature).toContain('When the user confirms the order');
    expect(feature).toContain('When the order total is shown');
  });

  it('una frase che compare in piu\' passi si riscrive in tutti', async () => {
    fs.writeFileSync(path.join(RADICE, FEATURE_REL), FEATURE.replace('    When Apro il carrello\n', "    When Apro il carrello\n    When Conferma l'ordine\n"));
    const c = compito();
    c.passi[1].anche = [5];
    await applica(contesto(c, [CONFERMA]));
    expect(leggi(FEATURE_REL).match(/When the user confirms the order/g)).toHaveLength(2);
  });

  it('conserva il CRLF del file', async () => {
    fs.writeFileSync(path.join(RADICE, FEATURE_REL), FEATURE.replace(/\n/g, '\r\n'));
    await applica(contesto(compito(), [CONFERMA]));
    const feature = leggi(FEATURE_REL);
    expect(feature).toContain("    # frase del tester: Conferma l'ordine\r\n    When the user confirms the order\r\n");
    expect(feature.replace(/\r\n/g, '')).not.toContain('\n');
  });

  it('scrive esito.json con l\'origine di ogni riga: scelta dalle regole, tenuta dalla persona, nessuna', async () => {
    await applica(contesto(compito(), [CONFERMA]));
    const esito = JSON.parse(fs.readFileSync(path.join(CARTELLA, 'esito.json'), 'utf-8'));
    const per = Object.fromEntries(esito.righe.map((r: { passo: number }) => [r.passo, r]));
    expect(per[2]).toMatchObject({ esito: 'frase-del-catalogo', origin: 'deterministico', voce: 'the user confirms the order' });
    expect(per[3]).toMatchObject({ esito: 'frase-propria', origin: 'persona' });
    expect(per[4]).toMatchObject({ esito: 'nessuna-proposta', origin: 'deterministico' });
    expect(esito.esito).toBe('applicato');
    expect(esito.conteggi).toMatchObject({ accettate: 1 });
  });

  it('un file con una riga accettata passa a "assistito" solo se a proporre era un assistente', async () => {
    const regole = await applica(contesto(compito(), [CONFERMA]));
    expect(regole.origineFile).toBe('deterministico');

    fs.writeFileSync(path.join(RADICE, FEATURE_REL), FEATURE);
    fs.writeFileSync(path.join(RADICE, STEPS_REL), STEPS);
    const c = compito();
    const assistito = validaPropostaOggetto(
      {
        ...proponiConRegole(c),
        origin: 'assistito',
        strumento: { nome: 'kiro-ide', modello: 'x', modelloFissato: true },
      },
      c
    );
    if (assistito.tipo !== 'valida') throw new Error('non valida');
    const r = await applica({ ...contesto(c, [CONFERMA]), proposta: assistito });
    expect(r.origineFile).toBe('assistito');
    expect(leggi(FEATURE_REL)).toContain('# origine-frasi: assistito\n');
  });
});

describe('applica: tutto o niente', () => {
  const prima = () => ({ f: leggi(FEATURE_REL), s: leggi(STEPS_REL) });
  const nonScrive = async (ctx: ReturnType<typeof contesto>, codice: string) => {
    const p = prima();
    await expect(applica(ctx)).rejects.toMatchObject({ codice });
    expect(leggi(FEATURE_REL)).toBe(p.f);
    expect(leggi(STEPS_REL)).toBe(p.s);
    expect(fs.existsSync(CARTELLA)).toBe(false);
  };

  it('una voce con parametri: nessun file scritto, e si dice quale', async () => {
    const c = compito();
    await expect(applica(contesto(c, [{ passo: 5, voce: 'the user enters {int} items' }]))).rejects.toSatisfy(
      (e: unknown) => e instanceof ErroreApplicazione && e.codice === 'non-applicabile' && e.dettagli.some((d) => d.includes('{int}'))
    );
    expect(leggi(FEATURE_REL)).toBe(FEATURE);
  });

  it('una voce gia\' realizzata altrove: nessun file scritto', async () => {
    await nonScrive(contesto(compito(), [{ passo: 1, voce: 'the user is logged in' }]), 'non-applicabile');
  });

  it('due passi sulla stessa voce: nessun file scritto', async () => {
    const c = compito();
    c.passi[2].candidati = [{ voce: 'the user confirms the order', classe: 'stessi-componenti', stato: 'wanted', parametri: false }];
    await nonScrive(contesto(c, [CONFERMA, { passo: 3, voce: 'the user confirms the order' }]), 'stessa-voce');
  });

  it('una voce che e\' la frase di un altro passo: nessun file scritto', async () => {
    const c = compito();
    c.passi[1].candidati[0] = { ...c.passi[1].candidati[0], voce: 'Controllo il totale' };
    await nonScrive(contesto(c, [{ passo: 2, voce: 'Controllo il totale' }]), 'collisione');
  });

  it('una voce che non e\' fra i candidati del passo: rifiutata', async () => {
    await nonScrive(contesto(compito(), [{ passo: 2, voce: 'the order total is shown' }]), 'voce-non-candidata');
  });

  it('una voce che le regole non hanno proposto: rifiutata', async () => {
    await nonScrive(contesto(compito(), [{ passo: 2, voce: 'the user places the order' }]), 'voce-non-proposta');
  });

  it('un passo che non esiste, o nessuna scelta: rifiutati', async () => {
    await nonScrive(contesto(compito(), [{ passo: 9, voce: 'x' }]), 'passo-sconosciuto');
    await nonScrive(contesto(compito(), []), 'nessuna-scelta');
  });

  it('una frase che non si trova nel .feature: nessun file scritto', async () => {
    fs.writeFileSync(path.join(RADICE, FEATURE_REL), FEATURE.replace("When Conferma l'ordine\n", 'When Altro\n'));
    const p = leggi(FEATURE_REL);
    await expect(applica(contesto(compito(), [CONFERMA]))).rejects.toMatchObject({ codice: 'frase-non-trovata' });
    expect(leggi(FEATURE_REL)).toBe(p);
  });

  it('una frase definita due volte negli step: nessun file scritto', async () => {
    fs.writeFileSync(path.join(RADICE, STEPS_REL), STEPS + '\n' + blocco("Conferma l'ordine", 'Then'));
    const p = prima();
    await expect(applica(contesto(compito(), [CONFERMA]))).rejects.toMatchObject({ codice: 'definizione-multipla' });
    expect(leggi(STEPS_REL)).toBe(p.s);
  });

  it('un file senza marcatore e\' stato adottato da qualcuno: non si tocca', async () => {
    fs.writeFileSync(path.join(RADICE, FEATURE_REL), FEATURE.replace('generato-da: bdd-generate', 'altro'));
    await expect(applica(contesto(compito(), [CONFERMA]))).rejects.toMatchObject({ codice: 'file-a-mano' });
  });

  for (const quale of ['tsc', 'dry-run', 'validatore'] as const) {
    it(`se il giudice "${quale}" dice no, i file tornano identici, byte per byte`, async () => {
      const p = prima();
      const r = await applica(contesto(compito(), [CONFERMA, TOTALE], giudiceRosso(quale)));
      expect(r.esito).toBe('rifiutato-dai-giudici');
      expect(r.giudici.find((g) => !g.ok)?.nome).toBe(quale);
      expect(leggi(FEATURE_REL)).toBe(p.f);
      expect(leggi(STEPS_REL)).toBe(p.s);
      const esito = JSON.parse(fs.readFileSync(path.join(CARTELLA, 'esito.json'), 'utf-8'));
      expect(esito.esito).toBe('rifiutato-dai-giudici');
    });
  }

  it('prima di scrivere copia gli originali in prima/', async () => {
    await applica(contesto(compito(), [CONFERMA]));
    expect(fs.readFileSync(path.join(CARTELLA, 'prima', 'scenario.feature'), 'utf-8')).toBe(FEATURE);
    expect(fs.readFileSync(path.join(CARTELLA, 'prima', 'step.ts'), 'utf-8')).toBe(STEPS);
  });

  it('i giudici ricevono le frasi nuove e i file toccati', async () => {
    let visto: unknown;
    await applica(contesto(compito(), [CONFERMA], async (c) => { visto = c; return giudiciOk(c); }));
    expect(visto).toMatchObject({ featureRel: FEATURE_REL, stepsRel: STEPS_REL, nuoveFrasi: ['the user confirms the order'] });
  });
});

describe('annulla', () => {
  it('senza modifiche a mano, ripristina i file com\'erano', async () => {
    await applica(contesto(compito(), [CONFERMA]));
    expect(leggi(FEATURE_REL)).not.toBe(FEATURE);
    const r = await annulla({ radice: RADICE, cartella: CARTELLA });
    expect(r.esito).toBe('annullato');
    expect(leggi(FEATURE_REL)).toBe(FEATURE);
    expect(leggi(STEPS_REL)).toBe(STEPS);
    expect(JSON.parse(fs.readFileSync(path.join(CARTELLA, 'esito.json'), 'utf-8')).esito).toBe('annullato');
  });

  it('dopo una modifica a mano NON annulla, e dice perche\'', async () => {
    await applica(contesto(compito(), [CONFERMA]));
    fs.appendFileSync(path.join(RADICE, FEATURE_REL), '    # ritocco di una persona\n');
    const dopo = leggi(FEATURE_REL);
    await expect(annulla({ radice: RADICE, cartella: CARTELLA })).rejects.toMatchObject({ codice: 'modificato-a-mano' });
    expect(leggi(FEATURE_REL)).toBe(dopo);
  });

  it('dopo il salvataggio (i file non sono piu\' li\') non annulla', async () => {
    await applica(contesto(compito(), [CONFERMA]));
    fs.rmSync(path.join(RADICE, FEATURE_REL));
    await expect(annulla({ radice: RADICE, cartella: CARTELLA })).rejects.toMatchObject({ codice: 'gia-salvato' });
  });

  it('senza niente di applicato non c\'e\' niente da annullare', async () => {
    await expect(annulla({ radice: RADICE, cartella: CARTELLA })).rejects.toMatchObject({ codice: 'niente-da-annullare' });
  });

  it('un\'applicazione rifiutata dai giudici non si annulla: non ha cambiato niente', async () => {
    await applica(contesto(compito(), [CONFERMA], giudiceRosso('tsc')));
    await expect(annulla({ radice: RADICE, cartella: CARTELLA })).rejects.toMatchObject({ codice: 'niente-da-annullare' });
  });

  it('non si annulla due volte', async () => {
    await applica(contesto(compito(), [CONFERMA]));
    await annulla({ radice: RADICE, cartella: CARTELLA });
    await expect(annulla({ radice: RADICE, cartella: CARTELLA })).rejects.toMatchObject({ codice: 'niente-da-annullare' });
  });
});
