'use client';

import { useId } from 'react';
import { useTranslations } from 'next-intl';
import { FileText, FolderInput, ListChecks, Trash2 } from 'lucide-react';
import { Bottone } from './stile';

/**
 * "Avanzate" (spec A5, A9): cio' che la modifica guidata non fa o fa in un altro modo.
 * Il testo, per chi sa come e' scritto uno scenario; e, per uno scenario semplice, spostarlo
 * in un altro flusso o eliminarlo. Un `<details>`: si apre con Invio o Spazio, e chi non ne
 * ha bisogno non lo vede aperto.
 *
 * Per un file con piu' scenari la modifica guidata e' spenta (resta il testo), e si dice
 * perche' non si elimina da qui: un pulsante spento senza spiegazione non dice niente.
 */
export function Avanzate({
  modo,
  semplice,
  puoiTornareGuidata,
  occupato,
  aperto,
  onApriTesto,
  onTornaGuidata,
  onSposta,
  onElimina,
}: {
  modo: 'guidata' | 'testo';
  /** Lo scenario e' semplice (un solo scenario, niente esempi ne' tabelle): si puo' spostare ed eliminare. */
  semplice: boolean;
  /** Il testo di adesso e' ancora semplice: la guidata lo riprende. */
  puoiTornareGuidata: boolean;
  occupato: boolean;
  /** Aperto d'ufficio (per esempio perche' il testo e' l'unico modo). */
  aperto: boolean;
  onApriTesto: () => void;
  onTornaGuidata: () => void;
  onSposta: () => void;
  onElimina: () => void;
}) {
  const t = useTranslations('ModificaScenario');
  const id = useId();
  return (
    <details className="rounded-scheda border border-bordo" open={aperto || undefined}>
      <summary
        className="flex min-h-10 cursor-pointer items-center gap-2 px-3 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 text-testo outline-blu"
      >
        <ListChecks size={16} aria-hidden="true" />
        {t('avanzate')}
      </summary>
      <div className="flex flex-col gap-3 px-3 pb-3">
        <div className="flex flex-wrap gap-2">
          {modo === 'guidata' ? (
            <Bottone disabled={occupato} onClick={onApriTesto}>
              <FileText size={16} aria-hidden="true" />
              {t('testoAvanzato')}
            </Bottone>
          ) : (
            <Bottone disabled={occupato || !puoiTornareGuidata} aria-describedby={puoiTornareGuidata ? undefined : `${id}-spenta`} onClick={onTornaGuidata}>
              {t('tornaGuidata')}
            </Bottone>
          )}
          {semplice && (
            <>
              <Bottone disabled={occupato} onClick={onSposta}>
                <FolderInput size={16} aria-hidden="true" />
                {t('sposta')}
              </Bottone>
              <Bottone disabled={occupato} onClick={onElimina}>
                <Trash2 size={16} aria-hidden="true" />
                {t('elimina')}
              </Bottone>
            </>
          )}
        </div>
        {modo === 'testo' && !puoiTornareGuidata && (
          <p id={`${id}-spenta`} className="text-sm text-testo-tenue">
            {t('guidataSpenta')}
          </p>
        )}
        {!semplice && (
          <p className="text-sm text-testo-tenue">
            {t('eliminaComplesso')}
          </p>
        )}
      </div>
    </details>
  );
}
