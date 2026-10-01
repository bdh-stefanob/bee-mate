'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

interface ValoreModifiche {
  /** C'e' una bozza con modifiche non salvate: la barra laterale mostra un punto e la parola. */
  nonSalvate: boolean;
  /**
   * Lo dice il pannello di modifica: se ci sono modifiche non salvate e come
   * chiedere al tester cosa farne (apre il suo dialogo). `null` = niente da chiedere.
   */
  imposta: (nonSalvate: boolean, chiedi: ((verso: string) => void) | null) => void;
  /**
   * Chi sta per lasciare la pagina (la barra laterale, l'elenco degli scenari)
   * lo chiede prima: `true` = via libera; `false` = il pannello ha aperto il suo
   * dialogo e navighera' lui, se il tester sceglie di uscire.
   */
  puoiUscire: (verso: string) => boolean;
}

const SENZA_MODIFICHE: ValoreModifiche = { nonSalvate: false, imposta: () => {}, puoiUscire: () => true };

const ModificheContext = createContext<ValoreModifiche>(SENZA_MODIFICHE);

/**
 * "Ci sono modifiche non salvate", in memoria, per tutta la finestra. Non
 * serve a persistere niente: la bozza vive nel pannello; qui c'e' solo quello che
 * la barra laterale deve sapere prima di navigare (spec A5).
 */
export function ProviderModifiche({ children }: { children: React.ReactNode }) {
  const [nonSalvate, setNonSalvate] = useState(false);
  const chiedi = useRef<((verso: string) => void) | null>(null);
  const stato = useRef(false);

  const imposta = useCallback((valore: boolean, f: ((verso: string) => void) | null) => {
    stato.current = valore;
    chiedi.current = f;
    setNonSalvate(valore);
  }, []);

  const puoiUscire = useCallback((verso: string) => {
    if (!stato.current || !chiedi.current) return true;
    chiedi.current(verso);
    return false;
  }, []);

  const valore = useMemo(() => ({ nonSalvate, imposta, puoiUscire }), [nonSalvate, imposta, puoiUscire]);
  return <ModificheContext.Provider value={valore}>{children}</ModificheContext.Provider>;
}

/** Fuori da `ProviderModifiche` non c'e' niente da proteggere: via libera sempre. */
export function useModifiche(): ValoreModifiche {
  return useContext(ModificheContext);
}
