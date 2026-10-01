'use client';

import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import { EtichettaApplicazione } from './EtichettaApplicazione';
import { EtichettaComponente } from './EtichettaComponente';
import type { LatoArricchito } from '@/lib/catalogo-numeri';

/**
 * Un lato di una coppia: applicazione, frase, componenti e usi. Con `scelta`
 * e' una riga con un pulsante radio (area cliccabile intera, >= 40px); senza,
 * e' una riga di sola lettura.
 */
export function CoppiaLato({
  lato,
  scelta,
  piuUsata = false,
  etichettaScelto,
}: {
  lato: LatoArricchito;
  scelta?: { nome: string; selezionata: boolean; onSeleziona: () => void };
  piuUsata?: boolean;
  etichettaScelto?: string;
}) {
  const t = useTranslations('Catalogo');
  const contenuto = (
    <>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="break-words font-mono text-xs" style={{ color: 'var(--testo)' }}>
          {lato.espressione}
        </span>
        <span className="flex flex-wrap items-center gap-1">
          <EtichettaApplicazione app={lato.app} />
          {lato.componenti.map((c, i) => (
            <EtichettaComponente key={i} componente={c} />
          ))}
          <Badge variant="outline" style={{ borderColor: 'var(--bordo)', color: 'var(--testo-tenue)' }}>
            {t('nUsi', { n: lato.usatoIn.length })}
          </Badge>
          {piuUsata && <Badge variant="secondary">{t('piuUsata')}</Badge>}
          {scelta?.selezionata && etichettaScelto && <Badge>{etichettaScelto}</Badge>}
        </span>
      </span>
    </>
  );

  if (!scelta) {
    return (
      <div
        className="flex min-h-10 items-center gap-2 rounded-md border px-3 py-2"
        style={{ borderColor: 'var(--bordo)', background: 'var(--superficie-tenue)' }}
      >
        {contenuto}
      </div>
    );
  }

  return (
    <label
      className="flex min-h-10 cursor-pointer items-center gap-3 rounded-md border px-3 py-2 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2"
      style={{
        borderColor: scelta.selezionata ? 'var(--blu)' : 'var(--bordo)',
        background: 'var(--superficie-tenue)',
        outlineColor: 'var(--blu)',
      }}
    >
      <input
        type="radio"
        name={scelta.nome}
        checked={scelta.selezionata}
        onChange={scelta.onSeleziona}
        className="size-4 shrink-0"
      />
      {contenuto}
    </label>
  );
}
