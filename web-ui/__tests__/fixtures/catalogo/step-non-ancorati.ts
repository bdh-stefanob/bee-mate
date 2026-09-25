import type { CatalogStep } from '@/lib/types';
import { stepDiProva } from './_fabbrica';

/**
 * Situazione 2 — step senza nessun componente agganciato: il caso di chi
 * scrive lo step a mano (non registrandolo dal cruscotto). `components' e'
 * assente, non un array vuoto: e' uno stato onesto diverso, che le funzioni di
 * conteggio e riconciliazione devono trattare come "non si puo' dire", non
 * come "zero componenti coincidenti".
 */
export const stepSenzaComponenti: CatalogStep[] = [
  stepDiProva(1, 'the user opens the catalogue'),
  stepDiProva(2, 'the user closes the catalogue'),
];
