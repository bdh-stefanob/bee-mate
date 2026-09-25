import type { CatalogStep } from '@/lib/types';
import { stepDiProva } from './_fabbrica';

/**
 * Situazione 5 — pagina compatibile: stesso ruolo+nome, un'occorrenza sa su
 * quale pagina vive e l'altra no. Non sono due componenti: sono lo stesso
 * bottone visto da due registrazioni fatte con versioni diverse del
 * registratore (una segnava la pagina, l'altra no). Vanno uniti in una riga
 * sola, con la pagina nota vincente.
 */
export const paginaCompatibile: CatalogStep[] = [
  stepDiProva(1, 'the user signs in', {
    components: [{ role: 'button', name: 'Sign in', page: 'LoginPage' }],
  }),
  stepDiProva(2, 'the user clicks the login button', {
    components: [{ role: 'button', name: 'Sign in' }],
  }),
];
