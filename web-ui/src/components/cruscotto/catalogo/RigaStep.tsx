'use client';

import { memo, useId } from 'react';
import { useTranslations } from 'next-intl';
import { Ban, CheckCircle2, ChevronDown, ChevronRight, Clock, HelpCircle, type LucideIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { percorsoScenario } from '@/lib/percorso-scenario';
import { EtichettaApplicazione } from './EtichettaApplicazione';
import { EtichettaComponente } from './EtichettaComponente';
import type { StatoStep, StepCatalogo } from './tipi';

const ICONA_STATO: Record<StatoStep, { icona: LucideIcon; chiave: string }> = {
  implemented: { icona: CheckCircle2, chiave: 'statoPronto' },
  wanted: { icona: Clock, chiave: 'statoRichiesto' },
  proposed: { icona: HelpCircle, chiave: 'statoProposto' },
  deprecated: { icona: Ban, chiave: 'statoSuperato' },
};

/**
 * Una riga della scheda Step. `memo`: con 500 voci, aprirne una non deve
 * ridisegnare le altre 499 (le props sono: lo step, che ha la sua identita'
 * nello store, un booleano e una funzione stabile).
 *
 * Al tester niente percorsi di file, numeri di riga ne' codice: gli scenari
 * si dicono "nome · applicazione / flusso", e "come e' fatto" sta in una sola
 * voce chiusa, "Dettagli tecnici".
 */
export const RigaStep = memo(function RigaStep({
  step,
  aperto,
  onCommuta,
}: {
  step: StepCatalogo;
  aperto: boolean;
  onCommuta: (espressione: string) => void;
}) {
  const t = useTranslations('Catalogo');
  const idDettaglio = useId();
  const Chevron = aperto ? ChevronDown : ChevronRight;
  const stato = step.stato ? ICONA_STATO[step.stato] : null;

  return (
    <div className="rounded-lg border" style={{ borderColor: 'var(--bordo)', background: 'var(--superficie)' }}>
      <button
        type="button"
        onClick={() => onCommuta(step.espressione)}
        aria-expanded={aperto}
        aria-controls={idDettaglio}
        className="flex w-full min-h-10 items-start gap-2 px-3 py-2 text-left outline-none focus-visible:outline-2 focus-visible:-outline-offset-2"
        style={{ outlineColor: 'var(--blu)' }}
      >
        <Chevron size={16} aria-hidden="true" className="mt-1 shrink-0" style={{ color: 'var(--testo-tenue)' }} />
        <span className="flex min-w-0 flex-1 flex-col gap-1 md:flex-row md:items-start md:justify-between md:gap-3">
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="break-words font-mono text-xs" style={{ color: 'var(--testo)' }}>
              {step.espressione}
            </span>
            <span className="line-clamp-2 text-sm" style={{ color: 'var(--testo-tenue)' }}>
              {step.intento ?? t('senzaDescrizione')}
            </span>
          </span>
          <span className="flex flex-wrap items-center gap-1 md:justify-end">
            <EtichettaApplicazione app={step.app} />
            {stato && (
              <Badge variant="outline" style={{ borderColor: 'var(--bordo)', color: 'var(--testo)' }}>
                <stato.icona size={12} aria-hidden="true" />
                {t(stato.chiave)}
              </Badge>
            )}
            <Badge variant="outline" style={{ borderColor: 'var(--bordo)', color: 'var(--testo-tenue)' }}>
              {t('nUsi', { n: step.usatoIn.length })}
            </Badge>
            {step.componenti.length === 0 && (
              <Badge variant="outline" style={{ borderColor: 'var(--ambra)', color: 'var(--testo)' }}>
                {t('senzaComponente')}
              </Badge>
            )}
          </span>
        </span>
      </button>

      {aperto && (
        <div id={idDettaglio} className="flex flex-col gap-3 px-3 pb-3 pl-9 text-sm">
          {step.intento && (
            <div>
              <p className="mb-1 font-medium" style={{ color: 'var(--testo)' }}>
                {t('cosaFaTitolo')}
              </p>
              <p style={{ color: 'var(--testo-tenue)' }}>{step.intento}</p>
            </div>
          )}

          <div>
            <p className="mb-1 font-medium" style={{ color: 'var(--testo)' }}>
              {t('componentiToccati')}
            </p>
            {step.componenti.length === 0 ? (
              <p style={{ color: 'var(--testo-tenue)' }}>{t('stepSenzaComponenteTesto')}</p>
            ) : (
              <ul className="flex flex-wrap gap-1">
                {step.componenti.map((c, i) => (
                  <li key={i}>
                    <EtichettaComponente componente={c} conPagina />
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <p className="mb-1 font-medium" style={{ color: 'var(--testo)' }}>
              {t('usatoNegliScenari')}
            </p>
            {step.usatoIn.length === 0 ? (
              <p style={{ color: 'var(--testo-tenue)' }}>{t('nessunoScenarioLoUsa')}</p>
            ) : (
              <ul className="flex flex-col gap-1">
                {step.usatoIn.map((u, i) => {
                  const { app, flusso } = percorsoScenario(u.file);
                  return (
                    <li key={i} style={{ color: 'var(--testo-tenue)' }}>
                      {t('scenarioInFlusso', { scenario: u.scenario, app, flusso })}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {step.comportamento && (
            <details>
              <summary
                className="min-h-10 cursor-pointer py-2 outline-none focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{ color: 'var(--testo-tenue)', outlineColor: 'var(--blu)' }}
              >
                {t('dettagliTecnici')}
              </summary>
              {step.comportamento.chiamate ? (
                <ol className="flex list-inside list-decimal flex-col gap-0.5">
                  {step.comportamento.chiamate.map((c, i) => (
                    <li key={i} className="font-mono text-xs" style={{ color: 'var(--testo-tenue)' }}>
                      {c}
                    </li>
                  ))}
                </ol>
              ) : (
                <pre
                  className="whitespace-pre-wrap rounded-md border p-2 font-mono text-xs"
                  style={{ borderColor: 'var(--bordo)', background: 'var(--superficie-tenue)', color: 'var(--testo)' }}
                >
                  {step.comportamento.corpo}
                </pre>
              )}
            </details>
          )}
        </div>
      )}
    </div>
  );
});
