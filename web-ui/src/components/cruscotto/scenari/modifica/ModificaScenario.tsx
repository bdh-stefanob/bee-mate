'use client';

import { useCallback, useRef, useState, type Ref } from 'react';
import { useTranslations } from 'next-intl';
import { Pencil } from 'lucide-react';
import { PannelloScenario } from '../PannelloScenario';
import { PannelloModifica } from './PannelloModifica';
import { CLASSE_BOTTONE } from './stile';
import type { RigaGherkin } from '@/lib/gherkin-lettura';
import type { Focus } from '@/lib/bozza-scenario';
import type { VoceScenario } from '@/lib/scenari-elenco';

/**
 * Il punto di aggancio della modifica nella pagina Scenari (spec A10): mette il
 * pulsante "Modifica" nella riga delle azioni di `PannelloScenario` e, quando e'
 * aperta, sostituisce la lettura con `PannelloModifica`.
 *
 * Due modi di entrare (decisione M11): il pulsante "Modifica", o il clic (o
 * Invio) su un passo o sul titolo nel testo in lettura, che apre la modifica con
 * il fuoco gia' li'. In lettura non si cambia niente per sbaglio: la modifica e'
 * sempre una modalita', con "Controlla e salva" e "Annulla modifiche".
 *
 * Uno scenario non ancora salvato (registrato, in `generated/`) non si modifica
 * da qui: il pannello lo dice, senza un pulsante finto.
 */
export function ModificaScenario({
  voce,
  ambiente,
  titoloRef,
  alTermine,
}: {
  voce: VoceScenario;
  ambiente: string | null;
  titoloRef: Ref<HTMLHeadingElement>;
  /** Una modifica e' stata salvata o annullata: la pagina rilegge l'elenco e aggiorna l'indirizzo. */
  alTermine: (info: { file: string; titolo: string }) => void;
}) {
  const t = useTranslations('ModificaScenario');
  const [aperta, setAperta] = useState<{ focus: Focus | null } | null>(null);
  const bottone = useRef<HTMLButtonElement>(null);

  const chiudi = useCallback(() => {
    setAperta(null);
    // Uscendo dalla modifica il fuoco torna al pulsante "Modifica" (spec A11).
    requestAnimationFrame(() => bottone.current?.focus());
  }, []);

  const termine = useCallback((titolo: string) => alTermine({ file: voce.file, titolo }), [alTermine, voce.file]);

  const suRiga = (r: RigaGherkin) => {
    if (r.tipo === 'passo') setAperta({ focus: { tipo: 'passo', riga: r.numero } });
    else setAperta({ focus: { tipo: 'titolo' } });
  };

  const azioneModifica = voce.generato ? (
    <p className="basis-full text-sm" style={{ color: 'var(--testo-tenue)' }}>
      {t('nonModificabileRegistrato')}
    </p>
  ) : aperta ? null : (
    <button
      ref={bottone}
      type="button"
      aria-label={t('modificaAria', { nome: voce.nome })}
      onClick={() => setAperta({ focus: null })}
      className={`${CLASSE_BOTTONE} flex-1 min-[1100px]:flex-none`}
      style={{ borderColor: 'var(--bordo)', background: 'var(--superficie)', color: 'var(--blu)', outlineColor: 'var(--blu)' }}
    >
      <Pencil size={16} aria-hidden="true" />
      {t('modifica')}
    </button>
  );

  return (
    <PannelloScenario
      voce={voce}
      ambiente={ambiente}
      titoloRef={titoloRef}
      altreAzioni={azioneModifica}
      {...(!voce.generato && !aperta
        ? {
            suRiga,
            nota: t('clicPerModificare'),
            etichettaRiga: (r: RigaGherkin) =>
              r.tipo === 'passo'
                ? t('clicPassoAria', { frase: r.parti.map((p) => p.testo).join('') })
                : t('clicTitoloAria'),
          }
        : {})}
      sostituisciTesto={
        aperta ? <PannelloModifica file={voce.file} focusIniziale={aperta.focus} onEsci={chiudi} onTermine={termine} /> : undefined
      }
    />
  );
}
