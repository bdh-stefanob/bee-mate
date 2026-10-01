'use client';

import { useId, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2, Signpost } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { inviaRiconciliazione } from '@/lib/azioni-catalogo';
import type { CoppiaArricchita } from '@/lib/catalogo-numeri';
import { percorsoScenario } from '@/lib/percorso-scenario';
import { CoppiaLato } from './CoppiaLato';
import type { EsitoOperazione } from './tipi';

/**
 * Equivoco di denominazione: stessa frase (quasi), componenti diversi. Il
 * gesto e' distinguere, mai fondere. Tre passi: 1 quale frase rinomini, 2 la
 * nuova frase (precompilata come prima: `frase (nome del componente)`) con
 * "cosa succede", 3 il pulsante.
 *
 * Non esiste "Annulla" per questo gesto (la rotta `riconcilia` non salva
 * niente: decisione Q4): lo si dichiara al passo 2, prima di premere.
 */
export function CoppiaEquivoco({
  coppia,
  onFatto,
}: {
  coppia: CoppiaArricchita;
  onFatto: (esito: Omit<EsitoOperazione, 'id'>) => void;
}) {
  const t = useTranslations('Catalogo');
  const nome = useId();
  const idCampo = useId();
  const [lato, setLato] = useState<'a' | 'b' | null>(null);
  const [nuovaFrase, setNuovaFrase] = useState('');
  const [inCorso, setInCorso] = useState(false);
  const [fallita, setFallita] = useState<string | null>(null);

  const originale = lato ? coppia[lato] : null;
  const nuova = nuovaFrase.trim();
  const valida = !!originale && nuova.length > 0 && nuova !== originale.espressione;

  function scegli(l: 'a' | 'b') {
    setLato(l);
    setFallita(null);
    const s = coppia[l];
    const nomeComponente = s.componenti[0]?.name;
    setNuovaFrase(nomeComponente ? `${s.espressione} (${nomeComponente})` : s.espressione);
  }

  async function conferma() {
    if (!originale || !valida) return;
    setInCorso(true);
    setFallita(null);
    const risultato = await inviaRiconciliazione(originale.espressione, nuova);
    setInCorso(false);
    if (risultato.ok) {
      onFatto({ tipo: 'distinzione', da: originale.espressione, a: nuova, righe: originale.usatoIn.length, annullabile: false });
    } else {
      setFallita(t('riconciliazioneFallita', { dettaglio: risultato.errore ?? '' }));
    }
  }

  return (
    <div className="rounded-lg border p-4" style={{ borderColor: 'var(--rosso)', background: 'var(--superficie)' }}>
      <div className="flex items-start gap-2">
        <Signpost size={18} aria-hidden="true" style={{ color: 'var(--rosso)' }} className="mt-0.5 shrink-0" />
        <div className="flex-1">
          <h3 className="font-medium" style={{ color: 'var(--testo)' }}>
            {t('equivocoTitolo')}
          </h3>
          <p className="text-sm" style={{ color: 'var(--testo-tenue)' }}>
            {t('equivocoSpiegazione')}
          </p>
        </div>
      </div>

      <fieldset className="mt-3 flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium" style={{ color: 'var(--testo)' }}>
          {t('passo1Rinomina')}
        </legend>
        {(['a', 'b'] as const).map((l) => (
          <CoppiaLato key={l} lato={coppia[l]} scelta={{ nome, selezionata: lato === l, onSeleziona: () => scegli(l) }} />
        ))}
      </fieldset>

      {originale && (
        <section className="mt-4 flex flex-col gap-2">
          <h4 className="text-sm font-medium" style={{ color: 'var(--testo)' }}>
            {t('passo2NuovaFrase')}
          </h4>
          <label htmlFor={idCampo} className="text-sm" style={{ color: 'var(--testo-tenue)' }}>
            {t('nuovaFraseLabel')}
          </label>
          <input
            id={idCampo}
            type="text"
            value={nuovaFrase}
            onChange={(e) => setNuovaFrase(e.target.value)}
            className="min-h-10 rounded-md border px-3 font-mono text-xs focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ borderColor: 'var(--bordo)', background: 'var(--superficie-tenue)', color: 'var(--testo)', outlineColor: 'var(--blu)' }}
          />
          <div className="rounded-md border p-3 text-sm" style={{ borderColor: 'var(--bordo)', background: 'var(--superficie-tenue)' }}>
            <p className="font-medium" style={{ color: 'var(--testo)' }}>
              {t('cosaCambieraTitolo')}
            </p>
            <p style={{ color: 'var(--testo-tenue)' }}>
              {t('cosaCambieraEquivoco', { righe: originale.usatoIn.length, frase: originale.espressione })}
            </p>
            {originale.usatoIn.length > 0 && (
              <ul className="mt-1 flex list-inside list-disc flex-col gap-0.5" style={{ color: 'var(--testo-tenue)' }}>
                {originale.usatoIn.map((u, i) => {
                  const { app, flusso } = percorsoScenario(u.file);
                  return <li key={i}>{t('scenarioInFlusso', { scenario: u.scenario, app, flusso })}</li>;
                })}
              </ul>
            )}
          </div>
          <p className="text-sm font-medium" style={{ color: 'var(--testo)' }}>
            {t('distinguiNonAnnullabile')}
          </p>
        </section>
      )}

      {originale && (
        <section className="mt-4 flex flex-col gap-2">
          <h4 className="text-sm font-medium" style={{ color: 'var(--testo)' }}>
            {t('passo3Conferma')}
          </h4>
          <Button
            onClick={conferma}
            disabled={!valida || inCorso}
            className="h-auto min-h-10 w-full whitespace-normal py-2 text-left sm:w-auto"
          >
            {inCorso ? (
              <Loader2 className="animate-spin motion-reduce:animate-none" size={16} aria-hidden="true" />
            ) : (
              <Signpost size={16} aria-hidden="true" />
            )}
            {t('distinguiPulsante', { frase: originale.espressione })}
          </Button>
          {fallita && (
            <p role="alert" className="text-sm" style={{ color: 'var(--rosso)' }}>
              {fallita}
            </p>
          )}
        </section>
      )}
    </div>
  );
}
