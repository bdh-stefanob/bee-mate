'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ClipboardCheck, CircleDot, ListChecks, PlayCircle, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SelettoreLingua } from '@/components/cruscotto/SelettoreLingua';
import { SelettoreTema } from '@/components/cruscotto/SelettoreTema';
import { SelettoreAmbiente } from '@/components/cruscotto/SelettoreAmbiente';
import { useModifiche } from '@/context/ModificheContext';

interface Voce {
  href: string;
  chiaveEtichetta: 'navCheck' | 'navRecord' | 'navScenari' | 'navRun' | 'navCatalog';
  Icona: typeof ClipboardCheck;
}

// Le cinque schermate del cruscotto. Il vecchio portale (catalogo/editor step)
// e' stato tolto: la sua mappa dei componenti e' nel Catalogo, la modifica degli
// scenari e' nella pagina Scenari.
const VOCI: Voce[] = [
  { href: '/controllo', chiaveEtichetta: 'navCheck', Icona: ClipboardCheck },
  { href: '/registra', chiaveEtichetta: 'navRecord', Icona: CircleDot },
  { href: '/scenari', chiaveEtichetta: 'navScenari', Icona: ListChecks },
  { href: '/esecuzione', chiaveEtichetta: 'navRun', Icona: PlayCircle },
  { href: '/catalogo', chiaveEtichetta: 'navCatalog', Icona: BookOpen },
];

function VoceNav({
  href,
  chiaveEtichetta,
  Icona,
  pathname,
  t,
}: Voce & { pathname: string | null; t: (chiave: string) => string }) {
  const attivo = pathname === href || pathname?.startsWith(`${href}/`);
  // Una modifica a uno scenario non salvata: si chiede al tester prima di lasciare la pagina.
  const { nonSalvate, puoiUscire } = useModifiche();
  const tm = useTranslations('ModificaScenario');
  const conPunto = href === '/scenari' && nonSalvate;
  return (
    <li className="flex-1 min-w-0 min-[900px]:flex-none">
      {/*
        * Sotto i 900px la barra e' una riga: con cinque voci l'icona sta sopra
        * la parola e il testo e' piu' piccolo, altrimenti la riga supera i
        * 390px e la pagina scorre in orizzontale.
        */}
      <Link
        href={href}
        aria-current={attivo ? 'page' : undefined}
        onClick={(e) => {
          if (!puoiUscire(href)) e.preventDefault();
        }}
        className={cn(
          'flex flex-col min-[900px]:flex-row items-center justify-center min-[900px]:justify-start gap-0.5 min-[900px]:gap-2',
          'min-h-10 px-0.5 min-[900px]:px-3 py-1 min-[900px]:py-0 rounded-controllo text-xs min-[900px]:text-sm font-medium transition-colors',
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
        {conPunto && (
          <>
            <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-pillola" style={{ background: 'var(--ambra)' }} />
            <span className="sr-only min-[900px]:not-sr-only text-xs font-normal">{tm('voceNonSalvate')}</span>
          </>
        )}
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
      className="flex shrink-0 flex-col border-b min-[900px]:border-b-0 min-[900px]:border-r min-[900px]:w-60 min-[900px]:sticky min-[900px]:top-0 min-[900px]:h-screen min-[900px]:overflow-y-auto"
      style={{ borderColor: 'var(--bordo)', background: 'var(--superficie-tenue)' }}
    >
      <ul className="flex flex-row min-[900px]:flex-col p-2 gap-1">
        {VOCI.map((voce) => <VoceNav key={voce.href} {...voce} pathname={pathname} t={t} />)}
      </ul>
      {/*
        * Le impostazioni (ambiente, lingua, tema) non sono navigazione: un solo
        * gruppo in fondo alla barra, separato dalle cinque voci, con controlli
        * piu' leggeri (niente blu pieno: quello resta all'azione della pagina).
        */}
      <div
        role="group"
        aria-label={t('settingsLabel')}
        className="mt-auto flex flex-col gap-2 border-t p-2"
        style={{ borderColor: 'var(--bordo)' }}
      >
        <span aria-hidden="true" className="px-1 text-xs font-medium" style={{ color: 'var(--testo-tenue)' }}>
          {t('settingsLabel')}
        </span>
        <SelettoreAmbiente />
        <SelettoreLingua />
        <SelettoreTema />
      </div>
    </nav>
  );
}
