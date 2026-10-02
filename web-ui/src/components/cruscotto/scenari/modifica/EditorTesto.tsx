'use client';

import dynamic from 'next/dynamic';
import type { CSSProperties } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';

/**
 * Il testo avanzato di uno scenario (spec A9): `GherkinEditor` (CodeMirror) dentro il
 * pannello di modifica, per chi sa scrivere un file di scenario.
 *
 * Si carica con `next/dynamic` e senza rendering sul server: CodeMirror pesa, e la pagina
 * Scenari non se lo deve portare dietro finche' nessuno apre il testo. Le espressioni per
 * l'autocompletamento e per sottolineare i passi sconosciuti sono quelle del catalogo
 * che il server manda con la lettura dello scenario (`Contenuto.espressioni`): solo i
 * passi realizzati. Non c'e' nessun gestore di proposte: un passo nuovo non si crea da
 * qui, e un clic su un passo sconosciuto non si inghiotte.
 *
 * L'editor usa i colori del cruscotto, non quelli del vecchio portale: qui sotto si
 * rimappano le variabili che `GherkinEditor` legge sui token del cruscotto, chiari e scuri.
 */
const GherkinEditor = dynamic(() => import('@/components/GherkinEditor'), {
  ssr: false,
  loading: () => <CaricamentoEditor />,
});

function CaricamentoEditor() {
  const t = useTranslations('ModificaScenario');
  return (
    <p role="status" className="flex items-center gap-2 text-sm" style={{ color: 'var(--testo-tenue)' }}>
      <Loader2 size={16} aria-hidden="true" className="animate-spin motion-reduce:animate-none" />
      {t('caricamento')}
    </p>
  );
}

const TOKEN_DEL_CRUSCOTTO = {
  '--background': 'var(--superficie)',
  '--foreground': 'var(--testo)',
  '--muted': 'var(--superficie-tenue)',
  '--muted-foreground': 'var(--testo-tenue)',
  '--border': 'var(--bordo)',
  '--accent': 'var(--superficie-tenue)',
} as CSSProperties;

export function EditorTesto({
  testo,
  espressioni,
  occupato,
  onCambia,
}: {
  testo: string;
  /** Le frasi dei passi che esistono nel catalogo (realizzati). */
  espressioni: string[];
  /** Si sta controllando o salvando: il testo non si muove sotto le dita (la bozza ignorerebbe cio' che si scrive). */
  occupato: boolean;
  onCambia: (testo: string) => void;
}) {
  const t = useTranslations('ModificaScenario');
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm" style={{ color: 'var(--testo-tenue)' }}>
        {t('testoAvvertenza')}
      </p>
      {/* Il riquadro scorre da solo: mai la pagina in orizzontale. `inert` = niente fuoco ne' scrittura finche' si controlla. */}
      <div
        className="min-w-0 overflow-x-auto"
        style={TOKEN_DEL_CRUSCOTTO}
        aria-busy={occupato}
        inert={occupato}
      >
        <GherkinEditor
          value={testo}
          onChange={onCambia}
          stepExpressions={espressioni}
          etichetta={t('testoAria')}
          etichettaPassoSconosciuto={t('testoSconosciuto')}
        />
      </div>
    </div>
  );
}
