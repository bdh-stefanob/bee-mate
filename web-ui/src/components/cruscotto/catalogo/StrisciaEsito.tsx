'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { AlertTriangle, CheckCircle2, Loader2, Undo2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { annullaUltimaFusione } from '@/lib/azioni-catalogo';
import { rilanciaAggiornamento } from '@/lib/risorse-catalogo';
import type { EsitoOperazione } from './tipi';

/**
 * L'esito dell'ultima modifica, che RESTA a schermo finche' non se ne fa
 * un'altra o la si chiude. Prima, dopo una fusione, la lista si smontava e il
 * tester non vedeva mai "Fuso.": la coppia sparisce, quindi il messaggio sta
 * qui, nella scheda, non nella coppia.
 *
 * E' una regione `role="status"`, e il focus passa alla striscia a ogni esito
 * nuovo (la scheda appena usata e' sparita: il focus altrimenti andrebbe perso).
 *
 * "Annulla" solo per la fusione (rotta `fondi/annulla`), e il testo sull'unico
 * livello di annullamento e' detto qui, prima che serva.
 */
export function StrisciaEsito({
  esito,
  onChiudi,
  onAnnullata,
}: {
  esito: EsitoOperazione;
  onChiudi: () => void;
  onAnnullata: () => void;
}) {
  const t = useTranslations('Catalogo');
  const ref = useRef<HTMLDivElement>(null);
  const [inCorso, setInCorso] = useState(false);
  const [problema, setProblema] = useState<string | null>(null);
  const [rilancio, setRilancio] = useState<'fermo' | 'in-corso' | 'rifiutato'>('fermo');

  useEffect(() => {
    ref.current?.focus();
    setProblema(null);
  }, [esito.id]);

  async function annulla() {
    setInCorso(true);
    setProblema(null);
    const r = await annullaUltimaFusione();
    setInCorso(false);
    if (r.ok) onAnnullata();
    else setProblema(t('annullamentoFallito', { dettaglio: r.errore ?? '' }));
  }

  async function riprova() {
    setRilancio('in-corso');
    setRilancio((await rilanciaAggiornamento()) ? 'fermo' : 'rifiutato');
  }

  const testo =
    esito.tipo === 'annullata'
      ? t('annullamentoRiuscito')
      : esito.tipo === 'ripristino'
        ? t('ultimaFusioneDisponibile', { da: esito.da ?? '', a: esito.a ?? '' })
        : t(esito.tipo === 'fusione' ? 'esitoFusione' : 'esitoDistinzione', {
            da: esito.da ?? '',
            a: esito.a ?? '',
            righe: esito.righe ?? 0,
          });

  return (
    <div
      ref={ref}
      role="status"
      tabIndex={-1}
      className="flex flex-col gap-2 rounded-lg border p-3 text-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-2"
      style={{ borderColor: 'var(--verde)', background: 'var(--superficie)', color: 'var(--testo)', outlineColor: 'var(--blu)' }}
    >
      <div className="flex flex-wrap items-start gap-2">
        <CheckCircle2 size={18} aria-hidden="true" className="mt-0.5 shrink-0" style={{ color: 'var(--verde)' }} />
        <p className="min-w-48 flex-1 break-words">{testo}</p>
        {esito.annullabile && (
          <Button variant="outline" className="min-h-10 h-auto" onClick={annulla} disabled={inCorso}>
            {inCorso ? (
              <Loader2 size={16} aria-hidden="true" className="animate-spin motion-reduce:animate-none" />
            ) : (
              <Undo2 size={16} aria-hidden="true" />
            )}
            {t('annullaFusione')}
          </Button>
        )}
        <Button variant="ghost" className="min-h-10 min-w-10 h-auto" onClick={onChiudi} aria-label={t('chiudi')}>
          <X size={16} aria-hidden="true" />
        </Button>
      </div>

      {esito.annullabile && (
        <p style={{ color: 'var(--testo-tenue)' }}>{t('soloUltimaFusione')}</p>
      )}

      {esito.catalogoRigenerato === false && (
        <div className="flex flex-wrap items-center gap-2">
          <AlertTriangle size={16} aria-hidden="true" style={{ color: 'var(--ambra)' }} />
          <p className="flex-1" style={{ color: 'var(--testo)' }}>
            {t('catalogoNonRigenerato')}
          </p>
          <Button variant="outline" className="min-h-10 h-auto" onClick={riprova} disabled={rilancio === 'in-corso'}>
            {t('riprovaAggiornamento')}
          </Button>
          {rilancio === 'rifiutato' && (
            <p className="w-full" style={{ color: 'var(--testo-tenue)' }}>
              {t('aggiornamentoOccupato')}
            </p>
          )}
        </div>
      )}

      {problema && (
        <p role="alert" style={{ color: 'var(--rosso)' }}>
          {problema}
        </p>
      )}
    </div>
  );
}
