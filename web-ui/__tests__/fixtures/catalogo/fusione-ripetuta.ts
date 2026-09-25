import type { CatalogStep } from '@/lib/types';
import { stepDiProva } from './_fabbrica';

/**
 * Situazione 9 — tre step sullo stesso componente: il caso che esercita la
 * fusione RIPETUTA (due fusioni in sequenza per arrivare da tre frasi a una
 * sola), mai provato prima con dati veri ne' sintetici.
 */
export const treStepStessoComponente: CatalogStep[] = [
  stepDiProva(1, 'the user opens the catalogue drawer', {
    components: [{ role: 'button', name: 'Menu', page: 'AppPage' }],
  }),
  stepDiProva(2, 'the user taps the menu button', {
    components: [{ role: 'button', name: 'Menu', page: 'AppPage' }],
  }),
  stepDiProva(3, 'the user opens the navigation menu', {
    components: [{ role: 'button', name: 'Menu', page: 'AppPage' }],
  }),
];
