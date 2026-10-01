'use client';

import { useTranslations } from 'next-intl';
import { CheckCircle2, XCircle, CircleDashed } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Categoria, Riepilogo } from '@/lib/scenari-elenco';

const CONTATORI = [
  { categoria: 'superati', chiave: 'contaPassati', campo: 'superati', Icona: CheckCircle2, colore: 'var(--verde)' },
  { categoria: 'non-superati', chiave: 'contaFalliti', campo: 'nonSuperati', Icona: XCircle, colore: 'var(--rosso)' },
  { categoria: 'da-eseguire', chiave: 'contaDaEseguire', campo: 'daEseguire', Icona: CircleDashed, colore: 'var(--testo-tenue)' },
] as const;

/**
 * Tre contatori in una riga, ognuno un pulsante a due stati (`aria-pressed`):
 * premuto, l'elenco mostra solo quegli scenari; premuto di nuovo, tutti.
 * Icona (forma diversa), numero e parola: mai il solo colore. I numeri sono
 * quelli di TUTTI gli scenari: se cambiassero scrivendo nella ricerca, il
 * tester leggerebbe "2 rossi" mentre ne ha 5.
 */
export function RiepilogoEsiti({
  riepilogo,
  attiva,
  onScegli,
}: {
  riepilogo: Riepilogo;
  attiva: Categoria | null;
  onScegli: (categoria: Categoria | null) => void;
}) {
  const t = useTranslations('Scenari');

  return (
    <div role="group" aria-label={t('riepilogoAria')} className="flex flex-wrap gap-2">
      {CONTATORI.map(({ categoria, chiave, campo, Icona, colore }) => {
        const premuto = attiva === categoria;
        return (
          <button
            key={categoria}
            type="button"
            aria-pressed={premuto}
            onClick={() => onScegli(premuto ? null : categoria)}
            className={cn(
              'inline-flex min-h-10 items-center gap-2 rounded-md border px-3 text-sm font-medium transition-colors',
              'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
              premuto ? 'border-2 font-semibold' : 'hover:bg-black/5 dark:hover:bg-white/10'
            )}
            style={{
              borderColor: premuto ? 'var(--blu)' : 'var(--bordo)',
              background: premuto ? 'var(--superficie-tenue)' : 'var(--superficie)',
              color: 'var(--testo)',
              outlineColor: 'var(--blu)',
            }}
          >
            <Icona size={18} aria-hidden="true" style={{ color: colore }} />
            {t(chiave, { n: riepilogo[campo] })}
          </button>
        );
      })}
    </div>
  );
}
