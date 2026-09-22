'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ClipboardCheck, CircleDot, PlayCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Voce {
  href: string;
  label: string;
  Icona: typeof ClipboardCheck;
}

const VOCI: Voce[] = [
  { href: '/controllo', label: 'Controllo', Icona: ClipboardCheck },
  { href: '/registra', label: 'Registra', Icona: CircleDot },
  { href: '/esecuzione', label: 'Esecuzione', Icona: PlayCircle },
];

/**
 * Barra di navigazione del Cruscotto: laterale da 900px in su, in alto sotto.
 * Lo stato attivo e' reso da icona + testo + colore (mai dal solo colore).
 */
export function BarraLaterale() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Cruscotto"
      className="shrink-0 border-b min-[900px]:border-b-0 min-[900px]:border-r min-[900px]:w-60"
      style={{ borderColor: 'var(--bordo)', background: 'var(--superficie-tenue)' }}
    >
      <ul className="flex flex-row min-[900px]:flex-col p-2 gap-1">
        {VOCI.map(({ href, label, Icona }) => {
          const attivo = pathname === href || pathname?.startsWith(`${href}/`);
          return (
            <li key={href} className="flex-1 min-[900px]:flex-none">
              <Link
                href={href}
                aria-current={attivo ? 'page' : undefined}
                className={cn(
                  'flex items-center justify-center min-[900px]:justify-start gap-2',
                  'min-h-10 px-3 rounded-md text-sm font-medium transition-colors',
                  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
                  attivo
                    ? 'font-semibold'
                    : 'hover:bg-black/5 dark:hover:bg-white/10',
                )}
                style={{
                  color: attivo ? 'var(--blu)' : 'var(--testo-tenue)',
                  outlineColor: 'var(--blu)',
                }}
              >
                <Icona size={20} aria-hidden="true" />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
