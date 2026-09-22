'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, RefreshCw, XCircle } from 'lucide-react';
import { VoceControllo, type VoceDiagnosi } from '@/components/cruscotto/VoceControllo';

interface RispostaControllo {
  pronto: boolean;
  voci: VoceDiagnosi[];
}

type StatoPagina = 'caricamento' | 'errore' | 'pronto';

/** Righe che pulsano al posto del contenuto: uno scheletro, non una rotella sola. */
function ScheletroControllo() {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-2">
      <span className="sr-only">Sto controllando la macchina…</span>
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
 */
function ConfiguraCredenziale({ bersagli }: { bersagli: string[] }) {
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
        setMessaggio({ ok: true, testo: 'salvata' });
        setChiave('');
      } else {
        setMessaggio({ ok: false, testo: corpo.error ?? 'non salvata' });
      }
    } catch {
      setValore('');
      setMessaggio({ ok: false, testo: 'non sono riuscito a salvarla' });
    } finally {
      setInCorso(false);
    }
  }

  return (
    <section
      className="rounded-lg border p-4"
      style={{ borderColor: 'var(--bordo)', background: 'var(--superficie)' }}
      aria-labelledby="configura-credenziale-titolo"
    >
      <h2 id="configura-credenziale-titolo" className="font-medium" style={{ color: 'var(--testo)' }}>
        Configura una credenziale
      </h2>
      <p className="mt-1 text-sm" style={{ color: 'var(--testo-tenue)' }}>
        {bersagli.length > 0
          ? `Ambienti noti: ${bersagli.join(', ')}.`
          : 'Nessun ambiente configurato ancora: la voce Ambienti qui sopra dice come iniziare.'}
      </p>

      <form onSubmit={salva} className="mt-3 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <label htmlFor="credenziale-chiave" className="text-sm" style={{ color: 'var(--testo)' }}>
            Nome variabile
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
            Valore
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
          {inCorso ? 'Salvo…' : 'Salva'}
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
  const [stato, setStato] = useState<StatoPagina>('caricamento');
  const [dati, setDati] = useState<RispostaControllo | null>(null);
  const [bersagli, setBersagli] = useState<string[]>([]);

  const carica = useCallback(async () => {
    setStato('caricamento');
    try {
      const risposta = await fetch('/api/controllo');
      const corpo = (await risposta.json()) as RispostaControllo;
      if (!risposta.ok) {
        setStato('errore');
        return;
      }
      setDati(corpo);
      setStato('pronto');
    } catch {
      setStato('errore');
    }
  }, []);

  useEffect(() => {
    carica();
  }, [carica]);

  useEffect(() => {
    let attivo = true;
    fetch('/api/configurazione')
      .then((r) => r.json())
      .then((corpo: { bersagli?: string[] }) => {
        if (attivo) setBersagli(corpo.bersagli ?? []);
      })
      .catch(() => {
        if (attivo) setBersagli([]);
      });
    return () => {
      attivo = false;
    };
  }, []);

  const mancanti = dati ? dati.voci.filter((v) => v.esito !== 'ok').length : 0;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <h1 className="text-xl font-semibold" style={{ color: 'var(--testo)' }}>
        Controllo
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
            Non sono riuscito a controllare la macchina
          </p>
          <button
            type="button"
            onClick={carica}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-md px-4 text-sm font-medium text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ background: 'var(--blu-fondo)', outlineColor: 'var(--blu)' }}
          >
            <RefreshCw size={16} aria-hidden="true" />
            Riprova
          </button>
        </div>
      )}

      {stato === 'pronto' && dati && (
        <>
          <div
            role="status"
            className="flex items-center gap-2 rounded-lg border p-3 font-medium"
            style={{
              borderColor: dati.pronto ? 'var(--verde)' : 'var(--rosso)',
              color: dati.pronto ? 'var(--verde)' : 'var(--rosso)',
              background: 'var(--superficie)',
            }}
          >
            {dati.pronto ? (
              <CheckCircle2 size={22} aria-hidden="true" />
            ) : (
              <AlertTriangle size={22} aria-hidden="true" />
            )}
            {dati.pronto ? 'Pronto' : `Mancano ${mancanti} cose`}
          </div>

          <ul className="flex flex-col gap-2">
            {dati.voci.map((voce) => (
              <VoceControllo key={voce.nome} voce={voce} onRimediato={carica} />
            ))}
          </ul>

          <ConfiguraCredenziale bersagli={bersagli} />
        </>
      )}
    </div>
  );
}
