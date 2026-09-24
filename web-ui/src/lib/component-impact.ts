import type { CatalogStep, StepComponentRef } from './types';

/**
 * component-impact.ts
 * --------------------
 * La mappa al contrario: non "questo step usa quali componenti" (che sta gia'
 * dentro `CatalogStep.components`, scritto da `scripts/lib/generate-emit.ts` e
 * letto da `scripts/extract-steps.ts`), ma "questo componente e' usato da
 * quali step, e quanti sono".
 *
 * E' la domanda a cui la demo deve rispondere a colpo d'occhio: "se cambio
 * questo componente, quanti scenari tocco?". Il catalogo non la sa gia' —
 * bisogna scorrerlo e ribaltare l'indice.
 *
 * COSA NON FA
 * Non inventa un aggancio per gli step che non ne dichiarano uno: uno step
 * senza `components` semplicemente non compare in nessuna voce della mappa.
 * E' lo stato onesto dei 137 step scritti a mano (nessuna registrazione dietro
 * di loro), e va mostrato come assenza — non stimato con la somiglianza delle
 * frasi, che qui sarebbe un numero inventato spacciato per un fatto.
 */

/** Chiave stabile per un componente: role+name+pagina (quando c'e'). */
export function componentImpactKey(c: StepComponentRef): string {
  return `${c.page ?? ''}\u0000${c.role}\u0000${c.name}`;
}

export interface ComponentImpact {
  role: string;
  name: string;
  /** Pagina su cui vive, se lo step che l'ha dichiarato ne toccava piu' di una. */
  page?: string;
  /** Gli step di catalogo che dichiarano questo componente. */
  steps: CatalogStep[];
}

/**
 * Costruisce la mappa componente -> step che lo usano, dagli step del
 * catalogo che dichiarano `components`. L'ordine e' decrescente per numero di
 * step: il componente piu' rischioso da cambiare sta in cima.
 */
export function computeComponentImpact(steps: readonly CatalogStep[]): ComponentImpact[] {
  const byKey = new Map<string, ComponentImpact>();

  for (const step of steps) {
    for (const c of step.components ?? []) {
      const key = componentImpactKey(c);
      const existing = byKey.get(key);
      if (existing) {
        existing.steps.push(step);
      } else {
        byKey.set(key, { role: c.role, name: c.name, page: c.page, steps: [step] });
      }
    }
  }

  return [...byKey.values()].sort((a, b) => b.steps.length - a.steps.length);
}

/** Quanti step del catalogo hanno almeno un componente dichiarato. Vedi diagnosi.ts. */
export function countAnchoredSteps(steps: readonly CatalogStep[]): number {
  return steps.filter((s) => (s.components?.length ?? 0) > 0).length;
}
