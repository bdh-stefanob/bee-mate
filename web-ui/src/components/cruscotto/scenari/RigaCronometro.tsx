'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Timer } from 'lucide-react';
import { formattaDurata, formattaDurataLunga, formattaQuando, type Traduttore } from '@/lib/formato-quando';
import type { Cronometro } from '@/lib/cronometro';
import { TITOLO_GRUPPO } from '@/lib/scala-tipografica';
import { cn } from '@/lib/utils';

/**
 * Da registrazione a verde: il tempo dall'inizio della registrazione al primo
 * lancio verde dal cruscotto, correzioni comprese. Solo per gli scenari usciti
 * da una registrazione: uno scritto a mano non ha un inizio da cui contare.
 */
export function RigaCronometro({ cronometro }: { cronometro: Cronometro | null }) {
  const t = useTranslations('Scenari');
  const te = useTranslations('Esecuzione');
  const locale = useLocale();
  if (!cronometro) return null;

  const durata = formattaDurata(cronometro.durataRegistrazioneS * 1000, locale, te as Traduttore);
  const inizio = formattaQuando(cronometro.inizio, locale, t as Traduttore);

  return (
    <section aria-label={t('cronometroTitolo')} className="flex items-start gap-3 rounded-controllo border border-bordo bg-superficie p-3">
      <Timer size={20} aria-hidden="true" className="mt-0.5 shrink-0 text-blu" />
      <div className="flex flex-col gap-1">
        <h3 className={cn(TITOLO_GRUPPO, 'text-testo-tenue')}>
          {t('cronometroTitolo')}
          {cronometro.totaleMs !== null && (
            <span className="ml-2 text-testo">{formattaDurataLunga(cronometro.totaleMs, t as Traduttore)}</span>
          )}
        </h3>
        <p className="text-sm text-testo-tenue">
          {cronometro.primoVerde
            ? t('cronometroDettaglio', {
                durata,
                inizio,
                verde: formattaQuando(cronometro.primoVerde, locale, t as Traduttore),
              })
            : t('cronometroInAttesa', { durata, inizio })}
        </p>
      </div>
    </section>
  );
}
