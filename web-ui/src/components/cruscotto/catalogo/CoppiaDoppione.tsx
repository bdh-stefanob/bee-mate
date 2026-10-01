'use client';

import { useEffect, useId, useState } from 'react';
import { useTranslations } from 'next-intl';
import { AlertTriangle, GitMerge, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { chiediAnteprimaFusione, inviaFusione } from '@/lib/azioni-catalogo';
import type { CoppiaArricchita } from '@/lib/catalogo-numeri';
import { percorsoScenario } from '@/lib/percorso-scenario';
import { CoppiaLato } from './CoppiaLato';
import type { AnteprimaFusione, EsitoOperazione } from './tipi';

/**
 * Doppione: stesso componente dietro due frasi. Si fa in TRE PASSI numerati
 * nella stessa scheda, il secondo e il terzo nascosti finche' il precedente non
 * e' fatto: 1 quale frase tieni, 2 cosa succede (l'anteprima), 3 conferma.
 *
 * Se i due gestori non fanno la stessa cosa, il confronto resta IN VISTA
 * (decisione Q2 del proprietario, 2026-10-01): chi sta per perdere un
 * comportamento lo deve poter leggere. L'eccezione alla regola "il tester non
 * vede codice" vale solo qui: le colonne hanno un'intestazione in parole
 * semplici, c'e' una riga che dice cosa sono, e nessun percorso di file.
 */
export function CoppiaDoppione({
  coppia,
  onFatto,
}: {
  coppia: CoppiaArricchita;
  onFatto: (esito: Omit<EsitoOperazione, 'id'>) => void;
}) {
  const t = useTranslations('Catalogo');
  const nome = useId();
  const [vincente, setVincente] = useState<'a' | 'b' | null>(null);
  const [anteprima, setAnteprima] = useState<AnteprimaFusione | null>(null);
  const [caricamento, setCaricamento] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [capito, setCapito] = useState(false);
  const [inCorso, setInCorso] = useState(false);
  const [fallita, setFallita] = useState<string | null>(null);

  const fraseTenuta = vincente ? coppia[vincente].espressione : null;
  const frasePersa = vincente ? coppia[vincente === 'a' ? 'b' : 'a'].espressione : null;

  // "piu' usata" e' un suggerimento, non una decisione: solo se uno dei due lo e' davvero di piu'.
  const usiA = coppia.a.usatoIn.length;
  const usiB = coppia.b.usatoIn.length;
  const piuUsata: 'a' | 'b' | null = usiA > usiB ? 'a' : usiB > usiA ? 'b' : null;

  useEffect(() => {
    setAnteprima(null);
    setErrore(null);
    setCapito(false);
    setFallita(null);
    if (!fraseTenuta || !frasePersa) return;
    let annullato = false;
    setCaricamento(true);
    chiediAnteprimaFusione(frasePersa, fraseTenuta)
      .then((corpo) => {
        if (!annullato) setAnteprima(corpo);
      })
      .catch((err) => {
        if (!annullato) setErrore(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!annullato) setCaricamento(false);
      });
    return () => {
      annullato = true;
    };
  }, [fraseTenuta, frasePersa]);

  async function fondi() {
    if (!fraseTenuta || !frasePersa || !anteprima) return;
    setInCorso(true);
    setFallita(null);
    const risultato = await inviaFusione(frasePersa, fraseTenuta, !anteprima.equivalenti);
    setInCorso(false);
    if (risultato.ok) {
      onFatto({
        tipo: 'fusione',
        da: frasePersa,
        a: fraseTenuta,
        righe: anteprima.righeCoinvolte,
        catalogoRigenerato: risultato.catalogoRigenerato,
        annullabile: true,
      });
    } else {
      setFallita(t('fusioneFallita', { dettaglio: risultato.errore ?? '' }));
    }
  }

  return (
    <div className="rounded-lg border p-4" style={{ borderColor: 'var(--ambra)', background: 'var(--superficie)' }}>
      <div className="flex items-start gap-2">
        <GitMerge size={18} aria-hidden="true" style={{ color: 'var(--ambra)' }} className="mt-0.5 shrink-0" />
        <div className="flex-1">
          <h3 className="font-medium" style={{ color: 'var(--testo)' }}>
            {t('doppioneTitolo')}
          </h3>
          <p className="text-sm" style={{ color: 'var(--testo-tenue)' }}>
            {t('doppioneSpiegazione')}
          </p>
        </div>
      </div>

      <fieldset className="mt-3 flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium" style={{ color: 'var(--testo)' }}>
          {t('passo1Tieni')}
        </legend>
        {(['a', 'b'] as const).map((l) => (
          <CoppiaLato
            key={l}
            lato={coppia[l]}
            piuUsata={piuUsata === l}
            scelta={{ nome, selezionata: vincente === l, onSeleziona: () => setVincente(l) }}
          />
        ))}
      </fieldset>

      {vincente && (
        <section className="mt-4 flex flex-col gap-3" aria-live="polite">
          <h4 className="text-sm font-medium" style={{ color: 'var(--testo)' }}>
            {t('passo2Succede')}
          </h4>

          {caricamento && (
            <p className="flex items-center gap-2 text-sm" style={{ color: 'var(--testo-tenue)' }}>
              <Loader2 className="animate-spin motion-reduce:animate-none" size={14} aria-hidden="true" />
              {t('fraseCaricamentoAnteprima')}
            </p>
          )}
          {errore && (
            <p role="alert" className="text-sm" style={{ color: 'var(--rosso)' }}>
              {t('anteprimaErrore', { dettaglio: errore })}
            </p>
          )}

          {anteprima && frasePersa && fraseTenuta && (
            <>
              <div className="rounded-md border p-3 text-sm" style={{ borderColor: 'var(--bordo)', background: 'var(--superficie-tenue)' }}>
                <p style={{ color: 'var(--testo)' }}>{t('anteprimaRighe', { righe: anteprima.righeCoinvolte, frase: frasePersa })}</p>
                {anteprima.scenariCoinvolti.length > 0 && (
                  <ul className="mt-1 flex list-inside list-disc flex-col gap-0.5" style={{ color: 'var(--testo-tenue)' }}>
                    {anteprima.scenariCoinvolti.map((u, i) => {
                      const { app, flusso } = percorsoScenario(u.file);
                      return <li key={i}>{t('scenarioInFlusso', { scenario: u.scenario, app, flusso })}</li>;
                    })}
                  </ul>
                )}
              </div>

              {anteprima.equivalenti ? (
                <p className="text-sm" style={{ color: 'var(--testo-tenue)' }}>
                  {t('corpiUguali')}
                </p>
              ) : (
                <div className="rounded-md border p-3" style={{ borderColor: 'var(--rosso)', background: 'var(--superficie)' }}>
                  <p className="flex items-center gap-2 font-medium" style={{ color: 'var(--rosso)' }}>
                    <AlertTriangle size={16} aria-hidden="true" />
                    {t('corpiDiversiTitolo')}
                  </p>
                  <p className="mt-1 text-sm" style={{ color: 'var(--testo)' }}>
                    {t('corpiDiversiSpiegazione', { frase: frasePersa })}
                  </p>
                  <p className="mt-1 text-sm" style={{ color: 'var(--testo-tenue)' }}>
                    {t('corpiDiversiSuggerimento')}
                  </p>
                  <p className="mt-2 text-sm" style={{ color: 'var(--testo-tenue)' }}>
                    {t('confrontoSpiegazione')}
                  </p>
                  <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <Confronto titolo={t('confrontoA', { frase: fraseTenuta })} corpo={anteprima.corpoA} />
                    <Confronto titolo={t('confrontoDa', { frase: frasePersa })} corpo={anteprima.corpoDa} />
                  </div>
                  <label className="mt-3 flex min-h-10 cursor-pointer items-start gap-2 text-sm" style={{ color: 'var(--testo)' }}>
                    <input
                      type="checkbox"
                      checked={capito}
                      onChange={(e) => setCapito(e.target.checked)}
                      className="mt-0.5 size-4 shrink-0"
                    />
                    {t('confermaCapito', { frase: frasePersa })}
                  </label>
                </div>
              )}
            </>
          )}
        </section>
      )}

      {vincente && anteprima && fraseTenuta && (
        <section className="mt-4 flex flex-col gap-2">
          <h4 className="text-sm font-medium" style={{ color: 'var(--testo)' }}>
            {t('passo3Conferma')}
          </h4>
          {/* Il testo con i nomi in chiaro e' lungo: a capo, a tutta larghezza sullo schermo stretto. */}
          <Button
            onClick={fondi}
            disabled={inCorso || (!anteprima.equivalenti && !capito)}
            variant={anteprima.equivalenti ? 'default' : 'destructive'}
            className="h-auto min-h-10 w-full whitespace-normal py-2 text-left sm:w-auto"
          >
            {inCorso ? (
              <Loader2 className="animate-spin motion-reduce:animate-none" size={16} aria-hidden="true" />
            ) : anteprima.equivalenti ? (
              <GitMerge size={16} aria-hidden="true" />
            ) : (
              <AlertTriangle size={16} aria-hidden="true" />
            )}
            {anteprima.equivalenti ? t('fondiTieni', { frase: fraseTenuta }) : t('fondiComunque')}
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

function Confronto({ titolo, corpo }: { titolo: string; corpo: string | null }) {
  return (
    <div className="rounded-md border p-2" style={{ borderColor: 'var(--bordo)', background: 'var(--superficie-tenue)' }}>
      <p className="mb-1 text-xs font-medium" style={{ color: 'var(--testo)' }}>
        {titolo}
      </p>
      <pre className="whitespace-pre-wrap break-words font-mono text-xs" style={{ color: 'var(--testo)' }}>
        {corpo ?? ''}
      </pre>
    </div>
  );
}
