'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { AlertTriangle, CheckCircle2, ChevronRight } from 'lucide-react';
import { useRisorsa } from '@/hooks/useRisorsa';
import { numeriCatalogo, numeriCoppie, numeroScenari } from '@/lib/catalogo-numeri';
import { catalogo, riconciliazione, scenari, statoAggiornamento } from '@/lib/risorse-catalogo';
import type { Istantanea } from '@/lib/risorsa';
import type { RispostaCatalogo, RispostaRiconciliazione } from './tipi';
import type { FileScenariRidotto, StatoAggiornamentoCatalogo } from '@/lib/risorse-catalogo';

// I selettori stanno FUORI dal componente e restituiscono l'istantanea stessa
// (gia' condivisa dallo store): vedi il commento di `useRisorsa`.
const selCatalogo = (i: Istantanea<RispostaCatalogo>) => i;
const selCoppie = (i: Istantanea<RispostaRiconciliazione>) => i;
const selScenari = (i: Istantanea<FileScenariRidotto[]>) => i;
const selAggiornamento = (i: Istantanea<StatoAggiornamentoCatalogo>) => i.dati?.stato === 'in-corso';

/**
 * Le quattro caselle in testa: pochi numeri, e ognuno e' un LINK alla scheda
 * che lo mostra (un numero senza un clic e' una domanda senza risposta).
 * Ogni casella si riempie quando il suo dato arriva: la pagina non aspetta la
 * piu' lenta (le coppie costano di piu' del catalogo).
 */
export function IntestazioneCatalogo() {
  const t = useTranslations('Catalogo');
  const cat = useRisorsa(catalogo, selCatalogo);
  const coppie = useRisorsa(riconciliazione, selCoppie);
  const scen = useRisorsa(scenari, selScenari);
  const inAggiornamento = useRisorsa(statoAggiornamento, selAggiornamento);

  const numeri = useMemo(() => (cat.dati ? numeriCatalogo(cat.dati) : null), [cat.dati]);
  const numeriC = useMemo(() => (coppie.dati ? numeriCoppie(coppie.dati.coppie) : null), [coppie.dati]);
  const nScenari = useMemo(() => numeroScenari(scen.dati), [scen.dati]);

  const erroreCatalogo = cat.stato === 'errore';
  const erroreCoppie = coppie.stato === 'errore';
  const erroreScenari = scen.stato === 'errore';

  return (
    <ul
      aria-label={t('numeriAria')}
      aria-busy={inAggiornamento}
      className="grid grid-cols-2 min-[1100px]:grid-cols-4 gap-3"
    >
      <Casella href="/catalogo?scheda=step" titolo={t('numStepTitolo')} vai={t('numStepVai')}
        stato={erroreCatalogo ? 'errore' : numeri ? 'pronto' : 'caricamento'}>
        {numeri && (
          <>
            <Numero valore={numeri.totale} />
            <Riga>{t('numStepDettaglio', { pronti: numeri.pronti, richiesti: numeri.richiesti })}</Riga>
            {numeri.altri > 0 && <Riga>{t('numStepAltri', { n: numeri.altri })}</Riga>}
          </>
        )}
      </Casella>

      <Casella href="/catalogo?scheda=componenti" titolo={t('numComponentiTitolo')} vai={t('numComponentiVai')}
        stato={erroreCatalogo ? 'errore' : numeri ? 'pronto' : 'caricamento'}>
        {numeri && (
          <>
            <Numero valore={numeri.componenti} />
            <Riga>{t('numComponentiDettaglio', { ancorati: numeri.ancorati, totale: numeri.totale })}</Riga>
          </>
        )}
      </Casella>

      <Casella
        href="/catalogo?scheda=da-sistemare"
        titolo={t('numSistemareTitolo')}
        vai={t('numSistemareVai')}
        stato={erroreCoppie ? 'errore' : numeriC ? 'pronto' : 'caricamento'}
        attenzione={!!numeriC && numeriC.azionabili > 0}
      >
        {numeriC && (
          <>
            <span className="flex items-center gap-2">
              {numeriC.azionabili > 0 ? (
                <AlertTriangle size={20} aria-hidden="true" style={{ color: 'var(--ambra)' }} />
              ) : (
                <CheckCircle2 size={20} aria-hidden="true" style={{ color: 'var(--verde)' }} />
              )}
              <Numero valore={numeriC.azionabili} />
            </span>
            <Riga>{t('numSistemareDettaglio', { n: numeriC.azionabili })}</Riga>
            {numeriC.daVerificare > 0 && <Riga>{t('numSistemareVerificare', { n: numeriC.daVerificare })}</Riga>}
          </>
        )}
      </Casella>

      <Casella href="/scenari" titolo={t('numScenariTitolo')} vai={t('numScenariVai')}
        stato={erroreScenari ? 'errore' : nScenari !== null ? 'pronto' : 'caricamento'}>
        {nScenari !== null && (
          <>
            <Numero valore={nScenari} />
            <Riga>{t('numScenariDettaglio', { n: nScenari })}</Riga>
          </>
        )}
      </Casella>
    </ul>
  );
}

function Numero({ valore }: { valore: number }) {
  return (
    <span className="text-3xl font-semibold leading-none" style={{ color: 'var(--testo)' }}>
      {valore}
    </span>
  );
}

function Riga({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-sm" style={{ color: 'var(--testo-tenue)' }}>
      {children}
    </span>
  );
}

function Casella({
  href,
  titolo,
  vai,
  stato,
  attenzione = false,
  children,
}: {
  href: string;
  titolo: string;
  vai: string;
  stato: 'caricamento' | 'errore' | 'pronto';
  attenzione?: boolean;
  children: React.ReactNode;
}) {
  const t = useTranslations('Catalogo');
  return (
    <li>
      <Link
        href={href}
        aria-busy={stato === 'caricamento'}
        className="flex h-full min-h-32 flex-col gap-1 rounded-lg border p-4 outline-none focus-visible:outline-2 focus-visible:outline-offset-2"
        style={{
          borderColor: attenzione ? 'var(--ambra)' : 'var(--bordo)',
          background: 'var(--superficie)',
          outlineColor: 'var(--blu)',
        }}
      >
        <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--testo-tenue)' }}>
          {titolo}
        </span>
        {stato === 'caricamento' && (
          <>
            <span aria-hidden="true" className="h-8 w-16 animate-pulse motion-reduce:animate-none rounded"
              style={{ background: 'var(--superficie-tenue)' }} />
            <span className="sr-only">{t('caricamento')}</span>
          </>
        )}
        {stato === 'errore' && (
          <span className="text-sm" style={{ color: 'var(--testo-tenue)' }}>
            {t('numeroNonDisponibile')}
          </span>
        )}
        {stato === 'pronto' && children}
        <span className="mt-auto flex items-center gap-1 pt-2 text-sm font-medium" style={{ color: 'var(--blu)' }}>
          {vai}
          <ChevronRight size={14} aria-hidden="true" />
        </span>
      </Link>
    </li>
  );
}
