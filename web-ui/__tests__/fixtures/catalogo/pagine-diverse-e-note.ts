import type { CatalogStep } from '@/lib/types';
import { stepDiProva } from './_fabbrica';

/**
 * Situazione 6 — pagine diverse e NOTE: stesso ruolo+nome (`button Submit`) ma
 * su due pagine, entrambe dichiarate. Qui la pagina fa parte dell'identita' e
 * i due componenti restano distinti: un `Submit` sulla pagina di accesso non
 * e' quello del pagamento, e unirli gonfierebbe il raggio d'impatto.
 */
export const pagineDiverseNote: CatalogStep[] = [
  stepDiProva(1, 'the user submits the login form', {
    components: [{ role: 'button', name: 'Submit', page: 'LoginPage' }],
  }),
  stepDiProva(2, 'the user submits the payment form', {
    components: [{ role: 'button', name: 'Submit', page: 'CheckoutPage' }],
  }),
];
