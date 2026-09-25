import type { CatalogStep } from '@/lib/types';
import { stepDiProva } from './_fabbrica';

/**
 * Situazione 4 — equivoco di denominazione: due frasi QUASI identiche (qui
 * differiscono solo per la maiuscola iniziale, come nel caso reale che ha
 * dato origine alla soglia in `riconciliazione.ts`) che pero' agganciano
 * componenti diversi — stesso nome (`Sign in`), ruolo diverso (`link` contro
 * `button`) e pagina diversa. Non e' un doppione: fondere le due frasi
 * cancellerebbe la distinzione reale fra "apri la pagina di accesso" e
 * "conferma l'accesso".
 */
export const equivocoDiDenominazione: CatalogStep[] = [
  stepDiProva(1, 'the user clicks the sign in link', {
    components: [{ role: 'link', name: 'Sign in', page: 'HomePage' }],
  }),
  stepDiProva(2, 'The user clicks the sign in link', {
    components: [{ role: 'button', name: 'Sign in', page: 'LoginPage' }],
  }),
];
