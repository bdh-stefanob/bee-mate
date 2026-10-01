'use client';

import { useId, useMemo, useState, type KeyboardEvent } from 'react';
import { useTranslations } from 'next-intl';
import type { PassoOffribile } from '@/lib/contenuto-scenario';
import { normalizza } from '@/lib/scenari-elenco';
import { Bottone, CLASSE_CAMPO, STILE_CAMPO } from './stile';

/** Piu' di cosi' non si mostrano insieme: si restringe scrivendo. */
const MASSIMO_VISIBILI = 50;

/**
 * "Usa un altro passo": un campo di ricerca e l'elenco dei passi del catalogo che
 * si possono usare (solo `implemented` e senza parametri: un passo `@wanted` ha uno
 * stub che fallisce, e uno con parametri ha bisogno di campi per i valori).
 * Mostra applicazione e flusso per nome e, se c'e', cosa fa il passo: mai un
 * percorso. Esc chiude e non cambia niente.
 */
export function SelettorePasso({
  offribili,
  corrente,
  onScegli,
  onChiudi,
}: {
  offribili: PassoOffribile[];
  /** La frase che si sta per sostituire: non si offre se stessa. */
  corrente: string;
  onScegli: (frase: string) => void;
  onChiudi: () => void;
}) {
  const t = useTranslations('ModificaScenario');
  const id = useId();
  const [testo, setTesto] = useState('');

  const corrispondenti = useMemo(() => {
    const parole = normalizza(testo).split(/\s+/).filter(Boolean);
    return offribili.filter(
      (o) => o.frase !== corrente && parole.every((p) => normalizza(`${o.frase} ${o.app} ${o.area} ${o.intento ?? ''}`).includes(p))
    );
  }, [offribili, corrente, testo]);

  const suTasto = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onChiudi();
    }
  };

  return (
    <div onKeyDown={suTasto} className="flex flex-col gap-2 rounded-md border p-3" style={{ borderColor: 'var(--bordo)', background: 'var(--superficie-tenue)' }}>
      <label htmlFor={`${id}-cerca`} className="text-sm font-medium" style={{ color: 'var(--testo)' }}>
        {t('cercaPasso')}
      </label>
      <input
        id={`${id}-cerca`}
        autoFocus
        value={testo}
        onChange={(e) => setTesto(e.target.value)}
        autoComplete="off"
        className={CLASSE_CAMPO}
        style={STILE_CAMPO}
      />
      <ul className="flex max-h-64 flex-col gap-1 overflow-y-auto" aria-label={t('usaAltro')}>
        {corrispondenti.slice(0, MASSIMO_VISIBILI).map((o) => (
          <li key={o.frase}>
            <button
              type="button"
              aria-label={t('usaAria', { frase: o.frase })}
              onClick={() => onScegli(o.frase)}
              className="flex min-h-10 w-full flex-col items-start gap-0.5 rounded-md border px-3 py-1.5 text-left text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{ borderColor: 'var(--bordo)', background: 'var(--superficie)', color: 'var(--testo)', outlineColor: 'var(--blu)' }}
            >
              <span className="break-words font-medium [overflow-wrap:anywhere]">{o.frase}</span>
              <span className="text-xs" style={{ color: 'var(--testo-tenue)' }}>
                {o.app} / {o.area}
                {o.intento ? ` · ${o.intento}` : ''}
              </span>
            </button>
          </li>
        ))}
      </ul>
      {corrispondenti.length === 0 && (
        <p role="status" className="text-sm" style={{ color: 'var(--testo-tenue)' }}>
          {t('nessunPassoTrovato')}
        </p>
      )}
      <div>
        <Bottone onClick={onChiudi}>{t('chiudiSelettore')}</Bottone>
      </div>
    </div>
  );
}
