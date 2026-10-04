'use client';

import { useTranslations } from 'next-intl';
import { HelpCircle, Info } from 'lucide-react';
import type { CoppiaArricchita } from '@/lib/catalogo-numeri';
import { CoppiaLato } from './CoppiaLato';
import { TESTO_LETTURA, TITOLO_GRUPPO } from '@/lib/scala-tipografica';

import { cn } from '@/lib/utils';
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
      classeBordo="border-bordo"
      icona={<HelpCircle size={18} aria-hidden="true" className="mt-0.5 shrink-0 text-testo-tenue" />}
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
      classeBordo="border-blu"
      icona={<Info size={18} aria-hidden="true" className="mt-0.5 shrink-0 text-blu" />}
      titolo={t('informativaTitolo')}
      testo={t('informativaSpiegazione')}
      coppia={coppia}
    />
  );
}

function Scheda({
  classeBordo,
  icona,
  titolo,
  testo,
  coppia,
}: {
  classeBordo: string;
  icona: React.ReactNode;
  titolo: string;
  testo: string;
  coppia: CoppiaArricchita;
}) {
  return (
    <div className={cn('rounded-scheda border bg-superficie p-4', classeBordo)}>
      <div className="flex items-start gap-2">
        {icona}
        <div className="flex-1">
          <h3 className={cn(TITOLO_GRUPPO, 'text-testo')}>
            {titolo}
          </h3>
          <p className={`text-sm ${TESTO_LETTURA} text-testo-tenue`}>
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
