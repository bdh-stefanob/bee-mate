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
      <nav className="bg-teal-700 dark:bg-slate-900 border-b border-teal-600 dark:border-slate-700">
        <div className="max-w-screen-xl mx-auto px-6 py-3 flex items-center gap-6">
          <span className="font-bold text-sm text-white mr-2">BDD Portal</span>
          <Link href="/portale" className="text-sm text-teal-100 hover:text-white transition-colors">
            Catalog
          </Link>
          <Link href="/editor" className="text-sm text-teal-100 hover:text-white transition-colors">
            Editor
          </Link>
          <Link href="/features" className="text-sm text-teal-100 hover:text-white transition-colors">
            Features
          </Link>
          <Link href="/tags" className="text-sm text-teal-100 hover:text-white transition-colors">
            Tags
          </Link>
          <NavSettingsLink />
          {/* Punto di ritorno verso il cruscotto: chi arriva qui dal cruscotto deve poterci tornare. */}
          <Link href="/controllo" className="text-sm text-teal-100 hover:text-white transition-colors">
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
