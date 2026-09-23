'use client';

import { useState, useTransition } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Languages } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Lingua } from '@/i18n/request';

const OPZIONI: { lingua: Lingua; chiaveEtichetta: 'languageEnglish' | 'languageItalian' }[] = [
  { lingua: 'en', chiaveEtichetta: 'languageEnglish' },
  { lingua: 'it', chiaveEtichetta: 'languageItalian' },
];

/**
 * Selettore di lingua nella barra laterale: cambia un cookie, non
 * l'indirizzo. La scelta resta fra un'apertura e l'altra della finestra
 * (il cookie e' quello della sessione Electron, persistente come un browser).
 */
export function SelettoreLingua() {
  const locale = useLocale();
  const t = useTranslations('Cruscotto');
  const router = useRouter();
  const [inCorso, startTransition] = useTransition();
  const [errore, setErrore] = useState(false);

  function cambia(lingua: Lingua) {
    if (lingua === locale) return;
    setErrore(false);
    startTransition(async () => {
      try {
        const risposta = await fetch('/api/lingua', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lingua }),
        });
        if (!risposta.ok) {
          setErrore(true);
          return;
        }
        router.refresh();
      } catch {
        setErrore(true);
      }
    });
  }

  return (
    <div className="flex flex-col gap-1 p-2">
      <span className="sr-only">{t('languageLabel')}</span>
      <div
        role="group"
        aria-label={t('languageLabel')}
        className="flex items-center gap-1 rounded-md border p-1"
        style={{ borderColor: 'var(--bordo)' }}
      >
        <Languages size={16} aria-hidden="true" style={{ color: 'var(--testo-tenue)' }} className="ml-1 shrink-0" />
        {OPZIONI.map(({ lingua, chiaveEtichetta }) => {
          const attiva = lingua === locale;
          return (
            <button
              key={lingua}
              type="button"
              onClick={() => cambia(lingua)}
              disabled={inCorso}
              aria-pressed={attiva}
              className={cn(
                'min-h-10 flex-1 rounded px-2 text-sm font-medium transition-colors',
                'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
                'disabled:opacity-60',
                !attiva && 'hover:bg-black/5 dark:hover:bg-white/10'
              )}
              style={{
                background: attiva ? 'var(--blu-fondo)' : 'transparent',
                color: attiva ? '#fff' : 'var(--testo)',
                outlineColor: 'var(--blu)',
              }}
            >
              {t(chiaveEtichetta)}
            </button>
          );
        })}
      </div>
      {errore && (
        <p role="alert" className="px-1 text-xs" style={{ color: 'var(--rosso)' }}>
          {t('erroreLingua')}
        </p>
      )}
    </div>
  );
}
