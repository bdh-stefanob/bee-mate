import type { CatalogStep } from '@/lib/types';
import { stepDiProva } from './_fabbrica';

/**
 * Situazione 8 — sottoinsieme: uno step dichiarativo (`the user signs in`) i
 * cui componenti contengono, tutti insieme, quelli di piu' step fini che
 * descrivono lo stesso percorso passo-passo. E' il caso vero del tester che
 * registra sia l'intento riassuntivo sia i tre gesti separati.
 *
 * QUESTA REGOLA NON ESISTE ANCORA nel codice (nessuna funzione la applica
 * oggi): questi dati servono a chi la scrivera', non a un test gia' presente.
 */
export const stepSottoinsieme: CatalogStep[] = [
  stepDiProva(1, 'the user signs in', {
    components: [
      { role: 'link', name: 'Sign in', page: 'HomePage' },
      { role: 'textbox', name: 'Email', page: 'LoginPage' },
      { role: 'button', name: 'Sign in', page: 'LoginPage' },
    ],
  }),
  stepDiProva(2, 'the user opens the login page', {
    components: [{ role: 'link', name: 'Sign in', page: 'HomePage' }],
  }),
  stepDiProva(3, 'the user enters the email', {
    components: [{ role: 'textbox', name: 'Email', page: 'LoginPage' }],
  }),
  stepDiProva(4, 'the user confirms sign in', {
    components: [{ role: 'button', name: 'Sign in', page: 'LoginPage' }],
  }),
];
