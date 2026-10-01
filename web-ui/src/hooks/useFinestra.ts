'use client';

import { useCallback, useState } from 'react';
import { PASSO_FINESTRA } from '@/lib/catalogo-filtri';

/**
 * La finestra a 50 di una lista: `quante` righe si disegnano, `amplia` ne
 * aggiunge altre 50. Cambia `chiave` (cioe' cambia un filtro) e si riparte da
 * 50: lo si fa "derivando lo stato dalle proprieta'" invece che in un effetto,
 * cosi' non c'e' un ciclo di resa con la finestra vecchia.
 */
export function useFinestra(chiave: string, passo: number = PASSO_FINESTRA): [number, (totale: number) => void] {
  const [stato, setStato] = useState({ chiave, quante: passo });
  const quante = stato.chiave === chiave ? stato.quante : passo;

  const amplia = useCallback(
    (totale: number) => {
      setStato((s) => {
        const attuale = s.chiave === chiave ? s.quante : passo;
        return { chiave, quante: Math.min(attuale + passo, Math.max(totale, passo)) };
      });
    },
    [chiave, passo]
  );

  return [quante, amplia];
}
