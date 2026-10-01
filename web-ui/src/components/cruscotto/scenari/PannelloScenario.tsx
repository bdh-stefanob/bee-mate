'use client';

import { useMemo, type ReactNode, type Ref } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Download, Play } from 'lucide-react';
import { GherkinLeggibile } from '@/components/GherkinLeggibile';
import { SchedaEsito } from './SchedaEsito';
import { CLASSE_AZIONE_FLESSIBILE } from './layout';
import { useRisorsa } from '@/hooks/useRisorsa';
import { risorsaTesto } from '@/lib/stato-scenari';
import { indirizzoEsecuzione } from '@/lib/percorso-esecuzione';
import type { VoceScenario } from '@/lib/scenari-elenco';
import type { Istantanea } from '@/lib/risorsa';

const CLASSE_AZIONE = `inline-flex min-h-10 ${CLASSE_AZIONE_FLESSIBILE} items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2`;

const tutto = <T,>(i: Istantanea<T>): Istantanea<T> => i;

/**
 * Lo scenario scelto: titolo, azioni, come e' andata l'ultima volta e cosa fa.
 *
 * `altreAzioni` e' il punto di aggancio di "Modifica" (sotto-progetto 2): oggi
 * nessuno lo passa, e non c'e' un pulsante inattivo al suo posto — un pulsante
 * che non fa niente e' peggio di uno assente.
 */
export function PannelloScenario({
  voce,
  ambiente,
  titoloRef,
  altreAzioni,
}: {
  voce: VoceScenario;
  ambiente: string | null;
  titoloRef: Ref<HTMLHeadingElement>;
  altreAzioni?: ReactNode;
}) {
  const t = useTranslations('Scenari');
  const indirizzoEsegui = indirizzoEsecuzione(voce.file, voce.riga);
  // Il testo si tiene a chiave file@impronta: cambia il file, cambia la voce.
  const risorsa = useMemo(() => risorsaTesto(voce.file, voce.impronta), [voce.file, voce.impronta]);
  const testo = useRisorsa(risorsa, tutto);
  const idTitolo = `titolo-${voce.chiave.replace(/\W/g, '_')}`;

  return (
    <section aria-labelledby={idTitolo} className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2
          id={idTitolo}
          ref={titoloRef}
          tabIndex={-1}
          className="text-lg font-semibold break-words focus:focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{ color: 'var(--testo)', outlineColor: 'var(--blu)' }}
        >
          {voce.nome}
        </h2>
        <p className="text-sm" style={{ color: 'var(--testo-tenue)' }}>
          {voce.generato
            ? t('registratoNonSalvato')
            : voce.flusso
              ? t('appFlusso', { app: voce.app, flusso: voce.flusso })
              : voce.app
                ? t('soloApp', { app: voce.app })
                : t('gruppoSenzaApp')}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {indirizzoEsegui ? (
          <Link
            href={indirizzoEsegui}
            aria-label={t('eseguiAria', { nome: voce.nome })}
            className={CLASSE_AZIONE}
            style={{ background: 'var(--blu-fondo)', color: '#fff', outlineColor: 'var(--blu)' }}
          >
            <Play size={16} aria-hidden="true" />
            {t('esegui')}
          </Link>
        ) : (
          <span className="flex flex-col gap-1">
            <button
              type="button"
              disabled
              aria-describedby={`${idTitolo}-no-esegui`}
              className={`${CLASSE_AZIONE} cursor-not-allowed opacity-50`}
              style={{ background: 'var(--blu-fondo)', color: '#fff' }}
            >
              <Play size={16} aria-hidden="true" />
              {t('esegui')}
            </button>
            <span id={`${idTitolo}-no-esegui`} className="text-xs" style={{ color: 'var(--testo-tenue)' }}>
              {t('eseguiNonDisponibile')}
            </span>
          </span>
        )}
        <a
          href={`/api/scenari/esporta?file=${encodeURIComponent(voce.file)}`}
          aria-label={t('esportaAria', { nome: voce.nome })}
          className={`${CLASSE_AZIONE} border`}
          style={{ borderColor: 'var(--bordo)', color: 'var(--blu)', outlineColor: 'var(--blu)', background: 'var(--superficie)' }}
        >
          <Download size={16} aria-hidden="true" />
          {t('esporta')}
        </a>
        {altreAzioni}
      </div>

      <SchedaEsito stato={voce.stato} ambiente={ambiente} />

      <section aria-label={t('testoTitolo')} className="flex flex-col gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--testo-tenue)' }}>
          {t('testoTitolo')}
        </h3>
        {testo.dati !== null ? (
          <GherkinLeggibile
            testo={testo.dati}
            ariaLabel={t('testoAria')}
            rigaEvidenziata={voce.scenariNelFile > 1 ? voce.riga : undefined}
          />
        ) : testo.stato === 'errore' ? (
          <div className="flex flex-col items-start gap-2 text-sm" role="alert" style={{ color: 'var(--rosso)' }}>
            <p>{t('testoErrore')}</p>
            <button
              type="button"
              onClick={() => void risorsa.carica()}
              className="inline-flex min-h-10 items-center rounded-md border px-3 font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{ borderColor: 'var(--bordo)', color: 'var(--blu)', outlineColor: 'var(--blu)' }}
            >
              {t('riprova')}
            </button>
          </div>
        ) : (
          <p role="status" className="text-sm" style={{ color: 'var(--testo-tenue)' }}>
            {t('testoCaricamento')}
          </p>
        )}
      </section>
    </section>
  );
}
