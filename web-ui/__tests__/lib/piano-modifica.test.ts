import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { createHash } from 'crypto';
import { pianifica, applica, annulla, statoAnnulla, ErrorePiano, type Operazione } from '@/lib/piano-modifica';
import { leggiContenuto } from '@/lib/contenuto-scenario';
import { improntaDiTesto } from '@/lib/impronta-scenario';
import { MARCATORE } from '@/lib/salva-scenario';

const RADICE = fs.mkdtempSync(path.join(os.tmpdir(), 'piano-modifica-'));
const radici = { repoRoot: RADICE, featuresDir: path.join(RADICE, 'src', 'features') };

const DA = 'the user adds the item';
const A = 'the user puts the item in the cart';

const M = `# ${MARCATORE} · rigenerabile`;
const scenario = (titolo: string, ...passi: string[]) =>
  [M, '', '@shop @order @generato', `Feature: ${titolo}`, '', `  Scenario: ${titolo}`, ...passi.map((p) => `    ${p}`), ''].join('\n');

const PAGAMENTO = scenario('Pagamento', 'Given the user is logged in', `When ${DA}`, 'Then the page shows "Done"');
const ORDINE = scenario('Ordine', 'Given the user is logged in', `When ${DA}`, 'And the user pays by card');
const BOZZA = scenario('Bozza', `When ${DA}`);

const STEPS = [
  `// ${MARCATORE} · rigenerabile`,
  'import { Given, When } from "@cucumber/cucumber";',
  '',
  '/**',
  ` * @intent ${DA}`,
  ' */',
  `When("${DA}", async function () {});`,
  '',
  '/**',
  ' * @intent the user pays by card',
  ' */',
  'When("the user pays by card", async function () {});',
  '',
].join('\n');

const PAGINA = `// ${MARCATORE} · rigenerabile\nexport class HomePage {}\n`;

const CATALOGO = {
  steps: [
    { expression: 'the user is logged in', parameters: [], app: 'common', area: 'common', domain: 'common', status: 'implemented', sourceRef: 'src\\steps\\common\\accesso.steps.ts:1', documented: true },
    { expression: 'the page shows {string}', parameters: ['{string}'], app: 'common', area: 'common', domain: 'common', status: 'implemented', sourceRef: 'src\\steps\\common\\verifica.steps.ts:1', documented: true },
    { expression: DA, parameters: [], app: 'shop', area: 'order', domain: 'shop', status: 'implemented', sourceRef: 'src\\steps\\shop\\order\\pagamento.steps.ts:7', documented: true },
    { expression: 'the user pays by card', parameters: [], app: 'shop', area: 'order', domain: 'shop', status: 'implemented', sourceRef: 'src\\steps\\shop\\order\\pagamento.steps.ts:12', documented: true },
    { expression: 'the user opens the shop', parameters: [], app: 'shop', area: 'order', domain: 'shop', status: 'implemented', sourceRef: 'src\\steps\\shop\\order\\pagamento.steps.ts:20', documented: true },
  ],
};

function scrivi(rel: string, testo: string) {
  const p = path.join(RADICE, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, testo);
}
const leggi = (rel: string) => fs.readFileSync(path.join(RADICE, rel), 'utf-8');

function istantanea(): string[] {
  const out: string[] = [];
  const visita = (d: string) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) visita(p);
      else out.push(`${path.relative(RADICE, p)}:${fs.readFileSync(p, 'utf-8')}`);
    }
  };
  visita(RADICE);
  return out.sort();
}
/** Senza lo stato dell'Annulla, che e' scritto dalla modifica stessa. */
const senzaReports = (s: string[]) => s.filter((x) => !x.startsWith(`reports${path.sep}`));

const FILE = 'shop/order/pagamento.feature';

const opTesto = (testo: string, file = FILE): Operazione => ({
  operazione: 'testo',
  file,
  versione: improntaDiTesto(leggi(`src/features/${file}`)),
  testo,
});
const opRinomina = (da = DA, a = A, file = FILE): Operazione => ({
  operazione: 'rinomina',
  file,
  versione: improntaDiTesto(leggi(`src/features/${file}`)),
  da,
  a,
});

const verde = async () => ({ ok: true as const });

beforeEach(() => {
  fs.rmSync(RADICE, { recursive: true, force: true });
  fs.mkdirSync(RADICE, { recursive: true });
  scrivi('step-catalog.json', JSON.stringify(CATALOGO));
  scrivi('src/steps/shop/order/pagamento.steps.ts', STEPS);
  scrivi('src/steps/common/accesso.steps.ts', 'import { Given } from "@cucumber/cucumber";\nGiven("the user is logged in", async function () {});\n');
  scrivi('src/pages/shop/home.page.ts', PAGINA);
  scrivi(`src/features/${FILE}`, PAGAMENTO);
  scrivi('src/features/shop/order/ordine.feature', ORDINE);
  scrivi('src/features/generated/bozza.feature', BOZZA);
});
afterAll(() => fs.rmSync(RADICE, { recursive: true, force: true }));

const codiceDi = (f: () => unknown): string | undefined => {
  try {
    f();
  } catch (e) {
    return e instanceof ErrorePiano ? e.codice : `altro: ${(e as Error).message}`;
  }
  return undefined;
};

describe('pianifica: cosa si scriverebbe, senza scrivere', () => {
  it('una modifica senza differenze non scrive niente e non toglie il marcatore', () => {
    const prima = istantanea();
    const piano = pianifica(radici, opTesto(PAGAMENTO));
    expect(piano.scritture).toEqual([]);
    expect(piano.marcatoreTolto).toBe(false);
    expect(istantanea()).toEqual(prima);
  });

  it('una modifica vera riscrive il .feature senza marcatore, lasciando i tag', () => {
    const nuovo = PAGAMENTO.replace(/Pagamento/g, 'Pagamento rifiutato');
    const piano = pianifica(radici, opTesto(nuovo));
    expect(piano.scritture).toHaveLength(1);
    expect(piano.scritture[0].rel).toBe(`src/features/${FILE}`);
    expect(piano.scritture[0].nuovo.includes(MARCATORE)).toBe(false);
    expect(piano.scritture[0].nuovo).toContain('@shop @order @generato');
    expect(piano.marcatoreTolto).toBe(true);
    expect(piano.blocchi).toEqual([]);
  });

  it('conserva i fine riga del file letto anche se il testo arriva con \\n', () => {
    scrivi(`src/features/${FILE}`, PAGAMENTO.replace(/\n/g, '\r\n'));
    const piano = pianifica(radici, opTesto(PAGAMENTO.replace('Pagamento', 'Altro')));
    expect(piano.scritture[0].nuovo).toContain('\r\n');
    expect(piano.scritture[0].nuovo).not.toMatch(/[^\r]\n/);
  });

  it('versione diversa: conflitto, niente di pianificato', () => {
    const op = { ...opTesto(PAGAMENTO), versione: 'sbagliata' };
    expect(codiceDi(() => pianifica(radici, op))).toBe('conflitto');
  });

  it('file inesistente o percorso fuori da src/features: rifiutati', () => {
    expect(codiceDi(() => pianifica(radici, { ...opTesto(PAGAMENTO), file: 'shop/non-c-e.feature' }))).toBe('non-trovato');
    expect(codiceDi(() => pianifica(radici, { ...opTesto(PAGAMENTO), file: '../../package.json' }))).toBe('percorso');
    expect(codiceDi(() => pianifica(radici, { ...opTesto(PAGAMENTO), file: '/etc/passwd' }))).toBe('percorso');
  });

  it('uno scenario in generated/ non si modifica da qui', () => {
    const op = { ...opTesto(BOZZA, 'generated/bozza.feature') };
    try {
      pianifica(radici, op);
      throw new Error('doveva rifiutare');
    } catch (e) {
      expect(e).toBeInstanceOf(ErrorePiano);
      expect((e as ErrorePiano).codice).toBe('non-modificabile');
      expect((e as ErrorePiano).ragione).toBe('registrato');
    }
  });

  it('un @non-automatizzato e un file con due scenari non si modificano', () => {
    scrivi('src/features/shop/order/doc.feature', '@shop @non-automatizzato\nFeature: D\n  Scenario: D\n    Given x\n');
    scrivi('src/features/shop/order/due.feature', 'Feature: D\n  Scenario: A\n    Given x\n  Scenario: B\n    Given y\n');
    for (const [file, ragione] of [['shop/order/doc.feature', 'documento'], ['shop/order/due.feature', 'complesso']]) {
      try {
        pianifica(radici, { operazione: 'testo', file, versione: improntaDiTesto(leggi(`src/features/${file}`)), testo: 'x' });
        throw new Error('doveva rifiutare');
      } catch (e) {
        expect((e as ErrorePiano).codice).toBe('non-modificabile');
        expect((e as ErrorePiano).ragione).toBe(ragione);
      }
    }
  });

  it('una frase che il catalogo non riconosce e un blocco del livello 1', () => {
    const piano = pianifica(radici, opTesto(PAGAMENTO.replace(DA, 'the user dances')));
    expect(piano.blocchi).toContainEqual(expect.objectContaining({ codice: 'sconosciuto', frase: 'the user dances' }));
  });

  it('togliere un passo che nessun altro scenario usa lo dice: resta nel catalogo', () => {
    const nuovo = PAGAMENTO.replace('    Given the user is logged in\n', '').replace(`    When ${DA}\n`, `    When the user opens the shop\n`);
    const piano = pianifica(radici, opTesto(nuovo));
    // "the user adds the item" e' usato ancora da ordine.feature: non e' "non piu' usato"
    expect(piano.avvisi.map((a) => a.codice)).not.toContain('non-piu-usato');
    const solo = scenario('Pagamento', 'Given the user is logged in', 'Then the page shows "Done"');
    const piano2 = pianifica(radici, opTesto(solo));
    // il passo "the user adds the item" e' ancora in ordine.feature e bozza.feature
    expect(piano2.avvisi.map((a) => a.codice)).not.toContain('non-piu-usato');
  });

  it('un passo che non usa piu nessuno scenario avvisa', () => {
    scrivi('src/features/shop/order/ordine.feature', scenario('Ordine', 'Given the user is logged in'));
    scrivi('src/features/generated/bozza.feature', scenario('Bozza', 'Given the user is logged in'));
    const nuovo = PAGAMENTO.replace(`    When ${DA}\n`, '');
    const piano = pianifica(radici, opTesto(nuovo));
    expect(piano.avvisi).toContainEqual({ codice: 'non-piu-usato', frase: DA });
  });
});

describe('pianifica: rinomina', () => {
  it('riscrive la definizione e ogni .feature che usa la frase; la Page Object non c e', () => {
    const piano = pianifica(radici, opRinomina());
    const rel = piano.scritture.map((s) => s.rel).sort();
    expect(rel).toEqual([
      'src/features/generated/bozza.feature',
      'src/features/shop/order/ordine.feature',
      'src/features/shop/order/pagamento.feature',
      'src/steps/shop/order/pagamento.steps.ts',
    ]);
    expect(piano.scritture.some((s) => s.rel.includes('/pages/'))).toBe(false);
    const def = piano.scritture.find((s) => s.rel.endsWith('.steps.ts'))!;
    expect(def.nuovo).toContain(`When("${A}"`);
    expect(def.nuovo).toContain(`@intent ${A}`);
  });

  it('i file riscritti perdono il marcatore, ma una bozza in generated/ lo tiene (se no non si potrebbe piu salvare)', () => {
    const piano = pianifica(radici, opRinomina());
    for (const s of piano.scritture) {
      const bozza = s.rel.includes('/generated/');
      expect(s.nuovo.includes(MARCATORE)).toBe(bozza);
    }
  });

  it('dice quali scenari diventano tuoi, con i nomi', () => {
    const piano = pianifica(radici, opRinomina());
    expect(piano.conseguenze.scenari.map((s) => [s.nome, s.diventaTuo]).sort()).toEqual([
      ['Bozza', false],
      ['Ordine', true],
      ['Pagamento', true],
    ]);
    expect(piano.rigeneraCatalogo).toBe(true);
  });

  it('non scrive niente', () => {
    const prima = istantanea();
    pianifica(radici, opRinomina());
    expect(istantanea()).toEqual(prima);
  });

  it('rifiuta se la frase nuova esiste gia', () => {
    expect(codiceDi(() => pianifica(radici, opRinomina(DA, 'the user pays by card')))).toBe('frase-esiste');
  });

  it('rifiuta una frase con parametri', () => {
    expect(codiceDi(() => pianifica(radici, opRinomina('the page shows {string}', 'the page contains {string}')))).toBe('non-rinominabile');
  });

  it('rifiuta una definizione che sta in common/', () => {
    expect(codiceDi(() => pianifica(radici, opRinomina('the user is logged in', 'the user is in')))).toBe('non-rinominabile');
  });

  it('rifiuta una frase che nessuno step conosce', () => {
    expect(codiceDi(() => pianifica(radici, opRinomina('the user dances', 'the user sings')))).toBe('non-rinominabile');
  });

  it('rifiuta se la definizione compare due volte', () => {
    scrivi('src/steps/shop/order/pagamento.steps.ts', `${STEPS}\nWhen("${DA}", async function () {});\n`);
    expect(codiceDi(() => pianifica(radici, opRinomina()))).toBe('non-rinominabile');
  });

  it('una riga con la frase vecchia scritta in un modo che la riscrittura non riconosce blocca (livello 1)', () => {
    scrivi('src/features/shop/order/altro.feature', ['Feature: Altro', '  Scenario: Altro', `    * ${DA}`, ''].join('\n'));
    const piano = pianifica(radici, opRinomina());
    expect(piano.blocchi).toContainEqual({ codice: 'frase-orfana', frase: DA, file: 'shop/order/altro.feature' });
  });

  it('una frase nuova quasi uguale a un altro passo avvisa', () => {
    const piano = pianifica(radici, opRinomina(DA, 'the user pays by cards'));
    expect(piano.avvisi).toContainEqual(expect.objectContaining({ codice: 'simile', frase: 'the user pays by cards', altra: 'the user pays by card' }));
  });

  it('versione diversa: conflitto', () => {
    expect(codiceDi(() => pianifica(radici, { ...opRinomina(), versione: 'x' }))).toBe('conflitto');
  });
});

describe('applica', () => {
  it('scrive, passa il controllo vero, e lascia la Page Object identica byte per byte', async () => {
    const pagina = leggi('src/pages/shop/home.page.ts');
    const nuovo = PAGAMENTO.replace(/Pagamento/g, 'Pagamento rifiutato');
    const esito = await applica(radici, pianifica(radici, opTesto(nuovo)), { controllo: verde });
    expect(esito.versione).toBe(improntaDiTesto(leggi(`src/features/${FILE}`)));
    expect(leggi(`src/features/${FILE}`)).toContain('Pagamento rifiutato');
    expect(leggi(`src/features/${FILE}`).includes(MARCATORE)).toBe(false);
    expect(leggi('src/pages/shop/home.page.ts')).toBe(pagina);
    expect(esito.fileToccati).toBe(1);
  });

  it('niente da scrivere: niente controllo, niente scritture', async () => {
    let chiamato = false;
    const esito = await applica(radici, pianifica(radici, opTesto(PAGAMENTO)), {
      controllo: async () => {
        chiamato = true;
        return { ok: true };
      },
    });
    expect(chiamato).toBe(false);
    expect(esito.fileToccati).toBe(0);
  });

  it('rifiuta un piano con blocchi senza scrivere niente', async () => {
    const prima = istantanea();
    const piano = pianifica(radici, opTesto(PAGAMENTO.replace(DA, 'the user dances')));
    await expect(applica(radici, piano, { controllo: verde })).rejects.toMatchObject({ codice: 'bloccato' });
    expect(istantanea()).toEqual(prima);
  });

  it('un file cambiato fra il piano e la scrittura: conflitto, niente scritto', async () => {
    const piano = pianifica(radici, opRinomina());
    scrivi('src/features/shop/order/ordine.feature', `${ORDINE}\n# modificato da un altro\n`);
    const prima = istantanea();
    await expect(applica(radici, piano, { controllo: verde })).rejects.toMatchObject({ codice: 'conflitto' });
    expect(istantanea()).toEqual(prima);
  });

  it('il controllo vero boccia: si ripristina ogni file byte per byte', async () => {
    const prima = istantanea();
    const piano = pianifica(radici, opRinomina());
    let visti: string[] = [];
    const boccia = async (files: string[]) => {
      visti = files;
      // mentre il controllo gira, il repository ha il contenuto nuovo
      expect(leggi('src/steps/shop/order/pagamento.steps.ts')).toContain(A);
      return { ok: false as const, motivo: 'indefinito' as const, passi: ['x'] };
    };
    await expect(applica(radici, piano, { controllo: boccia })).rejects.toMatchObject({
      codice: 'bocciato',
      controllo: { ok: false, motivo: 'indefinito' },
    });
    expect(senzaReports(istantanea())).toEqual(senzaReports(prima));
    expect(visti.sort()).toEqual(['generated/bozza.feature', 'shop/order/ordine.feature', 'shop/order/pagamento.feature']);
    expect((await statoAnnulla(radici)).annullabile).toBe(false);
  });

  it('una scrittura che fallisce a meta lascia tutti i file com erano (EPERM simulato)', async () => {
    const prima = istantanea();
    const piano = pianifica(radici, opRinomina());
    let n = 0;
    const scrivi2 = (p: string, testo: string) => {
      if (++n === 3) throw Object.assign(new Error('EPERM: operation not permitted'), { code: 'EPERM' });
      fs.writeFileSync(p, testo);
    };
    await expect(applica(radici, piano, { controllo: verde, scriviFile: scrivi2 })).rejects.toMatchObject({ codice: 'scrittura' });
    expect(senzaReports(istantanea())).toEqual(senzaReports(prima));
  });

  it('un controllo che non risponde non cambia l esito: fallito, ripristinato', async () => {
    const prima = istantanea();
    const piano = pianifica(radici, opTesto(PAGAMENTO.replace(/Pagamento/g, 'Altro')));
    await expect(
      applica(radici, piano, { controllo: async () => ({ ok: false, motivo: 'tempo' }) })
    ).rejects.toMatchObject({ codice: 'bocciato' });
    expect(senzaReports(istantanea())).toEqual(senzaReports(prima));
  });

  it('la rinomina riscrive tutto insieme e restituisce l impronta del file aperto', async () => {
    const esito = await applica(radici, pianifica(radici, opRinomina()), { controllo: verde });
    expect(esito.fileToccati).toBe(4);
    expect(leggi(`src/features/${FILE}`)).toContain(`When ${A}`);
    expect(leggi('src/features/shop/order/ordine.feature')).toContain(`When ${A}`);
    expect(leggi('src/steps/shop/order/pagamento.steps.ts')).toContain(`When("${A}"`);
    expect(esito.versione).toBe(improntaDiTesto(leggi(`src/features/${FILE}`)));
    expect(esito.rigeneraCatalogo).toBe(true);
  });
});

describe('annulla', () => {
  it('rimette tutto com era, marcatore compreso', async () => {
    const prima = senzaReports(istantanea());
    await applica(radici, pianifica(radici, opRinomina()), { controllo: verde });
    expect((await statoAnnulla(radici)).annullabile).toBe(true);
    const esito = await annulla(radici);
    expect(esito.rigeneraCatalogo).toBe(true);
    expect(senzaReports(istantanea())).toEqual(prima);
  });

  it('annullare due volte non fa niente', async () => {
    await applica(radici, pianifica(radici, opRinomina()), { controllo: verde });
    await annulla(radici);
    await expect(annulla(radici)).rejects.toMatchObject({ codice: 'niente-da-annullare' });
  });

  it('senza nessuna modifica non c e niente da annullare', async () => {
    expect((await statoAnnulla(radici)).annullabile).toBe(false);
    await expect(annulla(radici)).rejects.toMatchObject({ codice: 'niente-da-annullare' });
  });

  it('se un file e cambiato dopo la modifica: cambiato-dopo, niente toccato', async () => {
    await applica(radici, pianifica(radici, opRinomina()), { controllo: verde });
    scrivi('src/features/shop/order/ordine.feature', `${leggi('src/features/shop/order/ordine.feature')}\n# lavoro di un altro\n`);
    const prima = istantanea();
    await expect(annulla(radici)).rejects.toMatchObject({ codice: 'cambiato-dopo' });
    expect(istantanea()).toEqual(prima);
  });

  it('l istantanea ha l impronta dei byte scritti', async () => {
    await applica(radici, pianifica(radici, opTesto(PAGAMENTO.replace(/Pagamento/g, 'Altro'))), { controllo: verde });
    const snap = JSON.parse(leggi('reports/modifiche/ultima-modifica.json')) as { files: Array<{ rel: string; dopo: string }> };
    const f = snap.files.find((x) => x.rel === `src/features/${FILE}`)!;
    expect(f.dopo).toBe(createHash('sha256').update(fs.readFileSync(path.join(RADICE, `src/features/${FILE}`))).digest('hex'));
  });
});

describe('leggiContenuto', () => {
  it('da testo, versione, passi con chi li condivide, e cosa si puo rinominare', () => {
    const c = leggiContenuto(radici, FILE);
    expect(c.versione).toBe(improntaDiTesto(PAGAMENTO));
    expect(c.marcatore).toBe(true);
    expect(c.semplice).toBe(true);
    expect(c.titolo).toBe('Pagamento');
    const p = c.passi.find((x) => x.frase === DA)!;
    expect(p.rinominabile).toBe(true);
    expect(p.condivisoCon.map((x) => x.file).sort()).toEqual(['generated/bozza.feature', 'shop/order/ordine.feature']);
    const login = c.passi.find((x) => x.frase === 'the user is logged in')!;
    expect(login.rinominabile).toBe(false);
    expect(login.motivo).toBe('comune');
    const verifica = c.passi.find((x) => x.frase.startsWith('the page shows'))!;
    expect(verifica.rinominabile).toBe(false);
    expect(verifica.motivo).toBe('parametri');
  });

  it('i passi da offrire sono solo implemented e senza parametri', () => {
    const c = leggiContenuto(radici, FILE);
    const frasi = c.offribili.map((o) => o.frase);
    expect(frasi).toContain('the user opens the shop');
    expect(frasi).not.toContain('the page shows {string}');
  });

  it('uno scenario in generated/ e uno che non e semplice dicono perche non si modificano', () => {
    expect(leggiContenuto(radici, 'generated/bozza.feature')).toMatchObject({ semplice: false, ragione: 'registrato' });
  });

  it('un percorso non ammesso: ErrorePiano', () => {
    expect(codiceDi(() => leggiContenuto(radici, '../x.feature'))).toBe('percorso');
    expect(codiceDi(() => leggiContenuto(radici, 'shop/no.feature'))).toBe('non-trovato');
  });
});
