'use client';

import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

/**
 * Lo stile dei controlli del pannello di modifica: gli stessi token del resto del
 * cruscotto (`--blu`, `--bordo`, `--testo-tenue`, ...), chiari e scuri. Aree
 * cliccabili di almeno 40px e contorno di fuoco sempre visibile.
 */

export const CLASSE_BOTTONE =
  'inline-flex min-h-10 items-center justify-center gap-2 rounded-controllo border px-3 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

export const CLASSE_CAMPO =
  'min-h-10 w-full min-w-0 rounded-controllo border px-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2';

export const STILE_CAMPO = {
  borderColor: 'var(--bordo)',
  background: 'var(--superficie)',
  color: 'var(--testo)',
  outlineColor: 'var(--blu)',
} as const;

export function Bottone({
  primario = false,
  className = '',
  ...resto
}: ButtonHTMLAttributes<HTMLButtonElement> & { primario?: boolean }) {
  return (
    <button
      type="button"
      {...resto}
      className={cn(
        CLASSE_BOTTONE,
        primario ? 'border-blu-fondo bg-blu-fondo text-white outline-blu' : 'border-bordo bg-superficie text-blu outline-blu',
        className
      )}
    />
  );
}
