import type { CatalogStep } from '@/lib/types';
import { stepDiProva } from './_fabbrica';

/**
 * Situazione 7 — pagina ambigua: le stesse due pagine note della situazione 6
 * (`LoginPage` e `CheckoutPage`, entrambe con `button Submit`), piu' una TERZA
 * occorrenza che non dichiara pagina. Quella terza potrebbe appartenere
 * all'uno o all'altro gruppo: non si indovina, si segnala come ambigua.
 * Prima di questo lavoro questo ramo non aveva NESSUN caso reale.
 */
export const paginaAmbigua: CatalogStep[] = [
  stepDiProva(1, 'the user submits the login form', {
    components: [{ role: 'button', name: 'Submit', page: 'LoginPage' }],
  }),
  stepDiProva(2, 'the user submits the payment form', {
    components: [{ role: 'button', name: 'Submit', page: 'CheckoutPage' }],
  }),
  stepDiProva(3, 'the user clicks submit', {
    components: [{ role: 'button', name: 'Submit' }],
  }),
];
