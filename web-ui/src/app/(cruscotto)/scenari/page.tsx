'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { AlertTriangle } from 'lucide-react';
import { useAmbiente } from '@/context/AmbienteContext';
import { useRisorsa } from '@/hooks/useRisorsa';
import { useSchermoLargo } from '@/hooks/useSchermoLargo';
import { scenari } from '@/lib/stato-scenari';
import {
  costruisciVoci,
  cerca,
  filtraPerCategoria,
  indirizzoScenario,
  leggiRichiesta,
  raggruppa,
  riepiloga,
  risolviSelezione,
  type Categoria,
  type VoceScenario,
} from '@/lib/scenari-elenco';
import type { Istantanea } from '@/lib/risorsa';
import type { RispostaScenari } from '@/lib/esiti-tipi';
import { RiepilogoEsiti } from '@/components/cruscotto/scenari/RiepilogoEsiti';
import { ElencoScenari } from '@/components/cruscotto/scenari/ElencoScenari';
import { ModificaScenario } from '@/components/cruscotto/scenari/modifica/ModificaScenario';
import { useModifiche } from '@/context/ModificheContext';
import { StatoVuotoScenari } from '@/components/cruscotto/scenari/StatoVuotoScenari';
import { ScheletroScenari } from '@/components/cruscotto/scenari/ScheletroScenari';
import {
  CLASSE_DUE_COLONNE,
  CLASSE_ELENCO_STICKY,
  MEDIA_DUE_COLONNE,
} from '@/components/cruscotto/scenari/layout';

const tutto = (i: Istantanea<RispostaScenari>): Istantanea<RispostaScenari> => i;

const CLASSE_PAGINA = 'max-w-screen-xl mx-auto flex flex-col gap-4 min-w-0';

/**
 * Scenari: i test che il tester ha registrato e come sono andati l'ultima volta.
 * Risponde a tre domande: cosa ho gia' registrato, funziona ancora, cosa dice
 * in parole mie. La pagina compone: tutta la logica (raggruppare, cercare,
 * contare, scegliere) sta in `lib/scenari-elenco.ts`, che si prova con vitest.
 *
 * L'esito e' quello dell'ambiente scelto nella barra laterale (decisione O5).
 */
function ScenariContenuto() {
  const t = useTranslations('Scenari');
  const router = useRouter();
  const parametri = useSearchParams();
  const { ambiente } = useAmbiente();
  const ambienteScelto = ambiente || null;
  const istantanea = useRisorsa(scenari, tutto);
  const larga = useSchermoLargo(MEDIA_DUE_COLONNE);

  const [testoCerca, setTestoCerca] = useState('');
  const [categoria, setCategoria] = useState<Categoria | null>(null);
  const [annuncio, setAnnuncio] = useState('');
  const titoloRef = useRef<HTMLHeadingElement>(null);
  const scelta = useRef({ chiave: null as string | null, daUtente: false });

  // La finestra torna in primo piano: una prova puo' essere stata lanciata da
  // un'altra scheda.
  useEffect(() => {
    const alFuoco = () => void scenari.carica();
    window.addEventListener('focus', alFuoco);
    return () => window.removeEventListener('focus', alFuoco);
  }, []);

  const dati = istantanea.dati;
  const voci = useMemo(() => (dati ? costruisciVoci(dati.file, ambienteScelto) : []), [dati, ambienteScelto]);
  const visibili = useMemo(
    () => filtraPerCategoria(cerca(voci, testoCerca), categoria),
    [voci, testoCerca, categoria]
  );
  const gruppi = useMemo(() => raggruppa(visibili), [visibili]);
  const riepilogo = useMemo(() => riepiloga(voci), [voci]);

  const indirizzoCorrente = parametri.toString();
  const richiesta = useMemo(() => leggiRichiesta(new URLSearchParams(indirizzoCorrente)), [indirizzoCorrente]);
  const selezione = useMemo(
    () => risolviSelezione(voci, visibili, richiesta, larga),
    [voci, visibili, richiesta, larga]
  );
  const voceScelta: VoceScenario | null =
    selezione.tipo === 'scelto' ? (voci.find((v) => v.chiave === selezione.chiave) ?? null) : null;
  const chiaveScelta = voceScelta?.chiave ?? null;

  // Su schermo largo, aprendo la pagina senza indicazioni, e' scelto il primo
  // scenario: lo si scrive nell'indirizzo, cosi' cercare dopo non lo cambia
  // sotto gli occhi e lo scenario aperto resta aperto.
  useEffect(() => {
    if (larga && !richiesta.file && voceScelta) {
      router.replace(indirizzoScenario(voceScelta.file, voceScelta.nome), { scroll: false });
    }
  }, [larga, richiesta.file, voceScelta, router]);

  useEffect(() => {
    scelta.current.chiave = chiaveScelta;
  }, [chiaveScelta]);

  // Su schermo stretto il pannello sta sotto l'elenco: scegliere sposta il
  // fuoco sul suo titolo e lo porta in vista. Su schermo largo e' gia' accanto.
  useEffect(() => {
    if (scelta.current.daUtente && chiaveScelta) {
      scelta.current.daUtente = false;
      if (!larga) {
        titoloRef.current?.focus();
        titoloRef.current?.scrollIntoView({ block: 'start' });
      }
    }
  }, [chiaveScelta, larga]);

  const { puoiUscire } = useModifiche();

  const suScegli = useCallback(
    (voce: VoceScenario) => {
      const indirizzo = indirizzoScenario(voce.file, voce.nome);
      // Con una modifica non salvata si chiede prima al tester cosa farne: il
      // pannello apre il suo dialogo e, se si sceglie di uscire, naviga lui.
      if (voce.chiave !== scelta.current.chiave && !puoiUscire(indirizzo)) return;
      // `replace`, non `push`: dopo cinque scelte il tasto Indietro riporta alla
      // pagina da cui si veniva, non allo scenario di prima.
      if (voce.chiave !== scelta.current.chiave) scelta.current.daUtente = true;
      setAnnuncio(t('aperto', { nome: voce.nome }));
      router.replace(indirizzo, { scroll: false });
    },
    [router, t, puoiUscire]
  );

  // Una modifica e' stata salvata o annullata: l'elenco si rilegge (l'impronta e'
  // cambiata, quindi "modificato dopo l'ultima prova") e l'indirizzo segue il
  // nuovo titolo.
  const alTermine = useCallback(
    async ({ file, titolo }: { file: string; titolo: string }) => {
      await scenari.ricarica();
      router.replace(indirizzoScenario(file, titolo), { scroll: false });
    },
    [router]
  );

  const intestazione = (
    <div>
      <h1 className="text-xl font-semibold" style={{ color: 'var(--testo)' }}>
        {t('titolo')}
      </h1>
      <p className="mt-1 text-sm" style={{ color: 'var(--testo-tenue)' }}>
        {t('descrizione')}
      </p>
    </div>
  );

  // 1. Caricamento: lo scheletro, solo la prima volta in assoluto.
  if (istantanea.stato === 'caricamento') {
    return (
      <div className={CLASSE_PAGINA}>
        {intestazione}
        <ScheletroScenari />
      </div>
    );
  }

  // 2. Errore: nessun dato e la lettura e' fallita.
  if (dati === null) {
    return (
      <div className={CLASSE_PAGINA}>
        {intestazione}
        <div
          role="alert"
          className="flex flex-col items-start gap-3 rounded-lg border p-6"
          style={{ borderColor: 'var(--rosso)', background: 'var(--superficie)' }}
        >
          <p className="flex items-center gap-2 text-base font-semibold" style={{ color: 'var(--rosso)' }}>
            <AlertTriangle size={20} aria-hidden="true" />
            {t('erroreTitolo')}
          </p>
          <p className="text-sm" style={{ color: 'var(--testo)' }}>
            {t('erroreTesto')}
          </p>
          <button
            type="button"
            onClick={() => void scenari.carica()}
            className="inline-flex min-h-10 items-center rounded-md border px-4 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ borderColor: 'var(--bordo)', color: 'var(--blu)', outlineColor: 'var(--blu)' }}
          >
            {t('riprova')}
          </button>
        </div>
      </div>
    );
  }

  // 3. Vuoto: la lettura e' riuscita e non c'e' nessuno scenario.
  if (dati.file.length === 0) {
    return (
      <div className={CLASSE_PAGINA}>
        {intestazione}
        <StatoVuotoScenari soloDescritti={dati.soloDescritti} />
      </div>
    );
  }

  return (
    <div className={CLASSE_PAGINA}>
      {intestazione}

      <RiepilogoEsiti riepilogo={riepilogo} attiva={categoria} onScegli={setCategoria} />
      <p className="text-xs" style={{ color: 'var(--testo-tenue)' }}>
        {ambienteScelto ? t('notaEsiti', { ambiente: ambienteScelto }) : t('notaSenzaAmbiente')}
      </p>

      {/* 10. Esiti illeggibili: gli scenari si mostrano, tutti "da eseguire", e lo si dice. */}
      {dati.esiti === 'illeggibile' && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-md border px-3 py-2 text-sm"
          style={{ borderColor: 'var(--ambra)', background: 'var(--superficie-tenue)', color: 'var(--testo)' }}
        >
          <AlertTriangle size={18} aria-hidden="true" className="mt-0.5 shrink-0" style={{ color: 'var(--ambra)' }} />
          {t('esitiIlleggibili')}
        </p>
      )}

      <div className={`flex flex-col gap-6 ${CLASSE_DUE_COLONNE}`}>
        <div className={`min-w-0 ${CLASSE_ELENCO_STICKY} flex flex-col`}>
          <ElencoScenari
            gruppi={gruppi}
            quanti={visibili.length}
            ambiente={ambienteScelto}
            chiaveScelta={chiaveScelta}
            testoCerca={testoCerca}
            filtroAttivo={categoria !== null}
            soloDescritti={dati.soloDescritti}
            onTesto={setTestoCerca}
            onCancellaFiltro={() => setCategoria(null)}
            onScegli={suScegli}
          />
        </div>

        <div className="min-w-0">
          {voceScelta ? (
            <ModificaScenario
              key={voceScelta.file}
              voce={voceScelta}
              ambiente={ambienteScelto}
              titoloRef={titoloRef}
              alTermine={alTermine}
            />
          ) : selezione.tipo === 'non-trovato' ? (
            <section
              aria-label={t('pannelloAria')}
              className="flex flex-col items-start gap-3 rounded-lg border p-6"
              style={{ borderColor: 'var(--bordo)', background: 'var(--superficie)' }}
            >
              <h2 className="text-lg font-semibold" style={{ color: 'var(--testo)' }}>
                {t('nonTrovatoTitolo')}
              </h2>
              <p className="text-sm" style={{ color: 'var(--testo-tenue)' }}>
                {t('nonTrovatoTesto')}
              </p>
              <button
                type="button"
                onClick={() => router.replace('/scenari', { scroll: false })}
                className="inline-flex min-h-10 items-center rounded-md border px-4 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{ borderColor: 'var(--bordo)', color: 'var(--blu)', outlineColor: 'var(--blu)' }}
              >
                {t('tornaElenco')}
              </button>
            </section>
          ) : larga ? (
            <p className="text-sm" style={{ color: 'var(--testo-tenue)' }}>
              {t('nessunaSelezione')}
            </p>
          ) : null}
        </div>
      </div>

      <div role="status" className="sr-only">
        {annuncio}
      </div>
    </div>
  );
}

export default function ScenariPage() {
  return (
    <Suspense fallback={<ScheletroScenari />}>
      <ScenariContenuto />
    </Suspense>
  );
}
