import type { CatalogStep } from '@/lib/types';
import { stepDiProva } from './_fabbrica';

/**
 * Situazione 3 — doppione: due frasi DIVERSE che toccano lo stesso identico
 * componente. E' il gesto scritto due volte con parole diverse: candidato
 * vero alla fusione (`the user confirms the order` / `the user submits the
 * checkout`, stesso bottone `Confirm` su `CheckoutPage`).
 */
export const doppione: CatalogStep[] = [
  stepDiProva(1, 'the user confirms the order', {
    components: [{ role: 'button', name: 'Confirm', page: 'CheckoutPage' }],
  }),
  stepDiProva(2, 'the user submits the checkout', {
    components: [{ role: 'button', name: 'Confirm', page: 'CheckoutPage' }],
  }),
];
