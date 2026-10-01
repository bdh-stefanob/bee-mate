'use client';

import { useCallback, useEffect, useSyncExternalStore } from 'react';
import type { Istantanea, Risorsa } from '@/lib/risorsa';

/**
 * Mostra un pezzo di una risorsa, e la fa leggere se nessuno l'ha ancora fatto.
 *
 * `seleziona` decide QUANDO il componente si ridisegna: solo se il pezzo che
 * restituisce cambia riferimento. Deve quindi restituire qualcosa che sta gia'
 * dentro l'istantanea (o una costante di modulo), mai un oggetto costruito al
 * volo — quello sarebbe nuovo a ogni lettura e il componente girerebbe a vuoto.
 * Per lo stesso motivo va definito fuori dal componente.
 */
export function useRisorsa<T, S>(risorsa: Risorsa<T>, seleziona: (istantanea: Istantanea<T>) => S): S {
  const leggi = useCallback(() => seleziona(risorsa.istantanea()), [risorsa, seleziona]);
  const valore = useSyncExternalStore(risorsa.sottoscrivi, leggi, leggi);

  useEffect(() => {
    // A ogni apertura si rilegge, ma i dati di prima restano a schermo nel
    // frattempo; e se un altro componente ha gia' chiesto, ci si accoda.
    void risorsa.carica();
  }, [risorsa]);

  return valore;
}
