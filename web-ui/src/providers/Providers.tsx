'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { createContext, useContext, useState } from 'react';
import { translations, type Lang, type T } from '@/lib/i18n';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ErrorBoundary, ErrorFallback } from '@/components/ErrorBoundary';
import { Toaster } from 'sonner';

interface LanguageContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: T;
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: 'en',
  setLang: () => {},
  t: translations.en,
});

export function useLanguage() {
  return useContext(LanguageContext);
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>('en');

  return (
    <ErrorBoundary fallback={<ErrorFallback />}>
      <NextThemesProvider attribute="class" defaultTheme="system" enableSystem>
        <LanguageContext.Provider value={{ lang, setLang, t: translations[lang] }}>
          <TooltipProvider delay={400}>
            {children}
            <Toaster richColors closeButton position="bottom-right" />
          </TooltipProvider>
        </LanguageContext.Provider>
      </NextThemesProvider>
    </ErrorBoundary>
  );
}
