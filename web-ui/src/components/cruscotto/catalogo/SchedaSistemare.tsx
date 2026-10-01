'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { CheckCircle2, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRisorsa } from '@/hooks/useRisorsa';
import { useVistaUrl } from '@/hooks/useVistaUrl';
import { applicazioniDi, filtraCoppie, filtriAttivi, mostraFiltri } from '@/lib/catalogo-filtri';
import { arricchisciCoppia, raggruppaCoppie, type CoppiaArricchita } from '@/lib/catalogo-numeri';
import { parseVistaCoppie, serializzaVistaCoppie } from '@/lib/catalogo-url';
import { leggiAnnullamentoDisponibile } from '@/lib/azioni-catalogo';
import { catalogo, riconciliazione, ricaricaCatalogoECoppie } from '@/lib/risorse-catalogo';
import type { Istantanea } from '@/lib/risorsa';
import { BarraStrumenti, SelezioneFiltro } from './BarraStrumenti';
import { CoppiaDoppione } from './CoppiaDoppione';
import { CoppiaEquivoco } from './CoppiaEquivoco';
import { CoppiaDaVerificare, CoppiaSoloDaSapere } from './CoppiaInformativa';
import { ErroreCatalogoIlleggibile } from './ErroreCatalogoIlleggibile';
import { ScheletroCatalogo } from './Scheletro';
import { StatoVuoto } from './StatoVuoto';
import { StrisciaEsito } from './StrisciaEsito';
import type { EsitoOperazione, RispostaCatalogo, RispostaRiconciliazione } from './tipi';

const selCatalogo = (i: Istantanea<RispostaCatalogo>) => i;
const selCoppie = (i: Istantanea<RispostaRiconciliazione>) => i;

/** Quante coppie di un gruppo si mostrano per volta: con 500 step i gruppi non devono diventare un muro. */
const COPPIE_PER_VOLTA = 10;

type Gruppo = 'doppioni' | 'equivoci' | 'daVerificare' | 'informative';

/**
 * Scheda 3 — Da sistemare: "Quali frasi si somigliano troppo?".
 * Le coppie, gia' giudicate dal motore, in quattro gruppi; la lista si rilegge
 * SENZA smontarsi dopo una modifica (`aggiornando`), e l'esito sta in una
 * striscia in cima che non sparisce con la coppia.
 */
export function SchedaSistemare() {
  const t = useTranslations('Catalogo');
  const coppie = useRisorsa(riconciliazione, selCoppie);
  const cat = useRisorsa(catalogo, selCatalogo);
  const [vista, imposta] = useVistaUrl(parseVistaCoppie, serializzaVistaCoppie);
  const [esito, setEsito] = useState<EsitoOperazione | null>(null);
  const contatore = useRef(0);

  // L'ultima fusione puo' essere annullata anche dopo aver cambiato pagina: la
  // striscia si ricostruisce dalla rotta (una volta, all'apertura).
  useEffect(() => {
    let annullato = false;
    void leggiAnnullamentoDisponibile().then((s) => {
      if (annullato || !s.disponibile) return;
      setEsito((attuale) => attuale ?? { tipo: 'ripristino', da: s.da, a: s.a, annullabile: true, id: ++contatore.current });
    });
    return () => {
      annullato = true;
    };
  }, []);

  const arricchite = useMemo(
    () => (coppie.dati && cat.dati ? coppie.dati.coppie.map((c) => arricchisciCoppia(c, cat.dati!.step)) : null),
    [coppie.dati, cat.dati]
  );
  const filtrate = useMemo(() => (arricchite ? filtraCoppie(arricchite, vista) : []), [arricchite, vista]);
  const gruppi = useMemo(() => raggruppaCoppie(filtrate), [filtrate]);
  const applicazioni = useMemo(
    () => applicazioniDi((arricchite ?? []).flatMap((c) => [{ app: c.a.app }, { app: c.b.app }])),
    [arricchite]
  );

  const registra = useCallback((e: Omit<EsitoOperazione, 'id'>) => {
    setEsito({ ...e, id: ++contatore.current });
    void ricaricaCatalogoECoppie();
  }, []);
  const dopoAnnullo = useCallback(() => {
    setEsito({ tipo: 'annullata', annullabile: false, id: ++contatore.current });
    void ricaricaCatalogoECoppie();
  }, []);
  const impostaQ = useCallback((q: string) => imposta({ q }), [imposta]);
  const togliFiltri = useCallback(() => imposta({ q: '', app: null }), [imposta]);

  const totale = arricchite?.length ?? 0;
  const caricamento = coppie.stato === 'caricamento' || (coppie.stato === 'pronto' && !arricchite && cat.stato !== 'errore');

  return (
    <section aria-labelledby="catalogo-sistemare-titolo" className="flex flex-col gap-4">
      <div>
        <h2 id="catalogo-sistemare-titolo" className="text-base font-semibold" style={{ color: 'var(--testo)' }}>
          {t('sistemareDomanda')}
        </h2>
        <p className="text-sm" style={{ color: 'var(--testo-tenue)' }}>
          {t('sistemareIntro')}
        </p>
      </div>

      {esito && <StrisciaEsito esito={esito} onChiudi={() => setEsito(null)} onAnnullata={dopoAnnullo} />}

      {caricamento && <ScheletroCatalogo etichetta={t('caricamento')} />}
      {coppie.stato === 'errore' && (
        <ErroreCatalogoIlleggibile />
      )}
      {cat.stato === 'errore' && !arricchite && coppie.stato !== 'errore' && (
        <ErroreCatalogoIlleggibile />
      )}

      {arricchite && totale === 0 && (
        <StatoVuoto icona={CheckCircle2} titolo={t('nessunDisordineTitolo')} testo={t('nessunDisordine')} />
      )}

      {arricchite && totale > 0 && (
        <>
          {mostraFiltri(totale) && (
            <BarraStrumenti
              q={vista.q}
              onQ={impostaQ}
              segnaposto={t('cercaSegnaposto')}
              mostrati={filtrate.length}
              totale={filtrate.length}
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
            </BarraStrumenti>
          )}

          {filtrate.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--testo-tenue)' }}>
              {t('nessunRisultato')}
            </p>
          ) : (
            <div className="flex flex-col gap-4" aria-busy={coppie.aggiornando}>
              <GruppoDiCoppie chiave="doppioni" titolo="gruppoDoppioni" coppie={gruppi.doppioni} apertoDiDefault
                disegna={(c) => <CoppiaDoppione coppia={c} onFatto={registra} />} />
              <GruppoDiCoppie chiave="equivoci" titolo="gruppoEquivoci" coppie={gruppi.equivoci} apertoDiDefault
                disegna={(c) => <CoppiaEquivoco coppia={c} onFatto={registra} />} />
              <GruppoDiCoppie chiave="daVerificare" titolo="gruppoDaVerificare" coppie={gruppi.daVerificare}
                disegna={(c) => <CoppiaDaVerificare coppia={c} />} />
              <GruppoDiCoppie chiave="informative" titolo="gruppoSoloSapere" coppie={gruppi.informative}
                disegna={(c) => <CoppiaSoloDaSapere coppia={c} />} />
            </div>
          )}
        </>
      )}
    </section>
  );
}

/** Un gruppo che si ripiega, con il suo conteggio nel titolo. I primi due partono aperti, gli altri chiusi. */
function GruppoDiCoppie({
  chiave,
  titolo,
  coppie,
  apertoDiDefault = false,
  disegna,
}: {
  chiave: Gruppo;
  titolo: string;
  coppie: CoppiaArricchita[];
  apertoDiDefault?: boolean;
  disegna: (coppia: CoppiaArricchita) => React.ReactNode;
}) {
  const t = useTranslations('Catalogo');
  const id = useId();
  const [aperto, setAperto] = useState(apertoDiDefault);
  const [quante, setQuante] = useState(COPPIE_PER_VOLTA);

  // Un gruppo vuoto non ha niente da mostrare: non compare (i conteggi a zero sono rumore).
  if (coppie.length === 0) return null;

  const Chevron = aperto ? ChevronDown : ChevronRight;
  const visibili = coppie.slice(0, quante);
  const restanti = coppie.length - visibili.length;

  return (
    <div data-gruppo={chiave} className="flex flex-col gap-2">
      <button
        type="button"
        aria-expanded={aperto}
        aria-controls={id}
        onClick={() => setAperto((a) => !a)}
        className="flex min-h-10 w-full items-center gap-2 rounded-md px-1 text-left focus-visible:outline-2 focus-visible:outline-offset-2"
        style={{ outlineColor: 'var(--blu)' }}
      >
        <Chevron size={16} aria-hidden="true" style={{ color: 'var(--testo-tenue)' }} />
        <span className="flex-1 text-sm font-semibold" style={{ color: 'var(--testo)' }}>
          {t(titolo, { n: coppie.length })}
        </span>
        <span className="text-sm" style={{ color: 'var(--testo-tenue)' }}>
          {aperto ? t('nascondiGruppo') : t('mostraGruppo')}
        </span>
      </button>

      {aperto && (
        <div id={id} className="flex flex-col gap-3">
          <ul className="flex flex-col gap-3">
            {visibili.map((c) => (
              <li key={c.id}>{disegna(c)}</li>
            ))}
          </ul>
          {restanti > 0 && (
            <div className="flex justify-center">
              <Button variant="outline" className="min-h-10 h-auto" onClick={() => setQuante((q) => q + COPPIE_PER_VOLTA)}>
                {t('mostraAltri', { n: Math.min(COPPIE_PER_VOLTA, restanti) })}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
