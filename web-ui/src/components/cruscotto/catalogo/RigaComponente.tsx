'use client';

import { memo, useId } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react';
import { scenariDelComponente } from '@/lib/catalogo-numeri';
import { urlCatalogo } from '@/lib/catalogo-url';
import { percorsoScenario } from '@/lib/percorso-scenario';
import { EtichettaApplicazione } from './EtichettaApplicazione';
import { useNomeRuolo } from './EtichettaComponente';
import type { ComponenteConStep, StepCatalogo } from './tipi';

/**
 * Una riga della scheda Componenti: non piu' una cella di tabella (sul
 * telefono scorreva di lato) ma un elenco di righe come negli Step.
 * "N step · M scenari": gli scenari sono la risposta vera a "cosa si rompe".
 */
export const RigaComponente = memo(function RigaComponente({
  componente,
  impatto,
  step,
  aperto,
  onCommuta,
}: {
  componente: ComponenteConStep;
  /** Gli scenari DISTINTI che ne dipendono (`impattoComponente`). */
  impatto: number;
  /** Tutti gli step (stabili nello store): servono solo al dettaglio aperto. */
  step: readonly StepCatalogo[];
  aperto: boolean;
  onCommuta: (chiave: string) => void;
}) {
  const t = useTranslations('Catalogo');
  const ruolo = useNomeRuolo();
  const idDettaglio = useId();
  const chiave = chiaveComponente(componente);
  const Chevron = aperto ? ChevronDown : ChevronRight;

  return (
    <div className="rounded-lg border" style={{ borderColor: 'var(--bordo)', background: 'var(--superficie)' }}>
      <button
        type="button"
        onClick={() => onCommuta(chiave)}
        aria-expanded={aperto}
        aria-controls={idDettaglio}
        className="flex w-full min-h-10 items-start gap-2 px-3 py-2 text-left focus-visible:outline-2 focus-visible:-outline-offset-2"
        style={{ outlineColor: 'var(--blu)' }}
      >
        <Chevron size={16} aria-hidden="true" className="mt-0.5 shrink-0" style={{ color: 'var(--testo-tenue)' }} />
        <span className="grid min-w-0 flex-1 gap-1 md:grid-cols-[minmax(0,2fr)_minmax(0,2fr)_auto_auto] md:items-center md:gap-3">
          <span className="break-words text-sm font-medium" style={{ color: 'var(--testo)' }}>
            {ruolo(componente.role)} &laquo;{componente.name}&raquo;
          </span>
          {componente.pagineAmbigue ? (
            <span className="flex items-start gap-1 text-sm" style={{ color: 'var(--testo)' }}>
              <AlertTriangle size={14} aria-hidden="true" className="mt-0.5 shrink-0" style={{ color: 'var(--ambra)' }} />
              {t('paginaAmbigua', { pagine: componente.pagineAmbigue.join(', ') })}
            </span>
          ) : (
            <span className="text-sm" style={{ color: 'var(--testo-tenue)' }}>
              {componente.page ?? '—'}
            </span>
          )}
          <span className="flex flex-wrap gap-1">
            {componente.apps.map((app) => (
              <EtichettaApplicazione key={app} app={app} />
            ))}
          </span>
          <span className="text-sm" style={{ color: 'var(--testo-tenue)' }}>
            {t('nStep', { n: componente.step.length })} · {t('nScenari', { n: impatto })}
          </span>
        </span>
      </button>

      {aperto && (
        <div id={idDettaglio} className="flex flex-col gap-3 px-3 pb-3 pl-9 text-sm">
          <div>
            <p className="mb-1 font-medium" style={{ color: 'var(--testo)' }}>
              {t('fraseCheLoToccano')}
            </p>
            <ul className="flex flex-col gap-1">
              {componente.step.map((espressione) => (
                <li key={espressione}>
                  <Link
                    href={urlCatalogo({ scheda: 'step', q: espressione })}
                    className="inline-flex min-h-10 items-center break-words font-mono text-xs underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2"
                    style={{ color: 'var(--blu)', outlineColor: 'var(--blu)' }}
                    aria-label={t('vediLaFrase', { frase: espressione })}
                  >
                    {espressione}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <DettaglioScenari componente={componente} step={step} />
        </div>
      )}
    </div>
  );
});

function DettaglioScenari({ componente, step }: { componente: ComponenteConStep; step: readonly StepCatalogo[] }) {
  const t = useTranslations('Catalogo');
  const scenari = scenariDelComponente(componente, step);
  return (
    <div>
      <p className="mb-1 font-medium" style={{ color: 'var(--testo)' }}>
        {t('scenariCheNeDipendono')}
      </p>
      {scenari.length === 0 ? (
        <p style={{ color: 'var(--testo-tenue)' }}>{t('nessunoScenarioDipende')}</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {scenari.map((s) => {
            const { app, flusso } = percorsoScenario(s.file);
            return (
              <li key={`${s.file}\u0000${s.scenario}`} style={{ color: 'var(--testo-tenue)' }}>
                {t('scenarioInFlusso', { scenario: s.scenario, app, flusso })}
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-1" style={{ color: 'var(--testo-tenue)' }}>
        {t('soloScenariDelCatalogo')}
      </p>
    </div>
  );
}

export function chiaveComponente(c: Pick<ComponenteConStep, 'role' | 'name' | 'page'>): string {
  return `${c.role}\u0000${c.name}\u0000${c.page ?? ''}`;
}
