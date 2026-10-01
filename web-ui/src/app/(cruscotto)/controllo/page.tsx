'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { AlertTriangle, CheckCircle2, RefreshCw, XCircle } from 'lucide-react';
import { VoceControllo } from '@/components/cruscotto/VoceControllo';
import { SezioneAmbienti } from '@/components/cruscotto/SezioneAmbienti';
import { useRisorsa } from '@/hooks/useRisorsa';
import { diagnosi, dopoUnaModifica, type Diagnosi } from '@/lib/stato-controllo';
import type { Istantanea } from '@/lib/risorsa';

const tutta = (i: Istantanea<Diagnosi>): Istantanea<Diagnosi> => i;
const riprova = (): void => void diagnosi.carica();

/** Righe che pulsano al posto del contenuto: uno scheletro, non una rotella sola. */
function ScheletroControllo() {
  const t = useTranslations('Controllo');
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-2">
      <span className="sr-only">{t('controllando')}</span>
      <div
        className="h-12 animate-pulse rounded-lg"
        style={{ background: 'var(--superficie-tenue)' }}
        aria-hidden="true"
      />
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="h-16 animate-pulse rounded-lg border"
          style={{ borderColor: 'var(--bordo)', background: 'var(--superficie-tenue)' }}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

/**
 * Scrive una credenziale in .env senza aprire il file. Il valore non torna mai
 * indietro dalla rotta: dopo l'invio il campo si svuota comunque, riuscito o no.
 *
 * E' il riquadro "avanzato": la credenziale di un ambiente si compila ormai
 * nella sua riga, dentro la sezione Ambienti (guarda i dati: `requiredVars`
 * dice quali variabili appartengono a un ambiente). Questo riquadro resta per
 * il resto — variabili che non appartengono a nessun ambiente, come i token
 * di Jira o Confluence usati dagli script di sincronizzazione.
 */
function ConfiguraCredenziale() {
  const t = useTranslations('Controllo');
  const [chiave, setChiave] = useState('');
  const [valore, setValore] = useState('');
  const [inCorso, setInCorso] = useState(false);
  const [messaggio, setMessaggio] = useState<{ ok: boolean; testo: string } | null>(null);

  async function salva(evento: React.FormEvent) {
    evento.preventDefault();
    setInCorso(true);
    setMessaggio(null);
    try {
      const risposta = await fetch('/api/configurazione', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chiave, valore }),
      });
      const corpo = (await risposta.json()) as { scritta?: boolean; error?: string };
      setValore('');
      if (risposta.ok && corpo.scritta) {
        setMessaggio({ ok: true, testo: t('salvataOk') });
        setChiave('');
      } else {
        setMessaggio({ ok: false, testo: corpo.error ?? t('salvataErrore') });
      }
    } catch {
      setValore('');
      setMessaggio({ ok: false, testo: t('salvataEccezione') });
    } finally {
      setInCorso(false);
    }
  }

  return (
    <section aria-labelledby="configura-credenziale-titolo">
      <h2 id="configura-credenziale-titolo" className="font-medium" style={{ color: 'var(--testo)' }}>
        {t('credenzialeTitolo')}
      </h2>
      <p className="mt-1 text-sm" style={{ color: 'var(--testo-tenue)' }}>
        {t('credenzialeDescrizione')}
      </p>

      <form onSubmit={salva} className="mt-3 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <label htmlFor="credenziale-chiave" className="text-sm" style={{ color: 'var(--testo)' }}>
            {t('nomeVariabile')}
          </label>
          <input
            id="credenziale-chiave"
            value={chiave}
            onChange={(e) => setChiave(e.target.value.toUpperCase())}
            placeholder="ES_UTENTE"
            className="min-h-10 min-w-0 rounded-md border px-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ borderColor: 'var(--bordo)', outlineColor: 'var(--blu)' }}
          />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <label htmlFor="credenziale-valore" className="text-sm" style={{ color: 'var(--testo)' }}>
            {t('valore')}
          </label>
          <input
            id="credenziale-valore"
            type="password"
            autoComplete="off"
            value={valore}
            onChange={(e) => setValore(e.target.value)}
            className="min-h-10 min-w-0 rounded-md border px-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ borderColor: 'var(--bordo)', outlineColor: 'var(--blu)' }}
          />
        </div>
        <button
          type="submit"
          disabled={!chiave || !valore || inCorso}
          className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-md px-4 text-sm font-medium text-white disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{ background: 'var(--blu-fondo)', outlineColor: 'var(--blu)' }}
        >
          {inCorso ? t('salvando') : t('salva')}
        </button>
      </form>

      {messaggio && (
        <p role="status" className="mt-2 flex items-center gap-1.5 text-sm" style={{ color: messaggio.ok ? 'var(--verde)' : 'var(--rosso)' }}>
          {messaggio.ok ? <CheckCircle2 size={16} aria-hidden="true" /> : <XCircle size={16} aria-hidden="true" />}
          {messaggio.testo}
        </p>
      )}
    </section>
  );
}

export default function ControlloPage() {
  const t = useTranslations('Controllo');
  // La diagnosi vive fuori dalla pagina (`lib/stato-controllo.ts`). Una
  // rilettura dopo una modifica (un ambiente aggiunto, un rimedio lanciato) non
  // svuota la pagina: le voci di prima restano, segnate come in aggiornamento,
  // finche' non arrivano le nuove — e quelle che non sono cambiate non si
  // ridisegnano nemmeno. Tornando su questa schermata si ritrova subito
  // l'ultima diagnosi, invece dello scheletro.
  const { stato, dati, aggiornando } = useRisorsa(diagnosi, tutta);

  // Tutto cio' che segue e' DERIVATO dalle voci: si calcola, non si tiene in
  // uno stato a parte, e si ricalcola solo quando le voci cambiano davvero.
  const riepilogo = useMemo(() => {
    const voci = dati?.voci ?? [];
    // Le voci "avanzate" riguardano chi ha costruito lo strumento (l'assistente
    // da riga di comando, gli agenti che sincronizzano le regole): un tester non
    // ne ha bisogno per lavorare, quindi non contano per "pronto" e stanno in
    // una sezione a parte, richiudibile.
    const essenziali = voci.filter((v) => !v.avanzata);
    const avanzate = voci.filter((v) => v.avanzata);
    // (F11) Cio' che nasce usando l'applicazione non e' un guasto: un riquadro
    // neutro con l'avanzamento, non un rosso.
    const daUso = essenziali.filter((v) => v.daUso);
    const daUsoFatte = daUso.filter((v) => v.esito !== 'manca').length;
    return {
      essenziali,
      avanzate,
      // Due conteggi separati, e non e' pignoleria: prima ce n'era uno solo che
      // sommava le mancanze agli avvisi, mentre il verdetto "pronto" guardava solo
      // le mancanze. Cosi' la riga in cima mostrava una spunta verde accanto alla
      // scritta "mancano 2 cose" — l'icona diceva una cosa e le parole un'altra.
      mancanti: essenziali.filter((v) => v.esito === 'manca' && !v.daUso).length,
      daGuardare: essenziali.filter((v) => v.esito === 'attenzione').length,
      daUsoTotale: daUso.length,
      daUsoFatte,
      perIniziare: daUso.length > 0 && daUsoFatte < daUso.length,
    };
  }, [dati]);
  const { essenziali, avanzate, mancanti, daGuardare, daUsoTotale, daUsoFatte, perIniziare } = riepilogo;

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <h1 className="text-xl font-semibold" style={{ color: 'var(--testo)' }}>
        {t('titolo')}
      </h1>

      {stato === 'caricamento' && <ScheletroControllo />}

      {stato === 'errore' && (
        <div
          role="alert"
          className="flex flex-col items-start gap-3 rounded-lg border p-4"
          style={{ borderColor: 'var(--rosso)', background: 'var(--superficie)' }}
        >
          <p className="flex items-center gap-2 font-medium" style={{ color: 'var(--rosso)' }}>
            <XCircle size={20} aria-hidden="true" />
            {t('erroreTitolo')}
          </p>
          <button
            type="button"
            onClick={riprova}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-md px-4 text-sm font-medium text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ background: 'var(--blu-fondo)', outlineColor: 'var(--blu)' }}
          >
            <RefreshCw size={16} aria-hidden="true" />
            {t('riprova')}
          </button>
        </div>
      )}

      {stato === 'pronto' && dati && (
        <div className="flex flex-col gap-4" aria-busy={aggiornando}>
          <div
            role="status"
            className="flex items-center gap-2 rounded-lg border p-3 font-medium"
            style={{
              borderColor: dati.pronto ? (perIniziare ? 'var(--blu)' : 'var(--verde)') : 'var(--rosso)',
              color: dati.pronto ? (perIniziare ? 'var(--blu)' : 'var(--verde)') : 'var(--rosso)',
              background: 'var(--superficie)',
            }}
          >
            {dati.pronto ? (
              <CheckCircle2 size={22} aria-hidden="true" />
            ) : (
              <AlertTriangle size={22} aria-hidden="true" />
            )}
            {mancanti > 0
              ? t('statoMancante', { mancanti })
              : daGuardare > 0
                ? t('statoDaGuardare', { daGuardare })
                : perIniziare
                  ? t('statoPerIniziare', { fatte: daUsoFatte, totale: daUsoTotale })
                  : t('statoPronto')}
          </div>

          <ul className="flex flex-col gap-2">
            {essenziali.map((voce) => (
              <VoceControllo key={voce.chiaveNome} voce={voce} onRimediato={dopoUnaModifica} />
            ))}
          </ul>

          {avanzate.length > 0 && (
            <details className="rounded-lg border" style={{ borderColor: 'var(--bordo)', background: 'var(--superficie)' }}>
              <summary
                className="min-h-10 cursor-pointer select-none rounded-lg px-3 py-2 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{ color: 'var(--testo)', outlineColor: 'var(--blu)' }}
              >
                {t('avanzate', { n: avanzate.length })}
              </summary>
              <ul className="flex flex-col gap-2 p-3 pt-0">
                {avanzate.map((voce) => (
                  <VoceControllo key={voce.chiaveNome} voce={voce} onRimediato={dopoUnaModifica} />
                ))}
              </ul>
            </details>
          )}
        </div>
      )}

      {/* Ambienti e credenziali non dipendono dalla diagnosi: si mostrano subito,
          invece di aspettare quasi un secondo che la macchina sia stata controllata. */}
      <SezioneAmbienti />

      <details className="rounded-lg border" style={{ borderColor: 'var(--bordo)', background: 'var(--superficie)' }}>
        <summary
          className="min-h-10 cursor-pointer select-none rounded-lg px-3 py-2 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{ color: 'var(--testo)', outlineColor: 'var(--blu)' }}
        >
          {t('credenzialeApri')}
        </summary>
        <div className="p-3 pt-0">
          <ConfiguraCredenziale />
        </div>
      </details>
    </div>
  );
}
