'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRisorsa } from '@/hooks/useRisorsa';
import { formatoData } from '@/lib/formato-data';
import { rilanciaAggiornamento, statoAggiornamento } from '@/lib/risorse-catalogo';
import type { Istantanea } from '@/lib/risorsa';
import type { StatoAggiornamentoCatalogo } from '@/lib/risorse-catalogo';

const selStato = (i: Istantanea<StatoAggiornamentoCatalogo>) => i.dati;

/**
 * La riga discreta accanto al titolo: "Aggiornato il 1 ott 2026, 10:56", o
 * "Sto aggiornando…" con la rotellina. Mai aggiornato (o stato non leggibile):
 * niente riga. Era una striscia a piena larghezza anche quando andava tutto
 * bene; ora si fa avviso solo se serve (vedi `AvvisoAggiornamento`).
 */
export function RigaAggiornamento() {
  const t = useTranslations('Catalogo');
  const lingua = useLocale();
  const stato = useRisorsa(statoAggiornamento, selStato);

  if (!stato) return null;
  if (stato.stato === 'in-corso') {
    return (
      <p role="status" className="flex items-center gap-2 text-sm" style={{ color: 'var(--testo-tenue)' }}>
        <Loader2 size={14} aria-hidden="true" className="animate-spin motion-reduce:animate-none shrink-0" />
        {t('aggiornamentoInCorsoRiga')}
      </p>
    );
  }
  if (stato.stato === 'ok') {
    return (
      <p className="text-sm" style={{ color: 'var(--testo-tenue)' }}>
        {t('aggiornatoIl', { data: formatoData(stato.concluseIl, lingua) ?? '?' })}
      </p>
    );
  }
  return null;
}

/**
 * Sotto i numeri, solo quando serve: in corso (i numeri potrebbero essere
 * indietro di uno scenario) o fallito (quello che si vede e' l'ultimo
 * catalogo buono). Il fallimento ha il suo pulsante "Riprova ora".
 */
export function AvvisoAggiornamento() {
  const t = useTranslations('Catalogo');
  const stato = useRisorsa(statoAggiornamento, selStato);
  const [inCorso, setInCorso] = useState(false);
  const [rifiutato, setRifiutato] = useState(false);

  if (!stato) return null;

  if (stato.stato === 'in-corso') {
    return (
      <p className="text-sm" style={{ color: 'var(--testo-tenue)' }}>
        {t('aggiornamentoInCorso')}
      </p>
    );
  }

  if (stato.stato !== 'fallita') return null;

  async function riprova() {
    setInCorso(true);
    setRifiutato(false);
    const partito = await rilanciaAggiornamento();
    setRifiutato(!partito);
    setInCorso(false);
  }

  return (
    <div
      className="flex flex-wrap items-start gap-3 rounded-lg border p-3 text-sm"
      style={{ borderColor: 'var(--ambra)', background: 'var(--superficie-tenue)', color: 'var(--testo)' }}
    >
      <AlertTriangle size={16} aria-hidden="true" className="mt-0.5 shrink-0" style={{ color: 'var(--ambra)' }} />
      <div className="flex-1 min-w-48">
        <p>{t('aggiornamentoFallito', { dettaglio: stato.messaggio ?? '?' })}</p>
        {rifiutato && (
          <p role="status" className="mt-1" style={{ color: 'var(--testo-tenue)' }}>
            {t('aggiornamentoOccupato')}
          </p>
        )}
      </div>
      <Button variant="outline" className="min-h-10 h-auto" onClick={riprova} disabled={inCorso}>
        {inCorso && <Loader2 size={16} aria-hidden="true" className="animate-spin motion-reduce:animate-none" />}
        {t('riprovaAggiornamento')}
      </Button>
    </div>
  );
}
