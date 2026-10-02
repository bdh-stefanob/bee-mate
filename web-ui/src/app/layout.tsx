import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale } from 'next-intl/server';
import { Providers } from '@/providers/Providers';
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
  title: 'Cruscotto del tester',
  description: 'Gherkin authoring tool for QA automation',
};

// Layout radice: solo html/body/providers. La navigazione vive nel layout del
// gruppo (cruscotto): la barra laterale sta li', non qui.
export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Il cruscotto legge la lingua da qui: nessun
  // instradamento per lingua, solo il cookie che src/i18n/request.ts legge.
  const locale = await getLocale();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <NextIntlClientProvider>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
