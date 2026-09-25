import type { CatalogStep, StepComponentRef } from './types';

/**
 * riconciliazione.ts
 * ------------------
 * Trova le coppie di step sospette e dice, per ciascuna, di quale dei due casi
 * si tratta — la parte che la demo deve dimostrare:
 *
 *   the user click on the login button   ->  button 'Sign in'
 *   The user click on the login button   ->  link 'Sign in'
 *
 * Due frasi quasi uguali (differiscono solo per una maiuscola) ma agganciate a
 * COMPONENTI DIVERSI. Non e' un doppione da fondere: e' un equivoco di
 * denominazione, e la cura e' l'opposto — distinguere le frasi, non unirle.
 * Fonderle qui sarebbe l'errore esatto che il progetto vuole evitare.
 *
 * `stessoComponente` e' il campo che porta il verdetto: due frasi simili con
 * `stessoComponente: false` sono un equivoco (da rinominare, non da fondere);
 * con `stessoComponente: true` sono un doppione vero (candidate a fusione). La
 * schermata decide il gesto da proporre leggendo questo campo, non il testo.
 *
 * Funzione pura: nessun accesso al disco, cosi' si verifica con dati inventati
 * senza toccare `step-catalog.json`.
 */

export type MotivoRiconciliazione = 'testo-quasi-uguale' | 'stessi-componenti';

export interface StepPerConfronto {
  espressione: string;
  componenti: StepComponentRef[];
  documentato: boolean;
}

export interface CoppiaRiconciliazione {
  /** Stabile finche' le due espressioni non cambiano: le espressioni stesse, in ordine. */
  id: string;
  motivo: MotivoRiconciliazione;
  spiegazione: string;
  a: StepPerConfronto;
  b: StepPerConfronto;
  /** Il verdetto: componenti identici (doppione) o no (equivoco di denominazione, o non ancora ancorati). */
  stessoComponente: boolean;
}

function normalizza(testo: string): string {
  return testo.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Distanza di Levenshtein, programmazione dinamica iterativa: nessuna dipendenza esterna. */
function distanza(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const riga = new Array(n + 1);
  for (let j = 0; j <= n; j++) riga[j] = j;
  for (let i = 1; i <= m; i++) {
    let precedenteDiagonale = riga[0];
    riga[0] = i;
    for (let j = 1; j <= n; j++) {
      const temp = riga[j];
      const costo = a[i - 1] === b[j - 1] ? 0 : 1;
      riga[j] = Math.min(riga[j] + 1, riga[j - 1] + 1, precedenteDiagonale + costo);
      precedenteDiagonale = temp;
    }
  }
  return riga[n];
}

/** 1 = identiche, 0 = nulla in comune. */
function somiglianza(a: string, b: string): number {
  const lunghezzaMax = Math.max(a.length, b.length);
  if (lunghezzaMax === 0) return 1;
  return 1 - distanza(a, b) / lunghezzaMax;
}

/**
 * Soglia scelta sui dati veri del catalogo (2026-09-25, 8 step): la coppia
 * voluta (differenza di sola maiuscola) ha somiglianza 1.00; la coppia piu'
 * vicina per errore-di-battitura reale nel catalogo ("clcik" vs "click", ma
 * frasi comunque diverse: "recharge" vs "login") arriva a 0.73. La soglia sta
 * a meta' strada, con margine da entrambi i lati — non tarata sull'unico caso
 * noto, ma neppure a caso.
 */
const SOGLIA_SOMIGLIANZA = 0.85;

function chiaveComponente(c: StepComponentRef): string {
  return `${c.page ?? ''}\u0000${c.role}\u0000${c.name}`;
}

/**
 * Stesso insieme di componenti? `false` anche quando uno dei due (o entrambi)
 * non ha ancora un componente dichiarato: l'assenza non e' un'uguaglianza, e'
 * uno stato onesto diverso (vedi `component-impact.ts`) che non si deve
 * confondere con "coincidono".
 */
function stessiComponenti(a: StepComponentRef[] | undefined, b: StepComponentRef[] | undefined): boolean {
  if (!a || !b || a.length === 0 || b.length === 0) return false;
  if (a.length !== b.length) return false;
  const insiemeA = new Set(a.map(chiaveComponente));
  const insiemeB = new Set(b.map(chiaveComponente));
  if (insiemeA.size !== insiemeB.size) return false;
  for (const k of insiemeA) {
    if (!insiemeB.has(k)) return false;
  }
  return true;
}

function vista(s: CatalogStep): StepPerConfronto {
  return { espressione: s.expression, componenti: s.components ?? [], documentato: s.documented };
}

/**
 * Le coppie sospette del catalogo, ciascuna gia' giudicata.
 *
 * Non confronta uno step con se stesso e non produce coppie duplicate
 * (a,b)/(b,a): ogni coppia non ordinata compare una sola volta.
 */
export function individuaCoppie(steps: readonly CatalogStep[]): CoppiaRiconciliazione[] {
  const coppie: CoppiaRiconciliazione[] = [];

  for (let i = 0; i < steps.length; i++) {
    for (let j = i + 1; j < steps.length; j++) {
      const a = steps[i];
      const b = steps[j];
      if (a.expression === b.expression) continue;

      const normA = normalizza(a.expression);
      const normB = normalizza(b.expression);
      const testoIdentico = normA === normB;
      const testoMoltoSimile = !testoIdentico && somiglianza(normA, normB) >= SOGLIA_SOMIGLIANZA;
      const uguali = stessiComponenti(a.components, b.components);

      if (!testoIdentico && !testoMoltoSimile && !uguali) continue;

      const entrambiAncorati = Boolean(a.components?.length) && Boolean(b.components?.length);

      if (testoIdentico || testoMoltoSimile) {
        coppie.push({
          id: `${a.expression}||${b.expression}`,
          motivo: 'testo-quasi-uguale',
          spiegazione: uguali
            ? "il testo e' quasi identico e i componenti coincidono: probabile doppione, si puo' fondere"
            : entrambiAncorati
              ? "il testo e' quasi identico ma i componenti sono diversi: e' un equivoco di denominazione, non un doppione — non fondere, distingui le frasi"
              : "il testo e' quasi identico, ma almeno uno dei due step non ha ancora un componente dichiarato: non si puo' concludere se sia un doppione",
          a: vista(a),
          b: vista(b),
          stessoComponente: uguali,
        });
      } else {
        coppie.push({
          id: `${a.expression}||${b.expression}`,
          motivo: 'stessi-componenti',
          spiegazione: "due frasi diverse toccano esattamente lo stesso componente: puo' essere lo stesso gesto scritto due volte",
          a: vista(a),
          b: vista(b),
          stessoComponente: true,
        });
      }
    }
  }

  return coppie;
}
