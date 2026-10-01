'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';
import { Monitor, Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TEMI, temaAttivo, type Tema } from '@/lib/tema';

const OPZIONI: Record<Tema, { chiave: 'themeLight' | 'themeDark' | 'themeSystem'; Icona: typeof Sun }> = {
  light: { chiave: 'themeLight', Icona: Sun },
  dark: { chiave: 'themeDark', Icona: Moon },
  system: { chiave: 'themeSystem', Icona: Monitor },
};

/**
 * Selettore del tema nella barra laterale: chiaro, scuro, come il sistema.
 * La scelta la tiene `next-themes`. Prima del montaggio il valore scelto non e'
 * noto: nessun bottone risulta premuto, e quello vero si segna dopo.
 */
export function SelettoreTema() {
  const t = useTranslations('Cruscotto');
  const { theme, setTheme } = useTheme();
  const [montato, setMontato] = useState(false);

  useEffect(() => setMontato(true), []);

  return (
    <div className="flex flex-col gap-1 p-2">
      <div
        role="group"
        aria-label={t('themeLabel')}
        className="flex items-center gap-1 rounded-md border p-1"
        style={{ borderColor: 'var(--bordo)' }}
      >
        {TEMI.map((tema) => {
          const { chiave, Icona } = OPZIONI[tema];
          const attivo = temaAttivo(montato, theme, tema);
          return (
            <button
              key={tema}
              type="button"
              onClick={() => setTheme(tema)}
              aria-pressed={attivo}
              className={cn(
                'min-h-10 min-w-0 flex-1 rounded px-1 text-xs font-medium transition-colors',
                'flex flex-col items-center justify-center gap-0.5 min-[900px]:flex-row min-[900px]:gap-1 min-[900px]:text-sm',
                'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
                !attivo && 'hover:bg-black/5 dark:hover:bg-white/10'
              )}
              style={{
                background: attivo ? 'var(--blu-fondo)' : 'transparent',
                color: attivo ? '#fff' : 'var(--testo)',
                outlineColor: 'var(--blu)',
              }}
            >
              <Icona size={16} aria-hidden="true" className="shrink-0" />
              <span className="truncate">{t(chiave)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
