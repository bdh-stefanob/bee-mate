'use client';

import { useLayoutEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { PASSO_FINESTRA } from '@/lib/catalogo-filtri';

/**
 * Una lista a finestra: disegna le prime `quante` voci e, in fondo, "Mostra
 * altri 50". Niente virtualizzazione: la ricerca del browser, il lettore di
 * schermo e il focus funzionano senza trucchi, e 500 righe chiuse costano poco.
 * Dopo il clic il FOCUS passa alla prima riga nuova, cosi' chi usa la tastiera
 * non deve ripercorrere 50 righe all'indietro.
 */
export function ElencoPaginato<T>({
  voci,
  quante,
  onAmplia,
  chiave,
  riga,
  passo = PASSO_FINESTRA,
  etichetta,
}: {
  voci: readonly T[];
  quante: number;
  onAmplia: () => void;
  chiave: (voce: T) => string;
  riga: (voce: T) => React.ReactNode;
  passo?: number;
  etichetta?: string;
}) {
  const t = useTranslations('Catalogo');
  const lista = useRef<HTMLUListElement>(null);
  const daFocalizzare = useRef<number | null>(null);
  const visibili = voci.slice(0, quante);
  const restanti = voci.length - visibili.length;

  useLayoutEffect(() => {
    const indice = daFocalizzare.current;
    if (indice === null) return;
    daFocalizzare.current = null;
    const target = lista.current?.children[indice]?.querySelector<HTMLElement>('button, a, input, summary');
    target?.focus();
  }, [visibili.length]);

  return (
    <div className="flex flex-col gap-3">
      <ul ref={lista} aria-label={etichetta} className="flex flex-col gap-2">
        {visibili.map((v) => (
          <li key={chiave(v)}>{riga(v)}</li>
        ))}
      </ul>
      {restanti > 0 && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            className="min-h-10 h-auto"
            onClick={() => {
              daFocalizzare.current = visibili.length;
              onAmplia();
            }}
          >
            {t('mostraAltri', { n: Math.min(passo, restanti) })}
          </Button>
        </div>
      )}
    </div>
  );
}
