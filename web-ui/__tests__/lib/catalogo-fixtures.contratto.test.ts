import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as situazioni from '../fixtures/catalogo';

/**
 * catalogo-fixtures.contratto.test.ts
 * ------------------------------------
 * Le situazioni finte in `__tests__/fixtures/catalogo/` valgono solo se hanno
 * davvero la forma di `CatalogStep` (il tipo in `web-ui/src/lib/types.ts`,
 * gemello di `StepComponent`/`CatalogStep` in
 * `scripts/lib/generation-contract.ts`) — la stessa forma che produce
 * `step-catalog.json` vero. E' gia' successo, su questo progetto, che una
 * fixture inventata a memoria nascondesse un difetto: questo test e' la
 * guardia contro la stessa ricaduta.
 *
 * Il controllo non e' un doppione di `tsc`: un array dichiarato `CatalogStep[]`
 * passa la compilazione anche se in futuro qualcuno costruisce le voci con
 * `as any`, con uno spread da una sorgente non tipizzata, o con un campo extra
 * che TypeScript non segnala perche' l'oggetto e' strutturalmente compatibile.
 * Qui si controlla la forma A RUNTIME, e soprattutto la si confronta con le
 * chiavi che il PRODUTTORE VERO scrive davvero in `step-catalog.json` — non
 * solo con l'elenco dei campi noti del tipo.
 *
 * Perche' un test vitest e non uno script sotto `scripts/lib/*.check.ts`:
 * le fixture vivono nel progetto `web-ui` (il suo `tsconfig.json`, il suo
 * alias `@/*`, la sua versione di TypeScript). Gli script in `scripts/lib`
 * girano con `ts-node` dalla radice del repo, senza quell'alias e senza fare
 * parte del progetto `web-ui`: importarli da li' vorrebbe dire duplicare la
 * configurazione di modulo solo per questo controllo. `npx vitest run` gira
 * gia' ad ogni verifica (e' uno dei comandi richiesti prima di ogni risposta),
 * quindi ospitarlo qui da' la stessa garanzia — un fallimento ferma la
 * verifica — senza inventare un secondo esecutore.
 */

const RADICE_REPO = path.resolve(__dirname, '..', '..', '..');
const PERCORSO_CATALOGO_VERO = path.join(RADICE_REPO, 'step-catalog.json');

/** Campi noti di `CatalogStep` (web-ui/src/lib/types.ts). Tenerlo allineato a mano
 * a quel file e' il prezzo per avere un controllo runtime indipendente da tsc. */
const CAMPI_NOTI_STEP = new Set([
  'expression',
  'parameters',
  'app',
  'area',
  'domain',
  'status',
  'keyword',
  'page',
  'components',
  'requester',
  'sourceRef',
  'documented',
  'proposedAt',
  'paramEnums',
  'requires',
  'doc',
]);

const CAMPI_OBBLIGATORI_STEP = [
  'expression',
  'parameters',
  'app',
  'area',
  'domain',
  'status',
  'sourceRef',
  'documented',
] as const;

const STATUS_NOTI = new Set(['implemented', 'wanted', 'deprecated', 'proposed']);

const CAMPI_NOTI_COMPONENTE = new Set(['role', 'name', 'page']);
const CAMPI_OBBLIGATORI_COMPONENTE = ['role', 'name'] as const;

interface StepGrezzo {
  [chiave: string]: unknown;
}

function problemiDiForma(step: StepGrezzo, dove: string): string[] {
  const problemi: string[] = [];

  for (const chiave of Object.keys(step)) {
    if (!CAMPI_NOTI_STEP.has(chiave)) {
      problemi.push(`${dove}: campo sconosciuto "${chiave}" (non e' nel contratto CatalogStep)`);
    }
  }
  for (const obbligatorio of CAMPI_OBBLIGATORI_STEP) {
    if (!(obbligatorio in step)) {
      problemi.push(`${dove}: manca il campo obbligatorio "${obbligatorio}"`);
    }
  }
  if (typeof step.expression !== 'string' || step.expression.trim() === '') {
    problemi.push(`${dove}: "expression" deve essere una stringa non vuota`);
  }
  if (!Array.isArray(step.parameters)) {
    problemi.push(`${dove}: "parameters" deve essere un array`);
  }
  if (typeof step.status === 'string' && !STATUS_NOTI.has(step.status)) {
    problemi.push(`${dove}: status "${step.status}" non e' fra quelli noti (${[...STATUS_NOTI].join(', ')})`);
  }
  if (typeof step.documented !== 'boolean') {
    problemi.push(`${dove}: "documented" deve essere un booleano`);
  }
  if (step.components !== undefined) {
    if (!Array.isArray(step.components)) {
      problemi.push(`${dove}: "components", quando presente, deve essere un array`);
    } else {
      step.components.forEach((c: StepGrezzo, i: number) => {
        for (const chiave of Object.keys(c)) {
          if (!CAMPI_NOTI_COMPONENTE.has(chiave)) {
            problemi.push(`${dove}: components[${i}] ha un campo sconosciuto "${chiave}"`);
          }
        }
        for (const obbligatorio of CAMPI_OBBLIGATORI_COMPONENTE) {
          if (typeof c[obbligatorio] !== 'string' || (c[obbligatorio] as string).trim() === '') {
            problemi.push(`${dove}: components[${i}].${obbligatorio} deve essere una stringa non vuota`);
          }
        }
      });
    }
  }

  return problemi;
}

describe('le situazioni finte rispettano la forma di CatalogStep', () => {
  const situazioniEsportate = Object.entries(situazioni) as Array<[string, unknown]>;

  it('ogni file di fixtures esporta almeno una situazione', () => {
    expect(situazioniEsportate.length).toBeGreaterThan(0);
  });

  for (const [nome, valore] of situazioniEsportate) {
    it(`"${nome}" e' un array di CatalogStep validi`, () => {
      expect(Array.isArray(valore)).toBe(true);
      const problemi = (valore as StepGrezzo[]).flatMap((s, i) => problemiDiForma(s, `${nome}[${i}]`));
      expect(problemi).toEqual([]);
    });
  }

  it('nessuna situazione e vuota per errore, tranne "catalogoVuoto"', () => {
    for (const [nome, valore] of situazioniEsportate) {
      if (nome === 'catalogoVuoto') continue;
      expect((valore as unknown[]).length, `${nome} non dovrebbe essere vuota`).toBeGreaterThan(0);
    }
  });
});

describe('il contratto usato dalle fixture combacia con il vero step-catalog.json', () => {
  // Se questo blocco fallisce, il problema non e' nelle fixture: e' nell'elenco
  // CAMPI_NOTI_STEP/CAMPI_NOTI_COMPONENTE qui sopra, rimasto indietro rispetto
  // a `web-ui/src/lib/types.ts` o a cio' che il generatore scrive davvero.
  const esisteCatalogoVero = fs.existsSync(PERCORSO_CATALOGO_VERO);

  it.skipIf(!esisteCatalogoVero)('ogni step del catalogo vero usa solo campi noti del contratto', () => {
    const dati = JSON.parse(fs.readFileSync(PERCORSO_CATALOGO_VERO, 'utf-8')) as { steps: StepGrezzo[] };
    const problemi = dati.steps.flatMap((s, i) => problemiDiForma(s, `step-catalog.json[${i}]`));
    expect(problemi).toEqual([]);
  });

  it('il catalogo vero esiste (altrimenti il controllo sopra e\' silenziosamente saltato)', () => {
    expect(esisteCatalogoVero).toBe(true);
  });
});
