import type { CatalogStep } from '@/lib/types';
import { stepDiProva } from './_fabbrica';

/**
 * Situazione 8 — applicazioni diverse: due applicazioni REALI e distinte
 * (nessuna delle due `common`/`generated`), stesso testo (a meno di
 * maiuscole) e persino lo stesso componente per coincidenza — ma sono due
 * prodotti diversi. E' il rischio descritto nel task: un `button "Sign in"`
 * e' comunissimo, e due applicazioni diverse possono benissimo avere un
 * bottone di login che si chiama uguale senza essere la stessa cosa.
 *
 * Il verdetto NON e' doppione (non si fonde mai fra applicazioni diverse) ne'
 * equivoco di denominazione (non si propone di rinominarne una: non c'e'
 * nessuna confusione da correggere dentro la stessa applicazione). E'
 * un'informazione a se': "la stessa frase esiste anche altrove".
 */
export const applicazioniDiverseTestoSimile: CatalogStep[] = [
  stepDiProva(1, 'the user clicks the sign in button', {
    app: 'negozio-a',
    domain: 'negozio-a/checkout',
    components: [{ role: 'button', name: 'Sign in', page: 'LoginPage' }],
  }),
  stepDiProva(2, 'The user clicks the sign in button', {
    app: 'negozio-b',
    domain: 'negozio-b/checkout',
    components: [{ role: 'button', name: 'Sign in', page: 'LoginPage' }],
  }),
];
