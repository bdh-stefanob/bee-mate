'use client';

import { Suspense, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { BookOpen, Component, GitCompareArrows } from 'lucide-react';
import { Schede, type SchedaDef } from '@/components/ui/schede';
import { IntestazioneCatalogo } from '@/components/cruscotto/catalogo/IntestazioneCatalogo';
import { AvvisoAggiornamento, RigaAggiornamento } from '@/components/cruscotto/catalogo/RigaAggiornamento';
import { SchedaComponenti } from '@/components/cruscotto/catalogo/SchedaComponenti';
import { SchedaSistemare } from '@/components/cruscotto/catalogo/SchedaSistemare';
import { SchedaStep } from '@/components/cruscotto/catalogo/SchedaStep';
import { ScheletroCatalogo } from '@/components/cruscotto/catalogo/Scheletro';
import type { RispostaRiconciliazione } from '@/components/cruscotto/catalogo/tipi';
import { useAggiornamentoCatalogo } from '@/hooks/useAggiornamentoCatalogo';
import { useRisorsa } from '@/hooks/useRisorsa';
import { useSchedaUrl } from '@/hooks/useSchedaUrl';
import { numeriCoppie } from '@/lib/catalogo-numeri';
import { riconciliazione } from '@/lib/risorse-catalogo';
import type { Istantanea } from '@/lib/risorsa';

/** Gli id stanno nell'indirizzo e restano uguali in ogni lingua: un link vale ovunque. */
const SCHEDE = ['step', 'componenti', 'da-sistemare'] as const;
type IdScheda = (typeof SCHEDE)[number];

const selCoppie = (i: Istantanea<RispostaRiconciliazione>) => i.dati;

/**
 * Catalogo: un'intestazione con quattro numeri (ognuno un link) e tre schede,
 * ognuna con la sua domanda. Solo composizione: nessun fetch, nessuna logica
 * (i dati stanno in `lib/risorse-catalogo.ts`, i conti in `lib/catalogo-*.ts`).
 * Gli scenari non sono piu' qui: stanno nella pagina Scenari, a cui porta la
 * quarta casella.
 *
 * `useSearchParams` (dentro `useSchedaUrl`) vuole un `<Suspense>` nella build.
 */
export default function CatalogoPage() {
  return (
    <Suspense fallback={<ScheletroCatalogo etichetta="…" />}>
      <CatalogoContenuto />
    </Suspense>
  );
}

function CatalogoContenuto() {
  const t = useTranslations('Catalogo');
  useAggiornamentoCatalogo();
  const [scheda, impostaScheda, pronta] = useSchedaUrl<IdScheda>({ valide: SCHEDE, predefinita: 'step', ricorda: true });

  const coppie = useRisorsa(riconciliazione, selCoppie);
  const azionabili = useMemo(() => (coppie ? numeriCoppie(coppie.coppie).azionabili : null), [coppie]);

  // Il contatore sta solo su "Da sistemare": e' l'unica scheda che chiede un'azione.
  const schede: SchedaDef[] = [
    { id: 'step', etichetta: t('schedaStep'), icona: BookOpen },
    { id: 'componenti', etichetta: t('schedaComponenti'), icona: Component },
    {
      id: 'da-sistemare',
      etichetta: t('schedaSistemare'),
      icona: GitCompareArrows,
      conteggio: azionabili,
      etichettaConteggio: azionabili ? t('schedaSistemareConteggio', { n: azionabili }) : undefined,
      tono: 'attenzione',
    },
  ];

  return (
    <div className="max-w-screen-xl mx-auto flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h1 className="text-xl font-semibold" style={{ color: 'var(--testo)' }}>
            {t('titoloPagina')}
          </h1>
          <RigaAggiornamento />
        </div>
        <p className="text-sm" style={{ color: 'var(--testo-tenue)' }}>
          {t('descrizionePagina')}
        </p>
      </div>

      <IntestazioneCatalogo />
      <AvvisoAggiornamento />

      {pronta ? (
        <Schede
          schede={schede}
          valore={scheda}
          onCambia={(id) => impostaScheda(id as IdScheda)}
          etichettaAria={t('schedeAria')}
          pannello={(id) =>
            id === 'step' ? <SchedaStep /> : id === 'componenti' ? <SchedaComponenti /> : <SchedaSistemare />
          }
        />
      ) : (
        <ScheletroCatalogo etichetta={t('caricamento')} />
      )}
    </div>
  );
}
