/**
 * Un componente di frontend dichiarato con `@component` sopra uno step.
 * Stessa forma di `StepComponent` in `scripts/lib/generation-contract.ts`.
 */
export interface StepComponentRef {
  role: string;
  name: string;
  /** Pagina su cui vive, solo quando lo step ne tocca piu' di una. */
  page?: string;
}

export interface CatalogStep {
  expression: string;
  parameters: string[];
  app: string;
  area: string;
  domain: string;
  status: 'implemented' | 'wanted' | 'deprecated' | 'proposed';
  keyword?: 'Given' | 'When' | 'Then';
  page?: string;
  /** Componenti toccati. Assente = step non ancora ancorato alla UI. */
  components?: StepComponentRef[];
  requester?: string;
  sourceRef: string;
  documented: boolean;
  proposedAt?: string;   // ISO timestamp for proposed entries (D-13)
  requires?: string[];          // prerequisite step expressions
  doc?: { intent?: string; [key: string]: unknown }; // JSDoc annotations (@intent etc.)
}

export interface Catalog {
  totalSteps: number;
  steps: CatalogStep[];
}
