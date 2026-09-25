import type { CatalogStep } from '@/lib/types';

/**
 * _fabbrica.ts
 * ------------
 * Non e' una situazione: e' il riempitivo dei campi obbligatori che ogni
 * `CatalogStep` deve avere comunque, cosi' ogni file di questa cartella
 * dichiara solo cio' che la SUA situazione aggiunge (espressione, componenti,
 * status) e non i campi di contorno.
 *
 * Dominio finto e neutro (e-commerce generico), stessa scelta gia' fatta in
 * `scripts/lib/normalize.check.ts`: nessun nome reale, nessun flusso aziendale.
 *
 * Non esportata da `index.ts`: e' un dettaglio interno di questa cartella, non
 * fa parte delle situazioni che i test consumano.
 */
export function stepDiProva(riga: number, expression: string, overrides: Partial<CatalogStep> = {}): CatalogStep {
  return {
    expression,
    parameters: [],
    app: 'shop',
    area: 'checkout',
    domain: 'shop/checkout',
    status: 'wanted',
    sourceRef: `fixtures/catalogo.ts:${riga}`,
    documented: true,
    ...overrides,
  };
}
