import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { pianifica, applica, annulla, statoAnnulla, ErrorePiano, type Operazione } from '@/lib/piano-modifica';
import { improntaDiTesto } from '@/lib/impronta-scenario';
import { MARCATORE } from '@/lib/salva-scenario';

/**
 * Sposta ed elimina uno scenario salvato (spec A7, A8). Come `piano-modifica.test.ts`:
 * cartelle temporanee, mai `src/features/` vera; il controllo vero si inietta.
 */

const RADICE = fs.mkdtempSync(path.join(os.tmpdir(), 'piano-sposta-elimina-'));
const radici = { repoRoot: RADICE, featuresDir: path.join(RADICE, 'src', 'features') };

const DA = 'the user adds the item';
const M = `# ${MARCATORE} · rigenerabile`;
const scenario = (app: string, flusso: string, nome: string, titolo: string, ...passi: string[]) =>
  [
    M,
    `# src/features/${app}/${flusso}/${nome}.feature`,
    '',
    `@${app} @${flusso} @generato @da-rivedere`,
    `Feature: ${titolo}`,
    '',
    `  Scenario: ${titolo}`,
    ...passi.map((p) => `    ${p}`),
    '',
  ].join('\n');

const PAGAMENTO = scenario('shop', 'order', 'pagamento', 'Pagamento', 'Given the user is logged in', `When ${DA}`, 'Then the page shows "Done"');
const ORDINE = scenario('shop', 'order', 'ordine', 'Ordine', 'Given the user is logged in', `When ${DA}`, 'And the user pays by card');
const SPEDIZIONE = scenario(
  'shop', 'order', 'spedizione', 'Spedizione',
  'Given the user is logged in',
  'When the user ships the parcel',
  'And the user types "x" in the form',
  'And the user pays by card',
  'And the user waits for the review',
  'Then the page shows "Shipped"'
);
const SOLO = scenario('shop', 'lonely', 'solo', 'Da solo', 'Given the user is logged in', 'When the user does a solo thing', 'Then the page shows "Solo"');
const DUE_SCENARI = `${PAGAMENTO}\n  Scenario: Altro\n    Given the user is logged in\n`;

const PAGAMENTO_STEPS = [
  `// ${MARCATORE} · rigenerabile`,
  '// src/steps/shop/order/pagamento.steps.ts',
  'import { When } from "@cucumber/cucumber";',
  'import { HomePage } from "../../../pages/shop/home.page";',
  '',
  '/**',
  ` * @intent ${DA}`,
  ' */',
  `When("${DA}", async function () { new HomePage(); });`,
  '',
  '/**',
  ' * @intent the user pays by card',
  ' */',
  'When("the user pays by card", async function () {});',
  '',
].join('\n');

const SPEDIZIONE_STEPS = [
  `// ${MARCATORE} · rigenerabile`,
  'import { When } from "@cucumber/cucumber";',
  '',
  '/**',
  ' * @intent the user ships the parcel',
  ' */',
  'When("the user ships the parcel", async function () {});',
  '',
  '/**',
  ' * @intent the user tracks the parcel',
  ' */',
  'When("the user tracks the parcel", async function () {});',
  '',
  'When("the user types {string} in the form", async function (_v: string) {});',
  '',
].join('\n');

const SOLO_STEPS = [
  `// ${MARCATORE} · rigenerabile`,
  '// src/steps/shop/lonely/solo.steps.ts',
  'import { When } from "@cucumber/cucumber";',
  '',
  '/**',
  ' * @intent the user does a solo thing',
  ' */',
  'When("the user does a solo thing", async function () {});',
  '',
].join('\n');

const PAGINA = `// ${MARCATORE} · rigenerabile\nexport class HomePage {}\n`;

const voce = (expression: string, file: string, riga: number, extra: Record<string, unknown> = {}) => ({
  expression,
  parameters: expression.includes('{string}') ? ['{string}'] : [],
  app: file.includes('common') ? 'common' : 'shop',
  area: file.includes('common') ? 'common' : 'order',
  domain: 'shop',
  status: 'implemented',
  sourceRef: `src\\steps\\${file}:${riga}`,
  documented: true,
  ...extra,
});
const CATALOGO = {
  steps: [
    voce('the user is logged in', 'common\\accesso.steps.ts', 1),
    voce('the page shows {string}', 'common\\verifica.steps.ts', 1),
    voce(DA, 'shop\\order\\pagamento.steps.ts', 7),
    voce('the user pays by card', 'shop\\order\\pagamento.steps.ts', 12),
    // Un passo registrato: ha il suo codice ma e' ancora `wanted` (in attesa del team). Va con lo scenario, come ogni altro.
    voce('the user ships the parcel', 'shop\\order\\spedizione.steps.ts', 7, { status: 'wanted' }),
    voce('the user tracks the parcel', 'shop\\order\\spedizione.steps.ts', 12),
    voce('the user types {string} in the form', 'shop\\order\\spedizione.steps.ts', 15),
    // Una richiesta del team che nessuno ha ancora costruito: niente codice, quindi niente da togliere.
    voce('the user waits for the review', 'shop\\order\\spedizione.steps.ts', 17, { status: 'wanted', sourceRef: '' }),
    voce('the user does a solo thing', 'shop\\lonely\\solo.steps.ts', 7, { status: 'wanted' }),
  ],
};

function scrivi(rel: string, testo: string) {
  const p = path.join(RADICE, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, testo);
}
const leggi = (rel: string) => fs.readFileSync(path.join(RADICE, rel), 'utf-8');
const esiste = (rel: string) => fs.existsSync(path.join(RADICE, rel));

/** Ogni file (e ogni cartella) sotto la radice: com'e' adesso, per confrontarlo con com'era. */
function istantanea(): string[] {
  const out: string[] = [];
  const visita = (d: string) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      const rel = path.relative(RADICE, p).replace(/\\/g, '/');
      if (rel.startsWith('reports')) continue;
      if (e.isDirectory()) {
        out.push(`${rel}/`);
        visita(p);
      } else out.push(`${rel}:${fs.readFileSync(p, 'utf-8')}`);
    }
  };
  visita(RADICE);
  return out.sort();
}

const verde = async () => ({ ok: true as const });
const versione = (file: string) => improntaDiTesto(leggi(`src/features/${file}`));
const opSposta = (file: string, flusso: string): Operazione => ({ operazione: 'sposta', file, versione: versione(file), flusso });
const opElimina = (file: string): Operazione => ({ operazione: 'elimina', file, versione: versione(file) });

const codiceDi = (f: () => unknown): string | undefined => {
  try {
    f();
  } catch (e) {
    return e instanceof ErrorePiano ? e.codice : `altro: ${(e as Error).message}`;
  }
  return undefined;
};

beforeEach(() => {
  fs.rmSync(RADICE, { recursive: true, force: true });
  fs.mkdirSync(RADICE, { recursive: true });
  scrivi('step-catalog.json', JSON.stringify(CATALOGO));
  scrivi('src/steps/common/accesso.steps.ts', 'import { Given } from "@cucumber/cucumber";\nGiven("the user is logged in", async function () {});\n');
  scrivi('src/steps/common/verifica.steps.ts', 'import { Then } from "@cucumber/cucumber";\nThen("the page shows {string}", async function (_t: string) {});\n');
  scrivi('src/steps/shop/order/pagamento.steps.ts', PAGAMENTO_STEPS);
  scrivi('src/steps/shop/order/spedizione.steps.ts', SPEDIZIONE_STEPS);
  scrivi('src/steps/shop/lonely/solo.steps.ts', SOLO_STEPS);
  scrivi('src/pages/shop/home.page.ts', PAGINA);
  scrivi('src/features/shop/order/pagamento.feature', PAGAMENTO);
  scrivi('src/features/shop/order/ordine.feature', ORDINE);
  scrivi('src/features/shop/order/spedizione.feature', SPEDIZIONE);
  scrivi('src/features/shop/lonely/solo.feature', SOLO);
  scrivi('src/features/generated/bozza.feature', scenario('shop', 'order', 'bozza', 'Bozza', `When ${DA}`));
});
afterAll(() => fs.rmSync(RADICE, { recursive: true, force: true }));

// ---------------------------------------------------------------------------
// Sposta
// ---------------------------------------------------------------------------

describe('pianifica: sposta', () => {
  const FILE = 'shop/order/pagamento.feature';

  it('sposta il .feature e il suo .steps.ts alla stessa profondita, senza scrivere niente adesso', () => {
    const prima = istantanea();
    const piano = pianifica(radici, opSposta(FILE, 'account'));
    expect(istantanea()).toEqual(prima);
    const mosse = piano.scritture.map((s) => [s.rel, s.vecchio === null ? 'nuovo' : s.nuovo === null ? 'via' : 'riscritto']).sort();
    expect(mosse).toEqual([
      ['src/features/shop/account/pagamento.feature', 'nuovo'],
      ['src/features/shop/order/pagamento.feature', 'via'],
      ['src/steps/shop/account/pagamento.steps.ts', 'nuovo'],
      ['src/steps/shop/order/pagamento.steps.ts', 'via'],
    ]);
    expect(piano.fileDopo).toBe('shop/account/pagamento.feature');
    expect(piano.spostamento).toEqual({ da: FILE, a: 'shop/account/pagamento.feature' });
    expect(piano.featureToccati).toEqual(['shop/account/pagamento.feature']);
    expect(piano.rigeneraCatalogo).toBe(true);
    expect(piano.blocchi).toEqual([]);
  });

  it('cambia il tag del flusso e il commento del percorso; gli altri tag restano e la riga dei tag non si duplica', () => {
    const piano = pianifica(radici, opSposta(FILE, 'account'));
    const nuovo = piano.testoAperto;
    expect(nuovo).toContain('@shop @account @generato @da-rivedere');
    expect(nuovo).toContain('# src/features/shop/account/pagamento.feature');
    expect(nuovo.split('\n').filter((r) => r.startsWith('@'))).toHaveLength(1);
  });

  it('@non-automatizzato e gli altri tag riservati sopravvivono al cambio di flusso', () => {
    scrivi(`src/features/${FILE}`, PAGAMENTO.replace('@shop @order @generato @da-rivedere', '@generato @shop @order @ticket:ABC-1'));
    const nuovo = pianifica(radici, opSposta(FILE, 'account')).testoAperto;
    expect(nuovo).toContain('@shop @account @generato @ticket:ABC-1');
  });

  it('il file spostato e i suoi step perdono il marcatore: ora sono tuoi', () => {
    const piano = pianifica(radici, opSposta(FILE, 'account'));
    for (const s of piano.scritture.filter((x) => x.nuovo !== null)) expect(s.nuovo!.includes(MARCATORE)).toBe(false);
    expect(piano.marcatoreTolto).toBe(true);
    expect(piano.conseguenze.scenari).toEqual([{ file: 'shop/account/pagamento.feature', nome: 'Pagamento', diventaTuo: true }]);
  });

  it('negli step il commento del percorso segue il file e gli import restano quelli (stessa profondita)', () => {
    const piano = pianifica(radici, opSposta(FILE, 'account'));
    const steps = piano.scritture.find((s) => s.rel === 'src/steps/shop/account/pagamento.steps.ts')!.nuovo!;
    expect(steps).toContain('// src/steps/shop/account/pagamento.steps.ts');
    expect(steps).toContain('from "../../../pages/shop/home.page"');
    expect(steps).toContain(`When("${DA}"`);
  });

  it('senza un .steps.ts con il suo nome sposta solo il .feature', () => {
    fs.rmSync(path.join(RADICE, 'src/steps/shop/order/pagamento.steps.ts'));
    const piano = pianifica(radici, opSposta(FILE, 'account'));
    expect(piano.scritture.map((s) => s.rel).sort()).toEqual([
      'src/features/shop/account/pagamento.feature',
      'src/features/shop/order/pagamento.feature',
    ]);
    expect(piano.rigeneraCatalogo).toBe(false);
  });

  it('destinazione occupata: rifiuta e non scrive niente', () => {
    scrivi('src/features/shop/account/pagamento.feature', 'Feature: gia qui\n');
    const prima = istantanea();
    expect(codiceDi(() => pianifica(radici, opSposta(FILE, 'account')))).toBe('occupato');
    expect(istantanea()).toEqual(prima);
  });

  it('il posto degli step occupato rifiuta lo stesso (per spostare conta il posto)', () => {
    scrivi('src/steps/shop/account/pagamento.steps.ts', '// di un altro\n');
    expect(codiceDi(() => pianifica(radici, opSposta(FILE, 'account')))).toBe('occupato');
  });

  it('un nome di cartella non valido e rifiutato', () => {
    for (const flusso of ['', '../fuori', 'a/b', 'Maiuscolo', 'con spazi', 'generated', 'x'.repeat(41)]) {
      expect(codiceDi(() => pianifica(radici, opSposta(FILE, flusso))), flusso).toBe('flusso');
    }
  });

  it('lo stesso flusso: niente da spostare', () => {
    expect(codiceDi(() => pianifica(radici, opSposta(FILE, 'order')))).toBe('non-spostabile');
  });

  it('un file che non sta in <app>/<flusso>/ non si sposta', () => {
    scrivi('src/features/shop/piatto.feature', PAGAMENTO);
    expect(codiceDi(() => pianifica(radici, opSposta('shop/piatto.feature', 'account')))).toBe('non-spostabile');
  });

  it('uno scenario registrato non ancora salvato non si sposta da qui', () => {
    expect(codiceDi(() => pianifica(radici, opSposta('generated/bozza.feature', 'account')))).toBe('non-modificabile');
  });

  it('un file con piu scenari non si sposta dalla modifica guidata', () => {
    scrivi(`src/features/${FILE}`, DUE_SCENARI);
    expect(codiceDi(() => pianifica(radici, opSposta(FILE, 'account')))).toBe('non-modificabile');
  });

  it('versione diversa: conflitto', () => {
    expect(codiceDi(() => pianifica(radici, { ...opSposta(FILE, 'account'), versione: 'x' }))).toBe('conflitto');
  });

  it('solo l\'applicazione dello scenario: il flusso non puo portare fuori dall\'applicazione', () => {
    // Il flusso e' un nome di cartella, non un percorso: non c'e' modo di nominare un'altra applicazione.
    expect(codiceDi(() => pianifica(radici, opSposta(FILE, 'altra-app/account')))).toBe('flusso');
  });
});

describe('applica: sposta', () => {
  const FILE = 'shop/order/pagamento.feature';

  it('scrive i file nuovi, toglie i vecchi, lascia identica ogni Page Object e controlla il file nuovo', async () => {
    const pagina = leggi('src/pages/shop/home.page.ts');
    const controllati: string[][] = [];
    const esito = await applica(radici, pianifica(radici, opSposta(FILE, 'account')), {
      controllo: async (files) => {
        controllati.push(files);
        return { ok: true };
      },
    });
    expect(controllati).toEqual([['shop/account/pagamento.feature']]);
    expect(esiste('src/features/shop/order/pagamento.feature')).toBe(false);
    expect(esiste('src/steps/shop/order/pagamento.steps.ts')).toBe(false);
    expect(leggi('src/features/shop/account/pagamento.feature')).toContain('@shop @account @generato');
    expect(leggi('src/steps/shop/account/pagamento.steps.ts')).toContain('When("the user adds the item"');
    expect(leggi('src/pages/shop/home.page.ts')).toBe(pagina);
    expect(esito.fileDopo).toBe('shop/account/pagamento.feature');
    expect(esito.versione).toBe(improntaDiTesto(leggi('src/features/shop/account/pagamento.feature')));
    expect(esito.spostamento).toEqual({ da: FILE, a: 'shop/account/pagamento.feature' });
  });

  it('le cartelle rimaste vuote si tolgono; quelle con altro dentro no', async () => {
    await applica(radici, pianifica(radici, opSposta('shop/lonely/solo.feature', 'order')), { controllo: verde });
    expect(esiste('src/features/shop/lonely')).toBe(false);
    expect(esiste('src/steps/shop/lonely')).toBe(false);
    expect(esiste('src/features/shop/order/solo.feature')).toBe(true);
    // `order` ha altri file: resta.
    await applica(radici, pianifica(radici, opSposta(FILE, 'account')), { controllo: verde });
    expect(esiste('src/features/shop/order/ordine.feature')).toBe(true);
    expect(esiste('src/steps/shop/order/spedizione.steps.ts')).toBe(true);
  });

  it('un controllo vero bocciato rimette tutto com\'era, cartelle comprese', async () => {
    const prima = istantanea();
    await expect(
      applica(radici, pianifica(radici, opSposta(FILE, 'account')), { controllo: async () => ({ ok: false, motivo: 'indefinito', passi: ['x'] }) })
    ).rejects.toMatchObject({ codice: 'bocciato' });
    expect(istantanea()).toEqual(prima);
    expect(esiste('src/features/shop/account')).toBe(false);
    expect(statoAnnulla(radici).annullabile).toBe(false);
  });

  it('una scrittura che fallisce a meta\' lascia tutto com\'era', async () => {
    const prima = istantanea();
    let n = 0;
    await expect(
      applica(radici, pianifica(radici, opSposta(FILE, 'account')), {
        controllo: verde,
        scriviFile: (p, t) => {
          if (++n === 2) throw new Error('EPERM');
          if (t === null) return;
          fs.mkdirSync(path.dirname(p), { recursive: true });
          fs.writeFileSync(p, t);
        },
      })
    ).rejects.toMatchObject({ codice: 'scrittura' });
    expect(istantanea()).toEqual(prima);
  });

  it('se un file e cambiato fra il piano e la scrittura: conflitto, niente scritto', async () => {
    const piano = pianifica(radici, opSposta(FILE, 'account'));
    scrivi(`src/features/${FILE}`, `${PAGAMENTO}\n# toccato`);
    const prima = istantanea();
    await expect(applica(radici, piano, { controllo: verde })).rejects.toMatchObject({ codice: 'conflitto' });
    expect(istantanea()).toEqual(prima);
  });

  it('se la destinazione compare fra il piano e la scrittura: conflitto, niente scritto', async () => {
    const piano = pianifica(radici, opSposta(FILE, 'account'));
    scrivi('src/features/shop/account/pagamento.feature', 'Feature: arrivato nel frattempo\n');
    const prima = istantanea();
    await expect(applica(radici, piano, { controllo: verde })).rejects.toMatchObject({ codice: 'conflitto' });
    expect(istantanea()).toEqual(prima);
  });
});

describe('annulla: sposta', () => {
  const FILE = 'shop/order/pagamento.feature';

  it('rimette il file e gli step al loro posto, byte per byte, e toglie la cartella creata', async () => {
    const prima = istantanea();
    await applica(radici, pianifica(radici, opSposta(FILE, 'account')), { controllo: verde });
    expect(istantanea()).not.toEqual(prima);
    const esito = await annulla(radici);
    expect(esito.file).toBe(FILE);
    expect(esito.rigeneraCatalogo).toBe(true);
    expect(esito.spostamento).toEqual({ da: FILE, a: 'shop/account/pagamento.feature' });
    expect(istantanea()).toEqual(prima);
    expect(esiste('src/features/shop/account')).toBe(false);
    expect(esiste('src/steps/shop/account')).toBe(false);
  });

  it('annulla anche uno spostamento che aveva tolto una cartella vuota', async () => {
    const prima = istantanea();
    await applica(radici, pianifica(radici, opSposta('shop/lonely/solo.feature', 'order')), { controllo: verde });
    await annulla(radici);
    expect(istantanea()).toEqual(prima);
  });

  it('se il file spostato e cambiato dopo: cambiato-dopo, niente toccato', async () => {
    await applica(radici, pianifica(radici, opSposta(FILE, 'account')), { controllo: verde });
    scrivi('src/features/shop/account/pagamento.feature', 'Feature: cambiato da altri\n');
    const prima = istantanea();
    await expect(annulla(radici)).rejects.toMatchObject({ codice: 'cambiato-dopo' });
    expect(istantanea()).toEqual(prima);
  });

  it('annullare due volte non fa niente', async () => {
    await applica(radici, pianifica(radici, opSposta(FILE, 'account')), { controllo: verde });
    await annulla(radici);
    await expect(annulla(radici)).rejects.toMatchObject({ codice: 'niente-da-annullare' });
  });
});

// ---------------------------------------------------------------------------
// Elimina
// ---------------------------------------------------------------------------

describe('pianifica: elimina', () => {
  it('lo scenario che condivide un passo: il passo resta, e l\'elenco dice perche\' e con chi', () => {
    const piano = pianifica(radici, opElimina('shop/order/pagamento.feature'));
    expect(piano.passi!.vanno).toEqual([]);
    const restano = Object.fromEntries(piano.passi!.restano.map((p) => [p.frase, p]));
    expect(restano[DA]).toMatchObject({ motivo: 'condiviso', usatoDa: expect.arrayContaining(['Ordine']) });
    expect(restano['the user is logged in']).toMatchObject({ motivo: 'comune' });
    expect(restano['the page shows {string}']).toMatchObject({ motivo: 'comune' });
    // Lo scenario sparisce e basta: gli step non si toccano.
    expect(piano.scritture.map((s) => [s.rel, s.nuovo])).toEqual([['src/features/shop/order/pagamento.feature', null]]);
  });

  it('i passi che nessun altro usa vanno, i condivisi, comuni, con parametri e richiesti dal team restano', () => {
    const piano = pianifica(radici, opElimina('shop/order/spedizione.feature'));
    expect(piano.passi!.vanno).toEqual(['the user ships the parcel']);
    const restano = Object.fromEntries(piano.passi!.restano.map((p) => [p.frase, p.motivo]));
    expect(restano).toEqual({
      'the user is logged in': 'comune',
      'the page shows {string}': 'comune',
      'the user pays by card': 'condiviso',
      'the user types {string} in the form': 'parametri',
      'the user waits for the review': 'richiesto',
    });
  });

  it('toglie solo la definizione dei passi che vanno e riscrive gli step senza marcatore, se altre definizioni restano', () => {
    const piano = pianifica(radici, opElimina('shop/order/spedizione.feature'));
    const steps = piano.scritture.find((s) => s.rel === 'src/steps/shop/order/spedizione.steps.ts')!;
    expect(steps.nuovo).not.toBeNull();
    expect(steps.nuovo).not.toContain('the user ships the parcel');
    expect(steps.nuovo).not.toContain('@intent the user ships');
    expect(steps.nuovo).toContain('the user tracks the parcel');
    expect(steps.nuovo).toContain('the user types {string} in the form');
    expect(steps.nuovo!.includes(MARCATORE)).toBe(false);
    expect(piano.rigeneraCatalogo).toBe(true);
  });

  it('il .steps.ts sparisce solo se non resta nessuna definizione', () => {
    const piano = pianifica(radici, opElimina('shop/lonely/solo.feature'));
    expect(piano.passi!.vanno).toEqual(['the user does a solo thing']);
    expect(piano.scritture.map((s) => [s.rel, s.nuovo === null]).sort()).toEqual([
      ['src/features/shop/lonely/solo.feature', true],
      ['src/steps/shop/lonely/solo.steps.ts', true],
    ]);
  });

  it('non scrive e non tocca nessuna Page Object, ne\' come file ne\' come metodo', () => {
    const prima = istantanea();
    for (const f of ['shop/order/pagamento.feature', 'shop/order/spedizione.feature', 'shop/lonely/solo.feature']) {
      const piano = pianifica(radici, opElimina(f));
      expect(piano.scritture.some((s) => s.rel.includes('/pages/'))).toBe(false);
    }
    expect(istantanea()).toEqual(prima);
  });

  it('i controlli vengono dagli scenari che usano i passi condivisi che restano', () => {
    expect(pianifica(radici, opElimina('shop/order/pagamento.feature')).featureToccati).toEqual(['shop/order/ordine.feature']);
    expect(pianifica(radici, opElimina('shop/order/spedizione.feature')).featureToccati).toEqual(['shop/order/ordine.feature']);
  });

  it('se nessuno scenario usa un passo che resta (i passi comuni non contano) non c\'e\' niente da controllare', () => {
    expect(pianifica(radici, opElimina('shop/lonely/solo.feature')).featureToccati).toEqual([]);
  });

  it('dice che lo scenario eliminato diventa niente', () => {
    const piano = pianifica(radici, opElimina('shop/order/pagamento.feature'));
    expect(piano.fileDopo).toBeNull();
    expect(piano.conseguenze.scenari).toEqual([{ file: 'shop/order/pagamento.feature', nome: 'Pagamento', diventaTuo: false }]);
  });

  it('un file con due scenari non si elimina dalla modifica guidata', () => {
    scrivi('src/features/shop/order/pagamento.feature', DUE_SCENARI);
    expect(codiceDi(() => pianifica(radici, opElimina('shop/order/pagamento.feature')))).toBe('non-modificabile');
  });

  it('uno scenario registrato non salvato o un documento non si eliminano da qui', () => {
    expect(codiceDi(() => pianifica(radici, opElimina('generated/bozza.feature')))).toBe('non-modificabile');
    scrivi('src/features/shop/order/doc.feature', '@non-automatizzato\nFeature: D\n  Scenario: D\n    Given x\n');
    expect(codiceDi(() => pianifica(radici, opElimina('shop/order/doc.feature')))).toBe('non-modificabile');
  });

  it('versione diversa: conflitto', () => {
    expect(codiceDi(() => pianifica(radici, { ...opElimina('shop/order/pagamento.feature'), versione: 'x' }))).toBe('conflitto');
  });

  it('un passo la cui definizione non si trova resta: non si indovina', () => {
    scrivi('src/steps/shop/lonely/solo.steps.ts', 'import { When } from "@cucumber/cucumber";\n// vuoto\n');
    const piano = pianifica(radici, opElimina('shop/lonely/solo.feature'));
    expect(piano.passi!.vanno).toEqual([]);
    expect(piano.passi!.restano.find((p) => p.frase === 'the user does a solo thing')?.motivo).toBe('altro');
  });
});

describe('applica e annulla: elimina', () => {
  it('toglie lo scenario, il passo condiviso resta e la Page Object e identica byte per byte', async () => {
    const pagina = leggi('src/pages/shop/home.page.ts');
    const steps = leggi('src/steps/shop/order/pagamento.steps.ts');
    const catalogo = leggi('step-catalog.json');
    const esito = await applica(radici, pianifica(radici, opElimina('shop/order/pagamento.feature')), { controllo: verde });
    expect(esiste('src/features/shop/order/pagamento.feature')).toBe(false);
    expect(leggi('src/steps/shop/order/pagamento.steps.ts')).toBe(steps);
    expect(leggi('src/pages/shop/home.page.ts')).toBe(pagina);
    expect(leggi('step-catalog.json')).toBe(catalogo);
    expect(esito.fileDopo).toBeNull();
    expect(esito.passi!.restano.map((p) => p.frase)).toContain(DA);
  });

  it('l\'Annulla ricrea tutto, byte per byte, anche le cartelle e gli step cancellati', async () => {
    const prima = istantanea();
    await applica(radici, pianifica(radici, opElimina('shop/lonely/solo.feature')), { controllo: verde });
    expect(esiste('src/features/shop/lonely')).toBe(false);
    expect(esiste('src/steps/shop/lonely')).toBe(false);
    const esito = await annulla(radici);
    expect(esito.file).toBe('shop/lonely/solo.feature');
    expect(esito.rigeneraCatalogo).toBe(true);
    expect(istantanea()).toEqual(prima);
  });

  it('l\'Annulla di un\'eliminazione che aveva riscritto gli step li rimette com\'erano', async () => {
    const prima = istantanea();
    await applica(radici, pianifica(radici, opElimina('shop/order/spedizione.feature')), { controllo: verde });
    expect(leggi('src/steps/shop/order/spedizione.steps.ts')).not.toContain('ships the parcel');
    await annulla(radici);
    expect(istantanea()).toEqual(prima);
  });

  it('il controllo e fatto sugli scenari che restano, e se boccia tutto torna com\'era', async () => {
    const prima = istantanea();
    const controllati: string[][] = [];
    await expect(
      applica(radici, pianifica(radici, opElimina('shop/order/spedizione.feature')), {
        controllo: async (files) => {
          controllati.push(files);
          return { ok: false, motivo: 'compilazione' };
        },
      })
    ).rejects.toMatchObject({ codice: 'bocciato' });
    expect(controllati).toEqual([['shop/order/ordine.feature']]);
    expect(istantanea()).toEqual(prima);
  });

  it('senza scenari da controllare non lancia nessun controllo', async () => {
    let chiamato = false;
    await applica(radici, pianifica(radici, opElimina('shop/lonely/solo.feature')), {
      controllo: async () => {
        chiamato = true;
        return { ok: true };
      },
    });
    expect(chiamato).toBe(false);
    expect(esiste('src/features/shop/lonely/solo.feature')).toBe(false);
  });

  it('se il file e cambiato dopo l\'eliminazione (ricreato da altri), l\'Annulla non lo sovrascrive', async () => {
    await applica(radici, pianifica(radici, opElimina('shop/order/pagamento.feature')), { controllo: verde });
    scrivi('src/features/shop/order/pagamento.feature', 'Feature: scritto da altri\n');
    await expect(annulla(radici)).rejects.toMatchObject({ codice: 'cambiato-dopo' });
    expect(leggi('src/features/shop/order/pagamento.feature')).toBe('Feature: scritto da altri\n');
  });

  it('una cancellazione che fallisce a meta\' ricrea quello che aveva tolto', async () => {
    const prima = istantanea();
    // Il piano di un'eliminazione con gli step: due file da togliere. Si scrive con un EPERM al secondo.
    let n = 0;
    await expect(
      applica(radici, pianifica(radici, opElimina('shop/lonely/solo.feature')), {
        controllo: verde,
        scriviFile: (p, t) => {
          if (++n === 2) throw new Error('EPERM');
          if (t === null) fs.rmSync(p);
        },
      })
    ).rejects.toMatchObject({ codice: 'scrittura' });
    expect(istantanea()).toEqual(prima);
  });
});
