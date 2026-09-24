'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';

interface ValoreAmbiente {
  /** L'ambiente scelto per l'intera finestra. Stringa vuota: nessuno ancora scelto. */
  ambiente: string;
  /**
   * Cambia l'ambiente per l'intera finestra: aggiorna subito ogni schermata
   * che lo legge (Registra, Esecuzione, ...) e persiste la scelta in un
   * cookie, cosi' resta anche alla prossima apertura — best-effort: se la
   * scrittura del cookie fallisce, la scelta vale comunque per questa sessione.
   */
  impostaAmbiente: (nuovo: string) => void;
}

const AmbienteContext = createContext<ValoreAmbiente | null>(null);

/**
 * Fornisce l'ambiente corrente a tutto il cruscotto, con lo stesso schema
 * della lingua: il layout server legge il cookie e passa il valore iniziale
 * qui dentro, cosi' la prima resa e' gia' quella giusta.
 */
export function ProviderAmbiente({
  ambienteIniziale,
  children,
}: {
  ambienteIniziale: string;
  children: React.ReactNode;
}) {
  const [ambiente, setAmbiente] = useState(ambienteIniziale);

  const impostaAmbiente = useCallback((nuovo: string) => {
    setAmbiente(nuovo);
    fetch('/api/ambiente', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ambiente: nuovo }),
    }).catch(() => {
      // Il cookie non si e' scritto: la scelta resta comunque valida per
      // questa apertura della finestra, in memoria.
    });
  }, []);

  const valore = useMemo(() => ({ ambiente, impostaAmbiente }), [ambiente, impostaAmbiente]);

  return <AmbienteContext.Provider value={valore}>{children}</AmbienteContext.Provider>;
}

/** Legge (e cambia) l'ambiente corrente. Va usato dentro `ProviderAmbiente`. */
export function useAmbiente(): ValoreAmbiente {
  const contesto = useContext(AmbienteContext);
  if (!contesto) {
    throw new Error('useAmbiente va usato dentro <ProviderAmbiente>');
  }
  return contesto;
}
