'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { FolderPlus } from 'lucide-react';
import { TITOLO_SEZIONE } from '@/lib/scala-tipografica';

import { cn } from '@/lib/utils';
/**
 * Nessuno scenario: e' lo stato di un tester appena arrivato, e la prima
 * schermata che vede dopo Controllo. Niente contatori a zero, niente tabelle
 * vuote, niente ricerca: dice cosa fare e porta a farlo.
 */
export function StatoVuotoScenari({ soloDescritti }: { soloDescritti: number }) {
  const t = useTranslations('Scenari');
  return (
    <div
      className="flex flex-col items-center gap-3 rounded-scheda border px-6 py-12 text-center border-bordo bg-superficie"
    >
      <FolderPlus size={40} aria-hidden="true" className="text-blu" />
      <h2 className={cn(TITOLO_SEZIONE, 'text-testo')}>
        {t('vuotoTitolo')}
      </h2>
      <p className="max-w-md text-sm text-testo-tenue">
        {t('vuotoTesto')}
      </p>
      <Link
        href="/registra"
        className="inline-flex min-h-10 items-center justify-center rounded-controllo px-4 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 bg-blu-fondo text-white outline-blu"
      >
        {t('vuotoAzione')}
      </Link>
      {soloDescritti > 0 && (
        <p className="text-xs text-testo-tenue">
          {t('soloDescritti', { n: soloDescritti })}
        </p>
      )}
    </div>
  );
}
