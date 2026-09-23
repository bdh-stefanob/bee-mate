import Link from 'next/link';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LanguageToggle } from '@/components/LanguageToggle';
import { NavSettingsLink } from '@/components/NavSettingsLink';

// Navigazione del vecchio portale (catalogo/editor step): vive solo qui, non nel
// layout radice, cosi' il gruppo (cruscotto) non la eredita e non si sovrappone
// alla barra laterale italiana.
export default function PortaleLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <nav className="border-b" style={{ borderColor: 'var(--bordo)', background: 'var(--superficie-tenue)' }}>
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 flex flex-wrap items-center gap-x-1 gap-y-1 py-1.5">
          <span
            className="min-h-10 inline-flex items-center px-2 mr-1 text-sm font-semibold"
            style={{ color: 'var(--testo)' }}
          >
            BDD Portal
          </span>
          <Link
            href="/portale"
            className="min-h-10 inline-flex items-center rounded-md px-3 text-sm font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ color: 'var(--testo-tenue)', outlineColor: 'var(--blu)' }}
          >
            Catalog
          </Link>
          <Link
            href="/editor"
            className="min-h-10 inline-flex items-center rounded-md px-3 text-sm font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ color: 'var(--testo-tenue)', outlineColor: 'var(--blu)' }}
          >
            Editor
          </Link>
          <Link
            href="/features"
            className="min-h-10 inline-flex items-center rounded-md px-3 text-sm font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ color: 'var(--testo-tenue)', outlineColor: 'var(--blu)' }}
          >
            Features
          </Link>
          <Link
            href="/tags"
            className="min-h-10 inline-flex items-center rounded-md px-3 text-sm font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ color: 'var(--testo-tenue)', outlineColor: 'var(--blu)' }}
          >
            Tags
          </Link>
          <NavSettingsLink />
          {/* Punto di ritorno verso il cruscotto: chi arriva qui dal cruscotto deve poterci tornare. */}
          <Link
            href="/controllo"
            className="min-h-10 inline-flex items-center rounded-md px-3 text-sm font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ color: 'var(--testo-tenue)', outlineColor: 'var(--blu)' }}
          >
            Cruscotto
          </Link>
          <div className="ml-auto flex items-center gap-1">
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </div>
      </nav>
      <main className="min-h-screen bg-background">{children}</main>
    </>
  );
}
