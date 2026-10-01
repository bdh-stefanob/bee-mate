'use client';

import { useSyncExternalStore } from 'react';

/**
 * Vero se la finestra e' abbastanza larga per la media query data. Sul server,
 * e alla prima resa, e' falso: la pagina parte dalla disposizione stretta e si
 * assesta senza lampeggiare perche' `useSyncExternalStore` rilegge subito.
 */
export function useSchermoLargo(media: string): boolean {
  return useSyncExternalStore(
    (avvisa) => {
      const m = window.matchMedia(media);
      m.addEventListener('change', avvisa);
      return () => m.removeEventListener('change', avvisa);
    },
    () => window.matchMedia(media).matches,
    () => false
  );
}
