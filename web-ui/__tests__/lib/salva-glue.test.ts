import { describe, it, expect, afterEach } from 'vitest';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { pianificaGlue, scriviGlue } from '@/lib/salva-glue';

const M = 'generato-da: bdd-generate · rigenerabile';

const STEPS = `// ${M}
// src/steps/generated/rec-1.steps.ts

import { Given, When, Then } from "@cucumber/cucumber";
import { CustomWorld } from "../../support/world";
import { AccessoPage } from "../../pages/generated/accesso.page";
import { OrdiniPage } from "../../pages/generated/ordini.page";

let accessoPage: AccessoPage;
let ordiniPage: OrdiniPage;

Given("il cliente accede", async function (this: CustomWorld) {
  accessoPage = new AccessoPage(this.page);
  await accessoPage.navigate();
  await accessoPage.clickEntra();
  ordiniPage = new OrdiniPage(this.page);
  await ordiniPage.assertLoaded();
});

When("il cliente annulla un ordine", async function (this: CustomWorld) {
  await ordiniPage.clickAnnullaOrdine();
});
`;

function pagina(classe: string, pathUrl: string, membri: Array<[string, string, string]>, marcatore = true): string {
  const locator = membri.map(([, loc, sel]) => `  private readonly ${loc}: Locator = ${sel};`).join('\n');
  const metodi = membri
    .map(([m, loc]) => `  /**\n   * @componente  ${m}\n   */\n  async ${m}(): Promise<void> {\n    await this.${loc}.click();\n  }`)
    .join('\n\n');
  return `${marcatore ? `// ${M}\n` : ''}// src/pages/generated/${pathUrl}.page.ts

import { type Locator, type Page } from "@playwright/test";
import { BasePage } from "../../support/base.page";

export class ${classe} extends BasePage {
  readonly path = "/${pathUrl}";

  constructor(page: Page) {
    super(page);
  }

  // ─── Componenti ────────────────────────────────────────────────────────────
${locator}

  // ─── Riconoscimento ────────────────────────────────────────────────────────
  async assertLoaded(): Promise<void> {
  }

  // ─── Azioni ────────────────────────────────────────────────────────────────
${metodi}
}
`;
}

const ACCESSO = pagina('AccessoPage', 'accesso', [['clickEntra', 'entraButton', "this.page.getByRole('button', { name: 'Entra' })"]]);
const ORDINI = pagina('OrdiniPage', 'ordini', [
  ['clickAnnullaOrdine', 'annullaButton', "this.page.getByRole('button', { name: 'Annulla ordine' })"],
  ['clickDettaglio', 'dettaglioLink', "this.page.getByRole('link', { name: 'Dettaglio' })"],
]);

let radice: string | null = null;
afterEach(() => {
  if (radice) fs.rmSync(radice, { recursive: true, force: true });
  radice = null;
});

function albero(files: Record<string, string>): string {
  radice = fs.mkdtempSync(path.join(os.tmpdir(), 'glue-'));
  for (const [rel, testo] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(radice, rel)), { recursive: true });
    fs.writeFileSync(path.join(radice, rel), testo);
  }
  return radice;
}
const leggi = (rel: string) => fs.readFileSync(path.join(radice!, rel), 'utf-8');
const esiste = (rel: string) => fs.existsSync(path.join(radice!, rel));
const BASE = {
  'steps/generated/rec-1.steps.ts': STEPS,
  'pages/generated/accesso.page.ts': ACCESSO,
  'pages/generated/ordini.page.ts': ORDINI,
};

describe('step e Page Object seguono lo scenario salvato', () => {
  it('prima volta: gli step vanno accanto al flusso, le pagine nella cartella dell\'applicazione', () => {
    const r = albero(BASE);
    const piano = pianificaGlue(r, 'steps/generated/rec-1.steps.ts', 'shop', 'orders', 'new-order');
    scriviGlue(piano);
    expect(piano.steps).toBe('steps/shop/orders/new-order.steps.ts');
    expect(piano.pagine).toEqual([
      { file: 'pages/shop/accesso.page.ts', come: 'nuova' },
      { file: 'pages/shop/ordini.page.ts', come: 'nuova' },
    ]);
    const steps = leggi('steps/shop/orders/new-order.steps.ts');
    expect(steps).toContain('from "../../../support/world"');
    expect(steps).toContain('from "../../../pages/shop/accesso.page"');
    expect(steps).toContain('// src/steps/shop/orders/new-order.steps.ts');
    expect(steps).not.toContain('generated');
    expect(leggi('pages/shop/ordini.page.ts')).toContain('// src/pages/shop/ordini.page.ts');
    // La pagina sta a due livelli come prima: la sua import di BasePage resta valida.
    expect(leggi('pages/shop/ordini.page.ts')).toContain('from "../../support/base.page"');
    // Gli step generati spariscono: lasciati li', le frasi sarebbero definite due volte.
    expect(esiste('steps/generated/rec-1.steps.ts')).toBe(false);
    // Le Page Object copiate spariscono anche loro: nessuno scenario ancora da
    // salvare le usa piu', quindi restare sarebbe una copia orfana che la
    // prossima generazione riscriverebbe.
    expect(esiste('pages/generated/accesso.page.ts')).toBe(false);
    expect(esiste('pages/generated/ordini.page.ts')).toBe(false);
  });

  it('una pagina gia\' salvata che ha tutti i metodi che servono si riusa com\'e\'', () => {
    const r = albero({ ...BASE, 'pages/shop/ordini.page.ts': ORDINI.replace('generated/ordini', 'shop/ordini') + '\n// mia nota' });
    const piano = pianificaGlue(r, 'steps/generated/rec-1.steps.ts', 'shop', 'orders', 'x');
    scriviGlue(piano);
    expect(piano.pagine.find((p) => p.file === 'pages/shop/ordini.page.ts')?.come).toBe('riusata');
    expect(leggi('pages/shop/ordini.page.ts')).toContain('// mia nota');
  });

  it('una pagina gia\' salvata a cui manca un metodo cresce: si aggiunge, niente si toglie', () => {
    const vecchia = pagina('OrdiniPage', 'ordini', [
      ['clickDettaglio', 'dettaglioLink', "this.page.getByRole('link', { name: 'Dettaglio' })"],
      ['clickStampa', 'stampaButton', "this.page.getByRole('button', { name: 'Stampa' })"],
    ]).replace('generated/ordini', 'shop/ordini');
    const r = albero({ ...BASE, 'pages/shop/ordini.page.ts': vecchia });
    const piano = pianificaGlue(r, 'steps/generated/rec-1.steps.ts', 'shop', 'orders', 'x');
    scriviGlue(piano);
    expect(piano.pagine.find((p) => p.file === 'pages/shop/ordini.page.ts')?.come).toBe('estesa');
    const testo = leggi('pages/shop/ordini.page.ts');
    expect(testo).toContain('async clickStampa()');
    expect(testo).toContain('async clickDettaglio()');
    expect(testo).toContain('async clickAnnullaOrdine()');
    expect(testo).toContain("private readonly annullaButton: Locator = this.page.getByRole('button', { name: 'Annulla ordine' });");
    expect(testo.match(/async clickDettaglio\(/g)?.length).toBe(1);
    expect(testo.trimEnd().endsWith('}')).toBe(true);
  });

  it('una pagina modificata a mano non si tocca: se le manca un metodo, si dice quale', () => {
    const aMano = pagina('OrdiniPage', 'ordini', [['clickDettaglio', 'dettaglioLink', "this.page.getByRole('link')"]], false);
    const r = albero({ ...BASE, 'pages/shop/ordini.page.ts': aMano });
    expect(() => pianificaGlue(r, 'steps/generated/rec-1.steps.ts', 'shop', 'orders', 'x')).toThrow(/modificat/);
    try {
      pianificaGlue(r, 'steps/generated/rec-1.steps.ts', 'shop', 'orders', 'x');
    } catch (e) {
      expect((e as { codice: string }).codice).toBe('pagina-a-mano');
      expect((e as { dettagli: string[] }).dettagli).toEqual(['OrdiniPage.clickAnnullaOrdine']);
    }
    expect(leggi('pages/shop/ordini.page.ts')).toBe(aMano);
  });

  it('una frase gia\' definita in un altro scenario salvato ferma tutto, prima di scrivere', () => {
    const r = albero({
      ...BASE,
      'steps/shop/login/entra.steps.ts': 'Given("il cliente accede", async function () {});\n',
    });
    try {
      pianificaGlue(r, 'steps/generated/rec-1.steps.ts', 'shop', 'orders', 'x');
      expect.unreachable();
    } catch (e) {
      expect((e as { codice: string }).codice).toBe('passo-duplicato');
      expect((e as { dettagli: string[] }).dettagli).toEqual(['il cliente accede']);
    }
    expect(esiste('steps/generated/rec-1.steps.ts')).toBe(true);
    expect(esiste('pages/shop/ordini.page.ts')).toBe(false);
  });

  it('risalvare lo stesso scenario sovrascrive i suoi step, che non contano come duplicati', () => {
    const giaSalvati = STEPS.replace('steps/generated/rec-1', 'steps/shop/orders/x');
    const r = albero({ ...BASE, 'steps/shop/orders/x.steps.ts': giaSalvati });
    const piano = pianificaGlue(r, 'steps/generated/rec-1.steps.ts', 'shop', 'orders', 'x');
    expect(piano.steps).toBe('steps/shop/orders/x.steps.ts');
  });

  it('gli step di un altro scenario ancora da salvare non contano come duplicati', () => {
    const r = albero({ ...BASE, 'steps/generated/rec-2.steps.ts': STEPS.replace('rec-1', 'rec-2') });
    expect(() => pianificaGlue(r, 'steps/generated/rec-1.steps.ts', 'shop', 'orders', 'x')).not.toThrow();
  });

  it('accetta solo step usciti da una registrazione', () => {
    const r = albero({ ...BASE, 'steps/common/common.steps.ts': 'Given("x", async () => {});' });
    expect(() => pianificaGlue(r, 'steps/common/common.steps.ts', 'shop', 'orders', 'x')).toThrow(/registrat/);
    expect(() => pianificaGlue(r, 'steps/generated/../common/common.steps.ts', 'shop', 'orders', 'x')).toThrow(/registrat/);
  });

  describe('le Page Object generate vivono sotto una sottocartella per host', () => {
    // Una pagina generata sotto un host sta un livello piu' in fondo di una
    // piatta: la sua import di BasePage lo riflette. E' cosi' che la genera
    // davvero `generate-emit.ts`, non un dettaglio del test.
    const ACCESSO_HOST = ACCESSO.replace('from "../../support/base.page"', 'from "../../../support/base.page"');
    const ORDINI_HOST = ORDINI.replace('from "../../support/base.page"', 'from "../../../support/base.page"');
    const STEPS_HOST = STEPS
      .replace('../../pages/generated/accesso.page', '../../pages/generated/esempio.invalid/accesso.page')
      .replace('../../pages/generated/ordini.page', '../../pages/generated/esempio.invalid/ordini.page');
    const BASE_HOST = {
      'steps/generated/rec-1.steps.ts': STEPS_HOST,
      'pages/generated/esempio.invalid/accesso.page.ts': ACCESSO_HOST,
      'pages/generated/esempio.invalid/ordini.page.ts': ORDINI_HOST,
    };

    it('si trovano, e si salvano piatte sotto l\'applicazione come prima', () => {
      const r = albero(BASE_HOST);
      const piano = pianificaGlue(r, 'steps/generated/rec-1.steps.ts', 'shop', 'orders', 'new-order');
      scriviGlue(piano);
      expect(piano.pagine).toEqual([
        { file: 'pages/shop/accesso.page.ts', come: 'nuova' },
        { file: 'pages/shop/ordini.page.ts', come: 'nuova' },
      ]);
      const steps = leggi('steps/shop/orders/new-order.steps.ts');
      expect(steps).toContain('from "../../../pages/shop/accesso.page"');
      expect(steps).not.toContain('esempio.invalid');
      expect(leggi('pages/shop/ordini.page.ts')).toContain('// src/pages/shop/ordini.page.ts');
      // Tornata piatta, la sua import di BasePage torna a due livelli: a tre
      // punterebbe fuori da src/.
      expect(leggi('pages/shop/ordini.page.ts')).toContain('from "../../support/base.page"');
      expect(leggi('pages/shop/ordini.page.ts')).not.toContain('../../../support/base.page');
      // Copiate: la sorgente sotto generated/, per host, sparisce.
      expect(esiste('pages/generated/esempio.invalid/accesso.page.ts')).toBe(false);
      expect(esiste('pages/generated/esempio.invalid/ordini.page.ts')).toBe(false);
    });

    it('restano in generated/ se un altro scenario non ancora salvato le usa ancora', () => {
      const r = albero({
        ...BASE_HOST,
        'steps/generated/rec-2.steps.ts': STEPS_HOST.replace('rec-1', 'rec-2'),
      });
      const piano = pianificaGlue(r, 'steps/generated/rec-1.steps.ts', 'shop', 'orders', 'x');
      scriviGlue(piano);
      // rec-2 non e' ancora stato salvato e importa le stesse due pagine: non
      // sono orfane, restano al loro posto.
      expect(esiste('pages/generated/esempio.invalid/accesso.page.ts')).toBe(true);
      expect(esiste('pages/generated/esempio.invalid/ordini.page.ts')).toBe(true);
      expect(esiste('steps/generated/rec-2.steps.ts')).toBe(true);
    });
  });
});
