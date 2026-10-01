'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  leggiSchedaRicordata,
  ricordaScheda,
  schedaIniziale,
  urlConScheda,
  type ArchivioScheda,
} from '@/lib/schede-url';

/** `window.localStorage` se c'e' e si puo' toccare: in una finestra privata anche solo nominarlo puo' lanciare. */
function archivioFinestra(): ArchivioScheda | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

/**
 * Collega la scheda attiva all'indirizzo (`?scheda=`), e — se `ricorda` — a
 * quella visitata l'ultima volta (decisione Q5 della spec).
 *
 * Precedenza all'apertura: `?scheda=` valido, poi l'ultima visitata, poi la
 * predefinita. L'indirizzo vince sempre: un link porta dove dice.
 *
 * Il server non conosce `localStorage`, quindi senza `?scheda=` la scheda non
 * si puo' sapere alla prima resa: `pronta` e' false finche' non si e' letto
 * l'archivio, e il chiamante non disegna il pannello (cosi' non si vede Step e
 * poi un salto). Quando la fonte e' l'archivio l'indirizzo si riscrive con
 * `replace`, non `push`: Indietro non deve passare per una voce che nessuno ha
 * scelto.
 *
 * Cambiare scheda aggiunge una voce alla cronologia (Indietro torna alla scheda
 * di prima) e toglie i filtri, che appartengono alla scheda che si lascia.
 *
 * Va usato dentro un `<Suspense>`: `useSearchParams` lo richiede nella build.
 */
export function useSchedaUrl<T extends string>(opzioni: {
  valide: readonly T[];
  predefinita: T;
  parametro?: string;
  cronologia?: 'aggiungi' | 'sostituisci';
  ricorda?: boolean;
}): [T, (id: T) => void, boolean] {
  const { valide, predefinita, parametro = 'scheda', cronologia = 'aggiungi', ricorda = false } = opzioni;
  const router = useRouter();
  const percorso = usePathname();
  const parametri = useSearchParams();

  // undefined = non ancora letta (la prima resa, e quella del server).
  const [ricordata, setRicordata] = useState<string | null | undefined>(undefined);
  const adesso = parametri.toString();
  // Si rilegge a ogni cambio di indirizzo: chi torna su `/catalogo` senza
  // parametri (dalla barra laterale) deve trovare l'ultima scheda vista, non
  // quella letta all'apertura.
  useEffect(() => {
    setRicordata(ricorda ? leggiSchedaRicordata(archivioFinestra()) : null);
  }, [ricorda, adesso]);

  const daUrl = parametri.getAll(parametro);
  const urlValido = daUrl.length > 0 && (valide as readonly string[]).includes(daUrl[0]!);
  const pronta = urlValido || ricordata !== undefined;
  const { scheda, fonte } = schedaIniziale<T>({ url: daUrl, ricordata, valide, predefinita });

  // Fonte = archivio: si scrive nell'indirizzo, senza aggiungere una voce.
  useEffect(() => {
    if (pronta && fonte === 'ricordata') {
      router.replace(urlConScheda(percorso, adesso, parametro, scheda), { scroll: false });
    }
  }, [pronta, fonte, scheda, percorso, adesso, parametro, router]);

  // "Ultima visitata" = ultima vista, comunque ci si sia arrivati.
  useEffect(() => {
    if (ricorda && pronta) ricordaScheda(archivioFinestra(), scheda);
  }, [ricorda, pronta, scheda]);

  const imposta = useCallback(
    (id: T) => {
      if (id === scheda) return;
      const url = urlConScheda(percorso, adesso, parametro, id);
      if (cronologia === 'aggiungi') router.push(url, { scroll: false });
      else router.replace(url, { scroll: false });
    },
    [scheda, percorso, adesso, parametro, cronologia, router]
  );

  return [scheda, imposta, pronta];
}
