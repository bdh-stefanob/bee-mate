/**
 * Tipi del catalog. Lo schema corrisponde a quello emesso da
 * scripts/extract-steps.ts nel repo padre (step-catalog.json).
 *
 * Se cambia lo schema dello script, aggiornare qui. In futuro questo
 * file puo' diventare un package condiviso pubblicato dal repo padre.
 */

export interface StepDoc {
  intent?: string;
  params: Record<string, string>;
  pre?: string;
  post?: string;
}

export interface CatalogStep {
  /** Cucumber expression con placeholder, es: 'I am logged in as a {string} user' */
  expression: string;
  /** Lista dei placeholder nell'ordine in cui appaiono, es: ['{string}'] */
  parameters: string[];
  /** Dominio dello step, derivato dal path (es. 'auth', 'orders', 'common') */
  domain: string;
  /** Page Object associato allo step (opzionale, emesso da extract-steps.ts) */
  page?: string;
  /** Riferimento al sorgente, es: 'src/steps/auth/auth.steps.ts:15' */
  sourceRef: string;
  doc: StepDoc;
  documented: boolean;
}

export interface Catalog {
  generatedAt: string;
  totalSteps: number;
  documentedSteps: number;
  undocumentedSteps: number;
  steps: CatalogStep[];
}

/**
 * Astrazione per la sorgente del catalog. Oggi solo FsLoader (filesystem).
 * Domani potranno esistere RemoteLoader (HTTP), NpmLoader (npm package privato),
 * FileShareLoader (UNC), ecc., senza toccare il resto dell'extension.
 */
export interface CatalogLoader {
  /** Restituisce il catalog corrente. Implementazione decide se cache, refresh, fetch. */
  load(): Promise<Catalog | null>;
  /** Forza un reload (es. dopo che npm run catalog ha riscritto il file). */
  reload(): Promise<Catalog | null>;
  /** Notifica quando il catalog cambia. */
  onDidChange(listener: (catalog: Catalog | null) => void): { dispose(): void };
}
