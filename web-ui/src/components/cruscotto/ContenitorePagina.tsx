'use client';

import { usePathname } from 'next/navigation';
import { CLASSE_CONTENITORE, larghezzaPagina } from '@/lib/larghezza-pagina';

/**
 * Il contenitore di ogni pagina del cruscotto: l'unico posto in cui si decide
 * larghezza e allineamento (la regola sta in `lib/larghezza-pagina.ts`).
 * Le pagine non mettono piu' `max-w-*` ne' `mx-auto` sulla propria radice.
 */
export function ContenitorePagina({ children }: Readonly<{ children: React.ReactNode }>) {
  const percorso = usePathname();
  return <div className={CLASSE_CONTENITORE[larghezzaPagina(percorso)]}>{children}</div>;
}
