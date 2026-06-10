import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import Link from 'next/link';
import { Providers } from '@/providers/Providers';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LanguageToggle } from '@/components/LanguageToggle';
import { NavSettingsLink } from '@/components/NavSettingsLink';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'BDD Automation — Authoring Portal',
  description: 'Gherkin authoring tool for QA automation',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Providers>
          <nav className="bg-teal-700 dark:bg-slate-900 border-b border-teal-600 dark:border-slate-700">
            <div className="max-w-screen-xl mx-auto px-6 py-3 flex items-center gap-6">
              <span className="font-bold text-sm text-white mr-2">BDD Portal</span>
              <Link href="/" className="text-sm text-teal-100 hover:text-white transition-colors">
                Catalog
              </Link>
              <Link href="/editor" className="text-sm text-teal-100 hover:text-white transition-colors">
                Editor
              </Link>
              <Link href="/features" className="text-sm text-teal-100 hover:text-white transition-colors">
                Features
              </Link>
              <NavSettingsLink />
              <div className="ml-auto flex items-center gap-1">
                <LanguageToggle />
                <ThemeToggle />
              </div>
            </div>
          </nav>
          <main className="min-h-screen bg-background">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
