import type { CatalogStep } from './types';

export interface CatalogFilter {
  query?: string;
  area?: string;
  status?: string;
}

/**
 * Filtra gli step applicando AND su tutti i criteri non-vuoti.
 * - query: match case-insensitive su expression
 * - area: match esatto
 * - status: match esatto
 * Criteri vuoti ('' o undefined) = nessun filtro.
 */
export function filterSteps(steps: CatalogStep[], f: CatalogFilter): CatalogStep[] {
  const q = f.query?.trim().toLowerCase();
  const a = f.area?.trim();
  const s = f.status?.trim();

  return steps.filter(step => {
    if (q) {
      if (!step.expression.toLowerCase().includes(q)) return false;
    }
    if (a) {
      if (step.area !== a) return false;
    }
    if (s) {
      if (step.status !== s) return false;
    }
    return true;
  });
}

/** Ritorna le aree distinte presenti negli step, ordinate alfabeticamente. */
export function uniqueAreas(steps: CatalogStep[]): string[] {
  return [...new Set(steps.map(s => s.area))].sort();
}

/** Ritorna gli status distinti presenti negli step, ordinati alfabeticamente. */
export function uniqueStatuses(steps: CatalogStep[]): string[] {
  return [...new Set(steps.map(s => s.status))].sort();
}
