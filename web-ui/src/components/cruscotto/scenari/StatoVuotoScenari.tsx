'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { FolderPlus } from 'lucide-react';

/**
 * Nessuno scenario: e' lo stato di un tester appena arrivato, e la prima
 * schermata che vede dopo Controllo. Niente contatori a zero, niente tabelle
 * vuote, niente ricerca: dice cosa fare e porta a farlo.
 */
export function StatoVuotoScenari({ soloDescritti }: { soloDescritti: number }) {
  const t = useTranslations('Scenari');
  return (
    <div
      className="flex flex-col items-center gap-3 rounded-lg border px-6 py-12 text-center"
      style={{ borderColor: 'var(--bordo)', background: 'var(--superficie)' }}
    >
      <FolderPlus size={40} aria-hidden="true" style={{ color: 'var(--blu)' }} />
      <h2 className="text-lg font-semibold" style={{ color: 'var(--testo)' }}>
        {t('vuotoTitolo')}
      </h2>
      <p className="max-w-md text-sm" style={{ color: 'var(--testo-tenue)' }}>
        {t('vuotoTesto')}
      </p>
      <Link
        href="/registra"
        className="inline-flex min-h-10 items-center justify-center rounded-md px-4 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        style={{ background: 'var(--blu-fondo)', color: '#fff', outlineColor: 'var(--blu)' }}
      >
        {t('vuotoAzione')}
      </Link>
      {soloDescritti > 0 && (
        <p className="text-xs" style={{ color: 'var(--testo-tenue)' }}>
          {t('soloDescritti', { n: soloDescritti })}
        </p>
      )}
    </div>
  );
}
