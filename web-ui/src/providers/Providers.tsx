'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ErrorBoundary, ErrorFallback } from '@/components/ErrorBoundary';

// La lingua non passa di qui: la gestisce `next-intl` (cookie letto da
// `src/i18n/request.ts`, provider in `app/layout.tsx`).
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary fallback={<ErrorFallback />}>
      <NextThemesProvider attribute="class" defaultTheme="system" enableSystem>
        <TooltipProvider delay={400}>{children}</TooltipProvider>
      </NextThemesProvider>
    </ErrorBoundary>
  );
}
