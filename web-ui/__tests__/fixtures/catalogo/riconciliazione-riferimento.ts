import type { CatalogStep, StepComponentRef } from '@/lib/types';
import type { CoppiaRiconciliazione, StepPerConfronto } from '@/lib/riconciliazione';

/**
 * La versione di `individuaCoppie` com'era PRIMA dell'ottimizzazione F1
 * (doppio ciclo, una distanza di Levenshtein per ogni coppia). Resta qui come
 * riferimento: la versione veloce deve restituire esattamente lo stesso, coppia
 * per coppia e nello stesso ordine. Non va ritoccata per "tenerla al passo":
 * se cambia il comportamento voluto, si cambia il test, non il riferimento.
 */

const SOGLIA = 0.85;

function normalizza(testo: string): string {
  return testo.trim().toLowerCase().replace(/\s+/g, ' ');
}

function distanza(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const riga = new Array(n + 1);
  for (let j = 0; j <= n; j++) riga[j] = j;
  for (let i = 1; i <= m; i++) {
    let diag = riga[0];
    riga[0] = i;
    for (let j = 1; j <= n; j++) {
      const temp = riga[j];
      const costo = a[i - 1] === b[j - 1] ? 0 : 1;
      riga[j] = Math.min(riga[j] + 1, riga[j - 1] + 1, diag + costo);
      diag = temp;
    }
  }
  return riga[n];
}

function somiglianza(a: string, b: string): number {
  const max = Math.max(a.length, b.length);
  if (max === 0) return 1;
  return 1 - distanza(a, b) / max;
}

function stessoAmbito(appA: string, appB: string): boolean {
  if (appA === appB) return true;
  if (appA === 'common' || appB === 'common') return true;
  if (appA === 'generated' || appB === 'generated') return true;
  return false;
}

const chiave = (c: StepComponentRef) => `${c.page ?? ''}\u0000${c.role}\u0000${c.name}`;

function stessiComponenti(a: StepComponentRef[] | undefined, b: StepComponentRef[] | undefined): boolean {
  if (!a || !b || a.length === 0 || b.length === 0) return false;
  if (a.length !== b.length) return false;
  const iA = new Set(a.map(chiave));
  const iB = new Set(b.map(chiave));
  if (iA.size !== iB.size) return false;
  for (const k of iA) if (!iB.has(k)) return false;
  return true;
}

function vista(s: CatalogStep): StepPerConfronto {
  return { espressione: s.expression, componenti: s.components ?? [], documentato: s.documented, app: s.app };
}

export function individuaCoppieRiferimento(steps: readonly CatalogStep[]): CoppiaRiconciliazione[] {
  const coppie: CoppiaRiconciliazione[] = [];
  for (let i = 0; i < steps.length; i++) {
    for (let j = i + 1; j < steps.length; j++) {
      const a = steps[i];
      const b = steps[j];
      if (a.expression === b.expression) continue;
      const normA = normalizza(a.expression);
      const normB = normalizza(b.expression);
      const testoIdentico = normA === normB;
      const testoMoltoSimile = !testoIdentico && somiglianza(normA, normB) >= SOGLIA;

      if (!stessoAmbito(a.app, b.app)) {
        if (testoIdentico || testoMoltoSimile) {
          coppie.push({
            id: `${a.expression}||${b.expression}`,
            motivo: 'applicazioni-diverse',
            spiegazione: `il testo e' molto simile ma gli step appartengono ad applicazioni diverse (${a.app} e ${b.app}): puo' essere una coincidenza di formulazione (nomi comuni come "Sign in"), non un doppione — nessuna fusione ne' rinomina proposta`,
            a: vista(a),
            b: vista(b),
            stessoComponente: false,
          });
        }
        continue;
      }

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
