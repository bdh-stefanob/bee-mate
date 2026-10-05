'use client';

import { useLocale, useTranslations } from 'next-intl';
import { CheckCircle2, XCircle, CircleDashed, History } from 'lucide-react';
import { FraseFallimento } from '@/components/cruscotto/FraseFallimento';
import { LinkSchermata } from '@/components/cruscotto/scenari/LinkSchermata';
import { formattaDurata, formattaQuando, type Traduttore } from '@/lib/formato-quando';
import type { StatoScenario } from '@/lib/scenari-elenco';
import type { UltimoEsito } from '@/lib/esiti-tipi';
import { TITOLO_GRUPPO } from '@/lib/scala-tipografica';

import { cn } from '@/lib/utils';
/**
 * "Com'e' andata l'ultima volta" nei suoi quattro casi: superato, non superato,
 * mai eseguito (su questo ambiente), modificato dopo l'ultima prova. Ognuno ha
 * un'icona di forma diversa e una parola: mai il solo colore. Lo screenshot e il
 * messaggio tecnico non stanno qui: sono nell'esecuzione, non nell'indice.
 */
export function SchedaEsito({ stato, ambiente }: { stato: StatoScenario; ambiente: string | null }) {
  const t = useTranslations('Scenari');
  const te = useTranslations('Esecuzione');
  const locale = useLocale();

  const quando = (e: UltimoEsito) => formattaQuando(e.quando, locale, t as Traduttore);
  const durata = (e: UltimoEsito) => formattaDurata(e.durataMs, locale, te as Traduttore);
  const nomeAmbiente = (e: UltimoEsito) => e.ambiente ?? t('ambienteSconosciuto');

  let Icona = CircleDashed;
  let colore = 'text-testo-tenue';
  let titolo: string;
  let corpo: React.ReactNode = null;

  if (stato.tipo === 'passato') {
    Icona = CheckCircle2;
    colore = 'text-verde';
    titolo = t('esitoPassato');
    corpo = (
      <p className="text-sm text-testo-tenue">
        {t('dettaglioPassato', {
          quando: quando(stato.esito),
          durata: durata(stato.esito),
          ambiente: nomeAmbiente(stato.esito),
        })}
      </p>
    );
  } else if (stato.tipo === 'fallito') {
    Icona = XCircle;
    colore = 'text-rosso';
    const passo = stato.esito.passoFallito;
    titolo = passo ? t('esitoFallitoAlPasso', { numero: passo.numero, totale: passo.totale }) : t('esitoFallito');
    corpo = (
      <>
        {passo ? (
          <>
            <p className="text-sm text-testo">
              {t('fermoAlPasso', { numero: passo.numero, totale: passo.totale })}{' '}
              <span className="font-medium">«{passo.testo}»</span>
            </p>
            {passo.motivo === 'non-collegato' ? (
              <p className="text-sm font-medium text-rosso">
                {t('passoNonCollegato')}
              </p>
            ) : (
              <FraseFallimento riepilogo={passo.riepilogo} />
            )}
          </>
        ) : (
          <p className="text-sm text-testo">
            {t('fermoFuoriDaiPassi')}
          </p>
        )}
        <p className="text-sm text-testo-tenue">
          {t('dettaglioFallito', {
            quando: quando(stato.esito),
            durata: durata(stato.esito),
            ambiente: nomeAmbiente(stato.esito),
          })}
        </p>
        <LinkSchermata esecuzione={stato.esito.esecuzione} />
      </>
    );
  } else if (stato.tipo === 'modificato') {
    Icona = History;
    colore = 'text-ambra';
    titolo = t('esitoModificato');
    corpo = (
      <p className="text-sm text-testo">
        {t('modificatoTesto', {
          esito: stato.esito.esito === 'passato' ? t('parolaPassato') : t('parolaFallito'),
          quando: quando(stato.esito),
        })}
      </p>
    );
  } else {
    titolo = ambiente ? t('maiEseguitoTitolo', { ambiente }) : t('maiEseguitoTitoloSenzaAmbiente');
    corpo = (
      <>
        <p className="text-sm text-testo">
          {t('maiEseguitoTesto')}
        </p>
        {stato.altrove && (
          <p className="text-sm text-testo-tenue">
            {stato.altrove.ambiente === null
              ? t('provatoAmbienteSconosciuto', {
                  esito: stato.altrove.esito === 'passato' ? t('parolaPassato') : t('parolaFallito'),
                  quando: quando(stato.altrove),
                })
              : t('provatoAltrove', {
                  ambiente: stato.altrove.ambiente,
                  esito: stato.altrove.esito === 'passato' ? t('parolaPassato') : t('parolaFallito'),
                  quando: quando(stato.altrove),
                })}
          </p>
        )}
      </>
    );
  }

  return (
    <section
      aria-label={t('esitoTitolo')}
      className="flex flex-col gap-2 rounded-scheda border p-4 border-bordo bg-superficie"
    >
      <h3 className={cn(TITOLO_GRUPPO, 'text-testo-tenue')}>
        {t('esitoTitolo')}
      </h3>
      <p className="flex items-start gap-2 text-base font-semibold text-testo">
        <Icona size={22} aria-hidden="true" className={cn('mt-0.5 shrink-0', colore)} />
        <span>{titolo}</span>
      </p>
      <div className="flex flex-col gap-1.5 pl-[30px]">{corpo}</div>
    </section>
  );
}
