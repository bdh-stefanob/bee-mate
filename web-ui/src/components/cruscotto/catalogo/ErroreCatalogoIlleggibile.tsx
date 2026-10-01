'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRisorsa } from '@/hooks/useRisorsa';
import { rilanciaAggiornamento, statoAggiornamento } from '@/lib/risorse-catalogo';
import type { StatoAggiornamentoCatalogo } from '@/lib/risorse-catalogo';
import type { Istantanea } from '@/lib/risorsa';

const selStato = (i: Istantanea<StatoAggiornamentoCatalogo>) => i.dati;

/**
 * Il catalogo non si legge (file rovinato, o mai generato): dice in una frase cosa
 * e', e offre il rimedio che gia' esiste, lo stesso di "Riprova ora" sotto il
 * titolo: rigenerarlo. Rileggere e basta non servirebbe, il file e' sempre quello.
 *
 * Finita la rigenerazione, la pagina rilegge catalogo e coppie da sola
 * (`useAggiornamentoCatalogo`) e questo riquadro sparisce.
 */
export function ErroreCatalogoIlleggibile() {
  const t = useTranslations('Catalogo');
  const stato = useRisorsa(statoAggiornamento, selStato);
  const [rifiutato, setRifiutato] = useState(false);
  const inCorso = stato?.stato === 'in-corso';

  async function riprova() {
    setRifiutato(false);
    setRifiutato(!(await rilanciaAggiornamento()));
  }

  return (
    <div
      role="alert"
      className="rounded-lg border p-4 text-sm flex flex-wrap items-center gap-3"
      style={{ borderColor: 'var(--rosso)', background: 'var(--superficie)', color: 'var(--testo)' }}
    >
      <div className="flex-1 min-w-48">
        <p>{inCorso ? t('catalogoRicostruzione') : t('catalogoNonSiLegge')}</p>
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
