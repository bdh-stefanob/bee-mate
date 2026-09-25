'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronDown, ChevronRight, FileQuestion } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScheletroCatalogo, ErroreCatalogo } from './Scheletro';
import type { RispostaCatalogo, StepCatalogo } from './tipi';

/**
 * Domanda 1: "Cosa sa fare il sistema oggi?"
 *
 * Ogni step del catalogo, con i componenti che tocca e gli scenari che lo
 * usano. E' la vista "in avanti": dallo step si arriva a chi lo consuma.
 */
export function SezioneStep({
  dati,
  caricamento,
  errore,
}: {
  dati: RispostaCatalogo | null;
  caricamento: boolean;
  errore: string | null;
}) {
  const t = useTranslations('Catalogo');
  const [aperti, setAperti] = useState<Set<string>>(new Set());

  function commuta(espressione: string) {
    setAperti((prev) => {
      const next = new Set(prev);
      if (next.has(espressione)) next.delete(espressione);
      else next.add(espressione);
      return next;
    });
  }

  if (caricamento) return <ScheletroCatalogo etichetta={t('caricamento')} />;
  if (errore) return <ErroreCatalogo messaggio={t('erroreCarico', { dettaglio: errore })} />;
  const step = dati?.step ?? [];

  if (step.length === 0) {
    return (
      <p className="text-sm" style={{ color: 'var(--testo-tenue)' }}>
        {t('nessunoStep')}
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {step.map((s) => (
        <RigaStep key={s.espressione} step={s} aperto={aperti.has(s.espressione)} onCommuta={() => commuta(s.espressione)} />
      ))}
    </ul>
  );
}

function RigaStep({ step, aperto, onCommuta }: { step: StepCatalogo; aperto: boolean; onCommuta: () => void }) {
  const t = useTranslations('Catalogo');
  const Icona = aperto ? ChevronDown : ChevronRight;

  return (
    <li className="rounded-lg border" style={{ borderColor: 'var(--bordo)', background: 'var(--superficie)' }}>
      <button
        type="button"
        onClick={onCommuta}
        aria-expanded={aperto}
        className="w-full min-h-10 flex items-center gap-2 px-3 py-2 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        style={{ outlineColor: 'var(--blu)' }}
      >
        <Icona size={16} aria-hidden="true" style={{ color: 'var(--testo-tenue)' }} />
        <span className="font-mono text-xs flex-1" style={{ color: 'var(--testo)' }}>
          {step.espressione}
        </span>
        {!step.documentato && (
          <Badge variant="outline" style={{ borderColor: 'var(--ambra)', color: 'var(--ambra)' }}>
            <FileQuestion size={12} aria-hidden="true" />
            {t('nonDocumentato')}
          </Badge>
        )}
        <Badge variant="outline" style={{ borderColor: 'var(--bordo)', color: 'var(--testo-tenue)' }}>
          {t('nUsi', { n: step.usatoIn.length })}
        </Badge>
      </button>
      {aperto && (
        <div className="px-3 pb-3 flex flex-col gap-3 text-sm">
          <div>
            <p className="font-medium mb-1" style={{ color: 'var(--testo)' }}>
              {t('componentiToccati')}
            </p>
            {step.componenti.length === 0 ? (
              <p style={{ color: 'var(--testo-tenue)' }}>{t('nessunComponenteAncorato')}</p>
            ) : (
              <ul className="flex flex-wrap gap-1">
                {step.componenti.map((c, i) => (
                  <li key={i}>
                    <Badge variant="secondary">
                      {c.role} &ldquo;{c.name}&rdquo;{c.page ? ` · ${c.page}` : ''}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <p className="font-medium mb-1" style={{ color: 'var(--testo)' }}>
              {t('usatoNegliScenari')}
            </p>
            {step.usatoIn.length === 0 ? (
              <p style={{ color: 'var(--testo-tenue)' }}>{t('nessunoScenarioLoUsa')}</p>
            ) : (
              <ul className="flex flex-col gap-1">
                {step.usatoIn.map((u, i) => (
                  <li key={i} className="font-mono text-xs" style={{ color: 'var(--testo-tenue)' }}>
                    {u.scenario} — {u.file}:{u.riga}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </li>
  );
}

/** Carica `GET /api/catalogo`, condiviso dalle sezioni che ne hanno bisogno. */
export function useCatalogo() {
  const [dati, setDati] = useState<RispostaCatalogo | null>(null);
  const [caricamento, setCaricamento] = useState(true);
  const [errore, setErrore] = useState<string | null>(null);

  useEffect(() => {
    let annullato = false;
    fetch('/api/catalogo')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((corpo: RispostaCatalogo) => {
        if (!annullato) {
          setDati(corpo);
          setCaricamento(false);
        }
      })
      .catch((err) => {
        if (!annullato) {
          setErrore(err instanceof Error ? err.message : String(err));
          setCaricamento(false);
        }
      });
    return () => {
      annullato = true;
    };
  }, []);

  return { dati, caricamento, errore };
}
