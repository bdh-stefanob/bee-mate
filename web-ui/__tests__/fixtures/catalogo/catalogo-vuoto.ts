import type { CatalogStep } from '@/lib/types';

/**
 * Situazione 1 — il catalogo appena inizializzato: nessuno step ancora
 * registrato. E' il caso limite che ogni funzione che legge un catalogo deve
 * saper attraversare senza eccezioni ne' `undefined`.
 */
export const catalogoVuoto: CatalogStep[] = [];
