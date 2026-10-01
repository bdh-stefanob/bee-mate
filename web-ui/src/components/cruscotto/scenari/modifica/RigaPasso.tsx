'use client';

import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { Eye } from 'lucide-react';
import type { PassoLetto } from '@/lib/modifica-scenario';
import type { PassoDelPannello } from '@/lib/contenuto-scenario';
import { Bottone } from './stile';

const MOTIVO: Record<NonNullable<PassoDelPannello['motivo']>, string> = {
  parametri: 'motivoParametri',
  comune: 'motivoComune',
  generato: 'motivoGenerato',
  sconosciuto: 'motivoSconosciuto',
  ambiguo: 'motivoAmbiguo',
};

/** La frase con i valori fra virgolette sottolineati: si vedono anche senza colori. */
function Frase({ testo }: { testo: string }) {
  const parti = testo.split(/("[^"]*")/);
  return (
    <>
      {parti.map((p, i) =>
        p.startsWith('"') && p.endsWith('"') && p.length >= 2 ? (
          <span key={i} className="underline decoration-1 underline-offset-2" style={{ color: 'var(--verde)' }}>
            {p}
          </span>
        ) : (
          <span key={i}>{p}</span>
        )
      )}
    </>
  );
}

/**
 * Un passo dello scenario in modifica, con i suoi comandi. Ogni pulsante porta
 * nell'etichetta la frase del passo ("Rinomina il passo «...»"): "Rinomina"
 * ripetuto quattro volte non dice niente a chi ascolta lo schermo.
 */
export function RigaPasso({
  passo,
  indice,
  totale,
  meta,
  occupato,
  puoiTogliere,
  pannello,
  innescoRef,
  onRinomina,
  onUsaAltro,
  onTogli,
}: {
  passo: PassoLetto;
  indice: number;
  totale: number;
  /** Cosa si sa del passo dal server (chi lo condivide, se si rinomina); assente per un passo appena scelto. */
  meta?: PassoDelPannello;
  occupato: boolean;
  puoiTogliere: boolean;
  /** Il campo di rinomina o il selettore, quando e' aperto su questo passo. */
  pannello?: ReactNode;
  innescoRef: (el: HTMLElement | null) => void;
  onRinomina: () => void;
  onUsaAltro: () => void;
  onTogli: () => void;
}) {
  const t = useTranslations('ModificaScenario');
  const altri = meta?.condivisoCon.length ?? 0;

  return (
    <li className="flex flex-col gap-2 rounded-lg border p-3" style={{ borderColor: 'var(--bordo)', background: 'var(--superficie)' }}>
      <div className="flex items-baseline gap-3">
        <span className="shrink-0 text-xs font-semibold tabular-nums" style={{ color: 'var(--testo-tenue)' }} aria-hidden="true">
          {indice}
        </span>
        <p
          ref={innescoRef}
          tabIndex={-1}
          aria-label={`${t('passoDi', { n: indice, totale })}: ${passo.parolaChiave} ${passo.frase}`}
          className="min-w-0 break-words text-sm [overflow-wrap:anywhere] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{ color: 'var(--testo)', outlineColor: 'var(--blu)' }}
        >
          <span className="mr-2 inline-block min-w-[3.5rem] font-bold" style={{ color: 'var(--blu)' }}>
            {passo.parolaChiave}
          </span>
          <Frase testo={passo.frase} />
        </p>
      </div>

      {passo.verifiche.map((v, i) => (
        <p key={i} className="ml-6 flex items-start gap-1.5 text-sm" style={{ color: 'var(--testo)' }}>
          <Eye size={16} aria-hidden="true" className="mt-0.5 shrink-0" style={{ color: 'var(--blu)' }} />
          <span>{t('verificaDelPasso', { testo: v })}</span>
        </p>
      ))}

      {meta && (
        <p className="ml-6 text-xs" style={{ color: 'var(--testo-tenue)' }}>
          {altri > 0 ? t('usatoAnche', { n: altri }) : t('usatoSoloQui')}
          {meta.condivisoCon.length > 0 && ` · ${[...new Set(meta.condivisoCon.map((c) => c.scenario))].join(', ')}`}
        </p>
      )}

      <div className="ml-6 flex flex-wrap gap-2">
        {meta?.rinominabile && (
          <Bottone disabled={occupato} aria-label={t('rinominaAria', { frase: passo.frase })} onClick={onRinomina}>
            {t('rinomina')}
          </Bottone>
        )}
        <Bottone disabled={occupato} aria-label={t('usaAltroAria', { frase: passo.frase })} onClick={onUsaAltro}>
          {t('usaAltro')}
        </Bottone>
        <Bottone disabled={occupato || !puoiTogliere} aria-label={t('togliAria', { frase: passo.frase })} onClick={onTogli}>
          {t('togli')}
        </Bottone>
      </div>
      {meta && !meta.rinominabile && meta.motivo && (
        <p className="ml-6 text-xs" style={{ color: 'var(--testo-tenue)' }}>
          {t(MOTIVO[meta.motivo])}
        </p>
      )}

      {pannello}
    </li>
  );
}
