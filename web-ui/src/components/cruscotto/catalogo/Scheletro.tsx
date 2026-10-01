'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';

/** Righe che pulsano al posto del contenuto, comune a tutte le sezioni del Catalogo. */
export function ScheletroCatalogo({ etichetta }: { etichetta: string }) {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-2">
      <span className="sr-only">{etichetta}</span>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-12 animate-pulse motion-reduce:animate-none rounded-lg border"
          style={{ borderColor: 'var(--bordo)', background: 'var(--superficie-tenue)' }}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

/**
 * Riquadro d'errore uniforme: la rotta manca o non risponde. Con `onRiprova`
 * ha una via d'uscita (il pulsante); senza, e' solo l'avviso.
 */
export function ErroreCatalogo({ messaggio, onRiprova }: { messaggio: string; onRiprova?: () => void }) {
  const t = useTranslations('Catalogo');
  return (
    <div
      role="alert"
      className="rounded-lg border p-4 text-sm flex flex-wrap items-center gap-3"
      style={{ borderColor: 'var(--rosso)', background: 'var(--superficie)', color: 'var(--testo)' }}
    >
      <span className="flex-1">{messaggio}</span>
      {onRiprova && (
        <Button variant="outline" className="min-h-10 h-auto" onClick={onRiprova}>
          {t('riprova')}
        </Button>
      )}
    </div>
  );
}
