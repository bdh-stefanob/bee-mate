'use client';

import { useTranslations } from 'next-intl';
import { HelpCircle, Info } from 'lucide-react';
import type { CoppiaArricchita } from '@/lib/catalogo-numeri';
import { CoppiaLato } from './CoppiaLato';

/**
 * Due varianti di coppia SENZA gesto, apposta:
 *  - "da verificare" (testo quasi uguale ma almeno uno dei due senza
 *    componente): il motore stesso dice che non si puo' concludere, quindi
 *    nessun invito a fondere ne' a rinominare (decisione Q3: solo informazione);
 *  - "solo da sapere" (applicazioni diverse): la stessa frase in due prodotti
 *    e' legittima.
 */
export function CoppiaDaVerificare({ coppia }: { coppia: CoppiaArricchita }) {
  const t = useTranslations('Catalogo');
  return (
    <Scheda
      colore="var(--bordo)"
      icona={<HelpCircle size={18} aria-hidden="true" style={{ color: 'var(--testo-tenue)' }} className="mt-0.5 shrink-0" />}
      titolo={t('daVerificareTitolo')}
      testo={t('daVerificareTesto')}
      coppia={coppia}
    />
  );
}

export function CoppiaSoloDaSapere({ coppia }: { coppia: CoppiaArricchita }) {
  const t = useTranslations('Catalogo');
  return (
    <Scheda
      colore="var(--blu)"
      icona={<Info size={18} aria-hidden="true" style={{ color: 'var(--blu)' }} className="mt-0.5 shrink-0" />}
      titolo={t('informativaTitolo')}
      testo={t('informativaSpiegazione')}
      coppia={coppia}
    />
  );
}

function Scheda({
  colore,
  icona,
  titolo,
  testo,
  coppia,
}: {
  colore: string;
  icona: React.ReactNode;
  titolo: string;
  testo: string;
  coppia: CoppiaArricchita;
}) {
  return (
    <div className="rounded-lg border p-4" style={{ borderColor: colore, background: 'var(--superficie)' }}>
      <div className="flex items-start gap-2">
        {icona}
        <div className="flex-1">
          <h3 className="font-medium" style={{ color: 'var(--testo)' }}>
            {titolo}
          </h3>
          <p className="text-sm" style={{ color: 'var(--testo-tenue)' }}>
            {testo}
          </p>
        </div>
      </div>
      <div className="mt-3 flex flex-col gap-2">
        <CoppiaLato lato={coppia.a} />
        <CoppiaLato lato={coppia.b} />
      </div>
    </div>
  );
}
