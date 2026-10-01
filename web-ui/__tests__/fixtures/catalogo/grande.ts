import type { StepCatalogo } from '@/components/cruscotto/catalogo/tipi';

/**
 * grande.ts
 * ---------
 * Gli step come li riceve la pagina (`GET /api/catalogo`), non come stanno su
 * disco: servono ai test dei filtri e dei numeri del Catalogo a schede.
 * `catalogoGrande(n)` e' la fabbrica a 500 voci della spec: dominio finto,
 * nessun nome reale.
 */
export function stepUi(espressione: string, overrides: Partial<StepCatalogo> = {}): StepCatalogo {
  return {
    espressione,
    documentato: true,
    app: 'shop',
    stato: 'wanted',
    componenti: [],
    usatoIn: [],
    ...overrides,
  };
}

export function catalogoGrande(n: number): StepCatalogo[] {
  const app = ['shop', 'blog', 'common'];
  return Array.from({ length: n }, (_, i) =>
    stepUi(`the user does thing number ${i}`, {
      app: app[i % app.length]!,
      stato: i % 13 === 0 ? 'implemented' : 'wanted',
      intento: i % 2 === 0 ? `Fa la cosa numero ${i}.` : undefined,
      componenti: i % 3 === 0 ? [{ role: 'button', name: `Bottone ${i}`, page: `Pagina${i % 7}` }] : [],
      usatoIn: i % 5 === 0 ? [{ file: `shop/flusso/f${i}.feature`, scenario: `Scenario ${i}`, riga: 3 }] : [],
    })
  );
}
