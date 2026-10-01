'use client';

import { useEffect, useRef } from 'react';
import { useRisorsa } from '@/hooks/useRisorsa';
import { dopoAggiornamento, type EsitoAggiornamento } from '@/lib/catalogo-numeri';
import { ricaricaCatalogoECoppie, statoAggiornamento } from '@/lib/risorse-catalogo';

const INTERVALLO_MS = 2000;

/**
 * Tiene d'occhio l'aggiornamento automatico del catalogo: rilegge lo stato
 * ogni 2 secondi SOLO mentre e' in corso ("in corso" dura decine di secondi, gli
 * altri esiti cambiano solo quando parte un nuovo salvataggio), e quando passa
 * da "in corso" a "ok" fa rileggere catalogo e coppie (`dopoAggiornamento`):
 * prima la tabella restava col numero vecchio e il banner diceva solo
 * "aggiornato". Va usato UNA volta, dalla pagina.
 */
export function useAggiornamentoCatalogo(): void {
  const esito: EsitoAggiornamento | null = useRisorsa(statoAggiornamento, selEsito);
  const prima = useRef<EsitoAggiornamento | null>(null);

  useEffect(() => {
    if (dopoAggiornamento(prima.current, esito)) void ricaricaCatalogoECoppie();
    prima.current = esito;
  }, [esito]);

  useEffect(() => {
    if (esito !== 'in-corso') return;
    const timer = setInterval(() => void statoAggiornamento.carica(), INTERVALLO_MS);
    return () => clearInterval(timer);
  }, [esito]);
}

function selEsito(i: { dati: { stato: EsitoAggiornamento } | null }): EsitoAggiornamento | null {
  return i.dati?.stato ?? null;
}
