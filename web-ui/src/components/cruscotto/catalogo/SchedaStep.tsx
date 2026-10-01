'use client';

import { useCallback, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { BookOpen } from 'lucide-react';
import { useRisorsa } from '@/hooks/useRisorsa';
import { useFinestra } from '@/hooks/useFinestra';
import { useVistaUrl } from '@/hooks/useVistaUrl';
import {
  ORDINI_STEP,
  STATI_URL,
  applicazioniDi,
  conteggiStato,
  filtraStep,
  filtriAttivi,
  mostraFiltri,
  type OrdineStep,
  type StatoUrl,
  type VistaStep,
} from '@/lib/catalogo-filtri';
import { parseVistaStep, serializzaVistaStep } from '@/lib/catalogo-url';
import { catalogo, scenari } from '@/lib/risorse-catalogo';
import type { Istantanea } from '@/lib/risorsa';
import { BarraStrumenti, PulsanteFiltro, SelezioneFiltro } from './BarraStrumenti';
import { ElencoPaginato } from './ElencoPaginato';
import { RigaStep } from './RigaStep';
import { ErroreCatalogoIlleggibile } from './ErroreCatalogoIlleggibile';
import { ScheletroCatalogo } from './Scheletro';
import { StatoVuoto } from './StatoVuoto';
import type { RispostaCatalogo } from './tipi';

const selCatalogo = (i: Istantanea<RispostaCatalogo>) => i;
const selNumeroScenari = (i: Istantanea<{ scenari: unknown[] }[]>) => (i.dati ? i.dati.reduce((n, f) => n + f.scenari.length, 0) : null);

const CHIAVE_STATO: Record<StatoUrl, string> = {
  pronto: 'statoPronto',
  richiesto: 'statoRichiesto',
  proposto: 'statoProposto',
  superato: 'statoSuperato',
};
const CHIAVE_ORDINE: Record<OrdineStep, string> = {
  az: 'ordineAz',
  usi: 'ordineUsi',
  'senza-componente': 'ordineSenzaComponentePrima',
};

/**
 * Scheda 1 — Step: "Cosa sa fare il sistema oggi?".
 * Tutta la logica (ricerca, filtri, ordine, finestra) sta in funzioni pure di
 * `lib/catalogo-*.ts`; qui solo si compone.
 */
export function SchedaStep() {
  const t = useTranslations('Catalogo');
  const cat = useRisorsa(catalogo, selCatalogo);
  const nScenari = useRisorsa(scenari, selNumeroScenari);
  const [vista, imposta, chiaveVista] = useVistaUrl(parseVistaStep, serializzaVistaStep);
  const [quante, amplia] = useFinestra(chiaveVista);
  const [aperti, setAperti] = useState<ReadonlySet<string>>(new Set());

  const step = cat.dati?.step;
  const filtrati = useMemo(() => (step ? filtraStep(step, vista) : []), [step, vista]);
  const stati = useMemo(() => (step ? conteggiStato(step) : null), [step]);
  const applicazioni = useMemo(() => (step ? applicazioniDi(step) : []), [step]);
  const senzaComponente = useMemo(() => (step ? step.filter((s) => s.componenti.length === 0).length : 0), [step]);

  const commuta = useCallback((espressione: string) => {
    setAperti((prima) => {
      const dopo = new Set(prima);
      if (dopo.has(espressione)) dopo.delete(espressione);
      else dopo.add(espressione);
      return dopo;
    });
  }, []);
  const impostaQ = useCallback((q: string) => imposta({ q }), [imposta]);
  const togliFiltri = useCallback(() => imposta({ q: '', app: null, stato: null, senzaComponente: false }), [imposta]);

  return (
    <section aria-labelledby="catalogo-step-titolo" className="flex flex-col gap-4">
      <div>
        <h2 id="catalogo-step-titolo" className="text-base font-semibold" style={{ color: 'var(--testo)' }}>
          {t('stepDomanda')}
        </h2>
        <p className="text-sm" style={{ color: 'var(--testo-tenue)' }}>
          {t('stepIntro')}
        </p>
      </div>

      {cat.stato === 'caricamento' && <ScheletroCatalogo etichetta={t('caricamento')} />}
      {cat.stato === 'errore' && (
        <ErroreCatalogoIlleggibile />
      )}

      {step && step.length === 0 && (
        <StatoVuoto
          icona={BookOpen}
          titolo={t('vuotoStepTitolo')}
          testo={t('vuotoStepTesto')}
          azione={{ href: '/registra', etichetta: t('registraSessione') }}
        />
      )}

      {step && step.length > 0 && (
        <>
          {mostraFiltri(step.length) && stati && (
            <BarraStrumenti
              q={vista.q}
              onQ={impostaQ}
              segnaposto={t('cercaSegnaposto')}
              mostrati={Math.min(quante, filtrati.length)}
              totale={filtrati.length}
              nAttivi={filtriAttivi(vista)}
              onTogliFiltri={togliFiltri}
            >
              {applicazioni.length > 1 && (
                <SelezioneFiltro
                  etichetta={t('filtroApplicazione')}
                  valore={vista.app ?? ''}
                  onCambia={(v) => imposta({ app: v || null })}
                  opzioni={[
                    { valore: '', testo: t('appTutte') },
                    ...applicazioni.map((a) => ({
                      valore: a,
                      testo: a === 'common' ? t('appComune') : a === 'generated' ? t('appNonSalvata') : a,
                    })),
                  ]}
                />
              )}
              <div role="group" aria-label={t('filtroStato')} className="flex flex-wrap items-center gap-2">
                <PulsanteFiltro attivo={vista.stato === null} onClick={() => imposta({ stato: null })}>
                  {t('statoTutti')}
                </PulsanteFiltro>
                {STATI_URL.filter((s) => stati[s] > 0).map((s) => (
                  <PulsanteFiltro key={s} attivo={vista.stato === s} onClick={() => imposta({ stato: vista.stato === s ? null : s })}>
                    {t('statoConConteggio', { stato: t(CHIAVE_STATO[s]), n: stati[s] })}
                  </PulsanteFiltro>
                ))}
              </div>
              {senzaComponente > 0 && (
                <PulsanteFiltro
                  attivo={vista.senzaComponente}
                  onClick={() => imposta({ senzaComponente: !vista.senzaComponente })}
                >
                  {t('soloSenzaComponente', { n: senzaComponente })}
                </PulsanteFiltro>
              )}
              <SelezioneFiltro
                etichetta={t('ordina')}
                valore={vista.ordina}
                onCambia={(v) => imposta({ ordina: v as OrdineStep })}
                opzioni={ORDINI_STEP.map((o) => ({ valore: o, testo: t(CHIAVE_ORDINE[o]) }))}
              />
            </BarraStrumenti>
          )}

          {filtrati.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--testo-tenue)' }}>
              {t('nessunRisultato')}
            </p>
          ) : (
            <ElencoPaginato
              voci={filtrati}
              quante={quante}
              onAmplia={() => amplia(filtrati.length)}
              chiave={(s) => s.espressione}
              riga={(s) => <RigaStep step={s} aperto={aperti.has(s.espressione)} onCommuta={commuta} />}
            />
          )}

          {/* Con una sola voce (il caso di oggi) e nessuno scenario salvato: il catalogo cresce da solo. */}
          {step.length <= 1 && nScenari === 0 && (
            <StatoVuoto
              icona={BookOpen}
              titolo={t('suggerimentoPartenza')}
              azione={{ href: '/registra', etichetta: t('registraSessione') }}
            />
          )}
        </>
      )}
    </section>
  );
}
