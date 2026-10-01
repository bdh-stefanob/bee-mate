'use client';

import { useCallback, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Component } from 'lucide-react';
import { useRisorsa } from '@/hooks/useRisorsa';
import { useFinestra } from '@/hooks/useFinestra';
import { useVistaUrl } from '@/hooks/useVistaUrl';
import {
  ORDINI_COMPONENTI,
  applicazioniDi,
  filtraComponenti,
  filtriAttivi,
  mostraFiltri,
  type OrdineComponenti,
} from '@/lib/catalogo-filtri';
import { impattoComponente } from '@/lib/catalogo-numeri';
import { parseVistaComponenti, serializzaVistaComponenti } from '@/lib/catalogo-url';
import { catalogo } from '@/lib/risorse-catalogo';
import type { Istantanea } from '@/lib/risorsa';
import { BarraStrumenti, PulsanteFiltro, SelezioneFiltro } from './BarraStrumenti';
import { ElencoPaginato } from './ElencoPaginato';
import { RigaComponente, chiaveComponente } from './RigaComponente';
import { ErroreCatalogo, ScheletroCatalogo } from './Scheletro';
import { StatoVuoto } from './StatoVuoto';
import type { RispostaCatalogo } from './tipi';

const selCatalogo = (i: Istantanea<RispostaCatalogo>) => i;

const CHIAVE_ORDINE: Record<OrdineComponenti, string> = {
  step: 'ordinePiuStep',
  scenari: 'ordinePiuScenari',
  az: 'ordineAz',
};

/**
 * Scheda 2 — Componenti: "Se cambio questo elemento della pagina, cosa smette
 * di funzionare?". Stesso dato degli Step (nessuna seconda richiesta): la
 * mappa al contrario che il motore ha gia' calcolato.
 */
export function SchedaComponenti() {
  const t = useTranslations('Catalogo');
  const cat = useRisorsa(catalogo, selCatalogo);
  const [vista, imposta, chiaveVista] = useVistaUrl(parseVistaComponenti, serializzaVistaComponenti);
  const [quante, amplia] = useFinestra(chiaveVista);
  const [aperti, setAperti] = useState<ReadonlySet<string>>(new Set());

  const step = cat.dati?.step;
  const componenti = cat.dati?.componenti;

  const filtrati = useMemo(
    () => (componenti && step ? filtraComponenti(componenti, step, vista) : []),
    [componenti, step, vista]
  );
  const impatti = useMemo(
    () => new Map((componenti ?? []).map((c) => [c, step ? impattoComponente(c, step) : 0] as const)),
    [componenti, step]
  );
  const applicazioni = useMemo(() => applicazioniDi((componenti ?? []).flatMap((c) => c.apps.map((app) => ({ app })))), [componenti]);
  const nAmbigue = useMemo(() => (componenti ?? []).filter((c) => c.pagineAmbigue && c.pagineAmbigue.length > 0).length, [componenti]);

  const commuta = useCallback((chiave: string) => {
    setAperti((prima) => {
      const dopo = new Set(prima);
      if (dopo.has(chiave)) dopo.delete(chiave);
      else dopo.add(chiave);
      return dopo;
    });
  }, []);
  const impostaQ = useCallback((q: string) => imposta({ q }), [imposta]);
  const togliFiltri = useCallback(() => imposta({ q: '', app: null, ambigua: false }), [imposta]);

  const nessunComponente = !!componenti && componenti.length === 0;
  const stepNonAgganciati = step ? step.length : 0;

  return (
    <section aria-labelledby="catalogo-componenti-titolo" className="flex flex-col gap-4">
      <div>
        <h2 id="catalogo-componenti-titolo" className="text-base font-semibold" style={{ color: 'var(--testo)' }}>
          {t('componentiDomanda')}
        </h2>
        <p className="text-sm" style={{ color: 'var(--testo-tenue)' }}>
          {t('componentiIntro')}
        </p>
      </div>

      {cat.stato === 'caricamento' && <ScheletroCatalogo etichetta={t('caricamento')} />}
      {cat.stato === 'errore' && (
        <ErroreCatalogo messaggio={t('erroreCatalogoRiprova')} onRiprova={() => void catalogo.carica()} />
      )}

      {nessunComponente && (
        <StatoVuoto
          icona={Component}
          titolo={t('vuotoComponentiTitolo')}
          testo={t('vuotoComponentiTesto')}
          dettaglio={stepNonAgganciati > 0 ? t('vuotoComponentiNonAgganciati', { n: stepNonAgganciati }) : undefined}
          azione={{ href: '/registra', etichetta: t('registraSessione') }}
        />
      )}

      {componenti && step && componenti.length > 0 && (
        <>
          {mostraFiltri(componenti.length) && (
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
              {nAmbigue > 0 && (
                <PulsanteFiltro attivo={vista.ambigua} onClick={() => imposta({ ambigua: !vista.ambigua })}>
                  {t('soloPaginaAmbigua', { n: nAmbigue })}
                </PulsanteFiltro>
              )}
              <SelezioneFiltro
                etichetta={t('ordina')}
                valore={vista.ordina}
                onCambia={(v) => imposta({ ordina: v as OrdineComponenti })}
                opzioni={ORDINI_COMPONENTI.map((o) => ({ valore: o, testo: t(CHIAVE_ORDINE[o]) }))}
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
              chiave={chiaveComponente}
              riga={(c) => (
                <RigaComponente
                  componente={c}
                  impatto={impatti.get(c) ?? 0}
                  step={step}
                  aperto={aperti.has(chiaveComponente(c))}
                  onCommuta={commuta}
                />
              )}
            />
          )}
        </>
      )}
    </section>
  );
}
