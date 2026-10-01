'use client';

import { useTranslations } from 'next-intl';
import { CLASSE_DUE_COLONNE, CLASSE_SOLO_DUE_COLONNE } from './layout';

const BLOCCO = 'animate-pulse motion-reduce:animate-none rounded-md';
const FONDO = { background: 'var(--bordo)' } as const;

/**
 * Lo scheletro, con la forma della pagina: tre rettangoli al posto dei
 * contatori, sei righe d'elenco e un riquadro a destra. Si vede solo la prima
 * volta in assoluto (lo store tiene i dati di prima quando si torna sulla
 * pagina). L'animazione si spegne con `prefers-reduced-motion`; il testo e'
 * solo per chi usa uno screen reader.
 */
export function ScheletroScenari() {
  const t = useTranslations('Scenari');
  return (
    <div role="status" className="flex flex-col gap-4">
      <span className="sr-only">{t('caricamento')}</span>
      <div aria-hidden="true" className="flex flex-wrap gap-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className={`${BLOCCO} h-10 w-36`} style={FONDO} />
        ))}
      </div>
      <div aria-hidden="true" className={`flex flex-col gap-6 ${CLASSE_DUE_COLONNE}`}>
        <div className="flex flex-col gap-2">
          <div className={`${BLOCCO} h-10`} style={FONDO} />
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className={`${BLOCCO} h-14`} style={FONDO} />
          ))}
        </div>
        <div className={`${BLOCCO} h-80 ${CLASSE_SOLO_DUE_COLONNE}`} style={FONDO} />
      </div>
    </div>
  );
}
