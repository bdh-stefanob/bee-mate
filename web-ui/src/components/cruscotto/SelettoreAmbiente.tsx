'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Server } from 'lucide-react';
import { useAmbiente } from '@/context/AmbienteContext';
import { suAmbientiCambiati } from '@/lib/eventi-ambienti';

interface RispostaConfigurazione {
  bersagli?: string[];
}

/**
 * Su quale ambiente si sta lavorando: una sola scelta, valida per tutta la
 * finestra — non piu' una tendina per Registra e una diversa per Esecuzione,
 * che potevano finire su due ambienti diversi senza che nessuna delle due
 * schermate lo dicesse.
 *
 * Vive nella barra laterale, accanto al selettore di lingua: entrambi sono
 * scelte "per tutta la finestra", con lo stesso meccanismo (un cookie).
 */
export function SelettoreAmbiente() {
  const t = useTranslations('Cruscotto');
  const { ambiente, impostaAmbiente } = useAmbiente();
  const [ambienti, setAmbienti] = useState<string[]>([]);

  // F3: prima si leggeva /api/configurazione una volta sola, all'apertura
  // della finestra. Aggiungere o eliminare un ambiente nella schermata
  // Check-up non cambiava questo elenco finche' non si ricaricava — Registra
  // ed Esecuzione, che leggono l'ambiente scelto da qui, restavano indietro
  // con loro. Ora si ricarica anche a ogni notifica di `eventi-ambienti`.
  const carica = useCallback(
    async (attivo: () => boolean) => {
      try {
        const risposta = await fetch('/api/configurazione');
        const d = (await risposta.json()) as RispostaConfigurazione;
        if (!attivo()) return;
        const elenco = d.bersagli ?? [];
        setAmbienti(elenco);
        // Nessun ambiente scelto ancora (prima apertura), o quello scelto non
        // esiste piu' (cancellato dalla sezione Ambienti): si ricade sul
        // primo dell'elenco, mai su un nome che non corrisponde piu' a niente.
        if (elenco.length > 0 && !elenco.includes(ambiente)) {
          impostaAmbiente(elenco[0]);
        }
      } catch {
        if (attivo()) setAmbienti([]);
      }
    },
    [ambiente, impostaAmbiente]
  );

  useEffect(() => {
    let attivo = true;
    void carica(() => attivo);
    const disiscriviti = suAmbientiCambiati(() => {
      void carica(() => attivo);
    });
    return () => {
      attivo = false;
      disiscriviti();
    };
  }, [carica]);

  return (
    <div className="flex flex-col gap-1 p-2">
      <label htmlFor="selettore-ambiente" className="sr-only">
        {t('environmentLabel')}
      </label>
      <div
        className="flex items-center gap-2 rounded-md border px-2"
        style={{ borderColor: 'var(--bordo)' }}
      >
        <Server size={16} aria-hidden="true" style={{ color: 'var(--testo-tenue)' }} className="shrink-0" />
        <select
          id="selettore-ambiente"
          value={ambiente}
          onChange={(e) => impostaAmbiente(e.target.value)}
          disabled={ambienti.length === 0}
          className="min-h-10 w-full min-w-0 bg-transparent text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60"
          style={{ color: 'var(--testo)', outlineColor: 'var(--blu)' }}
        >
          {ambienti.length === 0 && <option value="">{t('environmentNone')}</option>}
          {ambienti.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
