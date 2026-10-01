'use client';

import { useCallback, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

/**
 * I filtri di una scheda, letti dall'indirizzo e riscritti nell'indirizzo.
 * Cambiare un filtro SOSTITUISCE la voce di cronologia (`replace`): Indietro
 * non deve ripercorrere ogni lettera digitata. `scheda` si conserva.
 *
 * `parse`/`serializza` sono funzioni pure (`lib/catalogo-url.ts`) e vanno
 * passate come costanti di modulo, non scritte dentro il componente.
 */
export function useVistaUrl<V extends object>(
  parse: (parametri: URLSearchParams) => V,
  serializza: (vista: V) => string
): [V, (parziale: Partial<V>) => void, string] {
  const router = useRouter();
  const percorso = usePathname();
  const parametri = useSearchParams();
  const testo = parametri.toString();

  const vista = useMemo(() => parse(new URLSearchParams(testo)), [parse, testo]);
  // Cambia solo quando cambiano i filtri: serve a ripartire dalla prima finestra.
  const chiave = useMemo(() => serializza(vista), [serializza, vista]);

  const imposta = useCallback(
    (parziale: Partial<V>) => {
      const corrente = parse(new URLSearchParams(testo));
      const prossima = new URLSearchParams(serializza({ ...corrente, ...parziale }));
      const scheda = new URLSearchParams(testo).get('scheda');
      const url = new URLSearchParams();
      if (scheda) url.set('scheda', scheda);
      for (const [k, v] of prossima) url.set(k, v);
      router.replace(`${percorso}?${url.toString()}`, { scroll: false });
    },
    [parse, serializza, testo, percorso, router]
  );

  return [vista, imposta, chiave];
}
