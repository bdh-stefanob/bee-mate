'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ClipboardCheck, CircleDot, PlayCircle, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SelettoreLingua } from '@/components/cruscotto/SelettoreLingua';

interface Voce {
  href: string;
  chiaveEtichetta: 'navCheck' | 'navRecord' | 'navRun' | 'navStepCatalog';
  Icona: typeof ClipboardCheck;
}

const VOCI: Voce[] = [
  { href: '/controllo', chiaveEtichetta: 'navCheck', Icona: ClipboardCheck },
  { href: '/registra', chiaveEtichetta: 'navRecord', Icona: CircleDot },
  { href: '/esecuzione', chiaveEtichetta: 'navRun', Icona: PlayCircle },
];

// Voce separata: porta al vecchio portale (catalogo/editor step), che resta
// raggiungibile ma non fa parte del cruscotto vero e proprio.
const VOCE_PORTALE: Voce = { href: '/portale', chiaveEtichetta: 'navStepCatalog', Icona: BookOpen };

function VoceNav({
  href,
  chiaveEtichetta,
  Icona,
  pathname,
  t,
}: Voce & { pathname: string | null; t: (chiave: string) => string }) {
  const attivo = pathname === href || pathname?.startsWith(`${href}/`);
  return (
    <li className="flex-1 min-[900px]:flex-none">
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
        <span>{t(chiaveEtichetta)}</span>
      </Link>
    </li>
  );
}

/**
 * Barra di navigazione del Cruscotto: laterale da 900px in su, in alto sotto.
 * Lo stato attivo e' reso da icona + testo + colore (mai dal solo colore).
 */
export function BarraLaterale() {
  const pathname = usePathname();
  const t = useTranslations('Cruscotto');

  return (
    <nav
      aria-label={t('navAriaLabel')}
      className="shrink-0 border-b min-[900px]:border-b-0 min-[900px]:border-r min-[900px]:w-60"
      style={{ borderColor: 'var(--bordo)', background: 'var(--superficie-tenue)' }}
    >
      <ul className="flex flex-row min-[900px]:flex-col p-2 gap-1">
        {VOCI.map((voce) => <VoceNav key={voce.href} {...voce} pathname={pathname} t={t} />)}
      </ul>
      {/* Separatore: da qui in giu' si esce dal cruscotto verso il vecchio portale. */}
      <ul
        className="flex flex-row min-[900px]:flex-col p-2 gap-1 border-t min-[900px]:border-t"
        style={{ borderColor: 'var(--bordo)' }}
      >
        <VoceNav {...VOCE_PORTALE} pathname={pathname} t={t} />
      </ul>
      <div className="border-t" style={{ borderColor: 'var(--bordo)' }}>
        <SelettoreLingua />
      </div>
    </nav>
  );
}
