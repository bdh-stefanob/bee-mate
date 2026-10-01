'use client';

import { useCallback, useId, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Search, X } from 'lucide-react';
import { RigaScenario } from './RigaScenario';
import { prossimoIndice, type GruppoScenari, type Tasto, type VoceScenario } from '@/lib/scenari-elenco';
import { CLASSE_ELENCO_ALTEZZA } from './layout';

const TASTI: Record<string, Tasto> = {
  ArrowDown: 'giu',
  ArrowUp: 'su',
  Home: 'home',
  End: 'fine',
};

const STILE_PULSANTE_TESTO = { color: 'var(--blu)', outlineColor: 'var(--blu)' } as const;

/**
 * La ricerca e l'elenco. L'elenco e' una listbox, perche' le frecce e Invio sono
 * la richiesta e il ruolo che le promette: un solo `Tab` ci entra (sull'opzione
 * attiva) e un altro ne esce; le frecce spostano il FUOCO senza scegliere
 * (scegliere a ogni freccia vorrebbe dire leggere un file a ogni pressione);
 * Invio o Spazio scelgono. Niente giro continuo: ai capi ci si ferma.
 *
 * Riceve gli scenari gia' filtrati e raggruppati: non decide niente.
 */
export function ElencoScenari({
  gruppi,
  quanti,
  ambiente,
  chiaveScelta,
  testoCerca,
  filtroAttivo,
  soloDescritti,
  onTesto,
  onCancellaFiltro,
  onScegli,
}: {
  gruppi: GruppoScenari[];
  /** Quanti scenari ci sono dopo ricerca e filtro. */
  quanti: number;
  ambiente: string | null;
  chiaveScelta: string | null;
  testoCerca: string;
  filtroAttivo: boolean;
  soloDescritti: number;
  onTesto: (testo: string) => void;
  onCancellaFiltro: () => void;
  onScegli: (voce: VoceScenario) => void;
}) {
  const t = useTranslations('Scenari');
  const id = useId();
  const idElenco = `${id}-elenco`;
  const idCerca = `${id}-cerca`;
  const refElenco = useRef<HTMLDivElement>(null);
  const [attivaScelta, setAttivaScelta] = useState<string | null>(null);

  // La sequenza appiattita di intestazioni e opzioni: serve alla tastiera.
  const { righe, indiceDi } = useMemo(() => {
    const r: Array<'gruppo' | 'opzione'> = [];
    const indici = new Map<string, number>();
    for (const g of gruppi) {
      r.push('gruppo');
      for (const v of g.voci) {
        indici.set(v.chiave, r.length);
        r.push('opzione');
      }
    }
    return { righe: r, indiceDi: indici };
  }, [gruppi]);

  // L'unica opzione con tabindex=0: quella su cui si e' stati per ultima, se
  // c'e' ancora; altrimenti la scelta; altrimenti la prima.
  const attiva =
    attivaScelta && indiceDi.has(attivaScelta)
      ? attivaScelta
      : chiaveScelta && indiceDi.has(chiaveScelta)
        ? chiaveScelta
        : (gruppi[0]?.voci[0]?.chiave ?? null);

  const suFuoco = useCallback((chiave: string) => setAttivaScelta(chiave), []);

  function suTasto(e: React.KeyboardEvent<HTMLDivElement>) {
    const opzione = (e.target as HTMLElement).closest<HTMLElement>('[role="option"]');
    if (!opzione) return;
    const corrente = Number(opzione.dataset.riga);

    const tasto = TASTI[e.key];
    if (tasto) {
      e.preventDefault();
      const prossimo = prossimoIndice(righe, corrente, tasto);
      if (prossimo >= 0 && prossimo !== corrente) {
        refElenco.current?.querySelector<HTMLElement>(`[data-riga="${prossimo}"]`)?.focus();
      }
      return;
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const chiave = [...indiceDi.entries()].find(([, i]) => i === corrente)?.[0];
      const voce = gruppi.flatMap((g) => g.voci).find((v) => v.chiave === chiave);
      if (voce) onScegli(voce);
    }
  }

  function etichettaGruppo(g: GruppoScenari): string {
    if (g.tipo === 'non-salvati') return t('gruppoNonSalvati');
    if (g.tipo === 'senza-app') return t('gruppoSenzaApp');
    return g.flusso ? `${g.app} · ${g.flusso}` : g.app;
  }

  let riga = 0;

  return (
    <div className="flex min-h-0 flex-col gap-2">
      <div className="flex flex-col gap-1">
        <label htmlFor={idCerca} className="sr-only">
          {t('cerca')}
        </label>
        <div
          className="flex items-center gap-2 rounded-md border px-2"
          style={{ borderColor: 'var(--bordo)', background: 'var(--superficie)' }}
        >
          <Search size={16} aria-hidden="true" className="shrink-0" style={{ color: 'var(--testo-tenue)' }} />
          <input
            id={idCerca}
            type="search"
            value={testoCerca}
            placeholder={t('cercaSegnaposto')}
            aria-controls={idElenco}
            autoComplete="off"
            onChange={(e) => onTesto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape' && testoCerca) {
                e.preventDefault();
                onTesto('');
              }
            }}
            className="min-h-10 w-full min-w-0 bg-transparent text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 [&::-webkit-search-cancel-button]:hidden"
            style={{ color: 'var(--testo)', outlineColor: 'var(--blu)' }}
          />
          {testoCerca && (
            <button
              type="button"
              aria-label={t('cancellaRicerca')}
              onClick={() => onTesto('')}
              className="inline-flex size-10 shrink-0 items-center justify-center rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              style={STILE_PULSANTE_TESTO}
            >
              <X size={16} aria-hidden="true" />
            </button>
          )}
        </div>
        <p role="status" className="text-xs" style={{ color: 'var(--testo-tenue)' }}>
          {t('risultati', { n: quanti })}
        </p>
      </div>

      {quanti === 0 ? (
        <div
          className="flex flex-col items-start gap-2 rounded-md border p-3 text-sm"
          style={{ borderColor: 'var(--bordo)', color: 'var(--testo)' }}
        >
          <p>{testoCerca.trim() ? t('nessunRisultato', { testo: testoCerca.trim() }) : t('nessunoInQuelloStato')}</p>
          {(testoCerca.trim() || filtroAttivo) && (
            <button
              type="button"
              onClick={() => {
                onTesto('');
                onCancellaFiltro();
              }}
              className="inline-flex min-h-10 items-center rounded-md border px-3 font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{ borderColor: 'var(--bordo)', ...STILE_PULSANTE_TESTO }}
            >
              {testoCerca.trim() ? t('cancellaRicerca') : t('mostraTutti')}
            </button>
          )}
        </div>
      ) : (
        <div
          id={idElenco}
          ref={refElenco}
          role="listbox"
          aria-label={t('elencoAria')}
          onKeyDown={suTasto}
          className={`${CLASSE_ELENCO_ALTEZZA} min-h-0 overflow-y-auto rounded-md border`}
          style={{ borderColor: 'var(--bordo)', background: 'var(--superficie)' }}
        >
          {gruppi.map((g) => {
            riga++; // l'intestazione del gruppo
            const idGruppo = `${id}-g-${g.chiave}`;
            return (
              <div key={g.chiave} role="group" aria-labelledby={idGruppo}>
                <div
                  id={idGruppo}
                  className="sticky top-0 z-10 border-b px-3 py-1.5 text-xs font-semibold uppercase tracking-wide"
                  style={{ borderColor: 'var(--bordo)', background: 'var(--superficie-tenue)', color: 'var(--testo-tenue)' }}
                >
                  {etichettaGruppo(g)}
                </div>
                {g.voci.map((v) => {
                  const numero = riga++;
                  return (
                    <RigaScenario
                      key={v.chiave}
                      voce={v}
                      ambiente={ambiente}
                      scelta={v.chiave === chiaveScelta}
                      attiva={v.chiave === attiva}
                      riga={numero}
                      idOpzione={`${id}-o-${numero}`}
                      onScegli={onScegli}
                      onFuoco={suFuoco}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      {soloDescritti > 0 && (
        <p className="text-xs" style={{ color: 'var(--testo-tenue)' }}>
          {t('soloDescritti', { n: soloDescritti })}
        </p>
      )}
    </div>
  );
}
