'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { CheckCircle2, Loader2, LogIn, Plus, XCircle } from 'lucide-react';

export interface AmbienteVisibile {
  nome: string;
  url: string;
}

interface RispostaAmbienti {
  ambienti?: AmbienteVisibile[];
}

interface RispostaEsegui {
  id?: string;
  errore?: string;
}

type StatoAccesso = 'inattivo' | 'avvio' | 'in corso' | 'conclusa' | 'fallita' | 'errore';

/**
 * Un indirizzo scritto come `${NOME_VARIABILE}` e' il nome di una variabile
 * d'ambiente che non e' stata risolta, non un indirizzo vero: mostrarlo cosi'
 * com'e' non dice niente a un tester, e un pulsante "Accedi adesso" su quella
 * riga prometterebbe una strada che non esiste (la richiesta fallirebbe
 * sempre, perche' la variabile dietro non e' impostata).
 */
function variabileNonRisolta(url: string): string | null {
  const corrispondenza = /^\$\{([A-Za-z0-9_]+)\}$/.exec(url.trim());
  return corrispondenza ? corrispondenza[1] : null;
}

/**
 * Una riga dell'elenco Ambienti, con il pulsante che avvia una sessione di
 * accesso manuale per quell'ambiente e ne segue l'esito.
 */
function RigaAmbiente({
  ambiente,
  onSessioneConclusa,
}: {
  ambiente: AmbienteVisibile;
  onSessioneConclusa: () => void;
}) {
  const t = useTranslations('Ambienti');
  const [stato, setStato] = useState<StatoAccesso>('inattivo');
  const [messaggioErrore, setMessaggioErrore] = useState('');
  const sorgenteRef = useRef<EventSource | null>(null);
  const variabile = variabileNonRisolta(ambiente.url);

  useEffect(() => () => sorgenteRef.current?.close(), []);

  const accediAdesso = useCallback(async () => {
    setStato('avvio');
    setMessaggioErrore('');
    try {
      const risposta = await fetch('/api/esegui', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: 'sessione', parametri: { bersaglio: ambiente.nome } }),
      });
      const corpo = (await risposta.json()) as RispostaEsegui;
      if (!risposta.ok || !corpo.id) {
        // La rotta risponde con un no chiaro quando un'altra operazione lunga
        // e' gia' in corso (una sola alla volta occupa il browser): si mostra
        // quel messaggio cosi' com'e', non se ne inventa un altro.
        setStato('errore');
        setMessaggioErrore(corpo.errore ?? t('erroreAvvioAccesso'));
        return;
      }
      setStato('in corso');
      const sorgente = new EventSource(`/api/esegui/${corpo.id}/flusso`);
      sorgenteRef.current = sorgente;
      sorgente.addEventListener('fine', (evento) => {
        const dettagli = JSON.parse((evento as MessageEvent).data) as { stato: string };
        sorgente.close();
        if (dettagli.stato === 'conclusa') {
          setStato('conclusa');
          onSessioneConclusa();
        } else {
          setStato('fallita');
        }
      });
      sorgente.onerror = () => sorgente.close();
    } catch {
      setStato('errore');
      setMessaggioErrore(t('erroreParlareCruscotto'));
    }
  }, [ambiente.nome, onSessioneConclusa, t]);

  return (
    <li
      className="flex max-w-2xl flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
      style={{ borderColor: 'var(--bordo)', background: 'var(--superficie)' }}
    >
      <div className="min-w-0">
        <p className="font-medium break-words" style={{ color: 'var(--testo)' }}>{ambiente.nome}</p>
        <p
          className="text-sm break-words"
          style={{ color: variabile ? 'var(--ambra)' : 'var(--testo-tenue)' }}
        >
          {variabile ? t('indirizzoNonRisolto', { variabile }) : ambiente.url || t('indirizzoNonImpostato')}
        </p>
        <p className="mt-1 text-xs break-words" aria-live="polite">
          {stato === 'avvio' && <span style={{ color: 'var(--testo-tenue)' }}>{t('avvioInCorso')}</span>}
          {stato === 'in corso' && (
            <span className="inline-flex items-center gap-1.5" style={{ color: 'var(--testo-tenue)' }}>
              <Loader2 size={14} className="animate-spin" aria-hidden="true" />
              {t('browserAperto')}
            </span>
          )}
          {stato === 'conclusa' && (
            <span className="inline-flex items-center gap-1.5" style={{ color: 'var(--verde)' }}>
              <CheckCircle2 size={14} aria-hidden="true" />
              {t('sessioneSalvata')}
            </span>
          )}
          {stato === 'fallita' && (
            <span className="inline-flex items-center gap-1.5" style={{ color: 'var(--rosso)' }}>
              <XCircle size={14} aria-hidden="true" />
              {t('nonAndata')}
            </span>
          )}
          {stato === 'errore' && messaggioErrore && (
            <span className="inline-flex items-center gap-1.5" style={{ color: 'var(--rosso)' }}>
              <XCircle size={14} aria-hidden="true" />
              {messaggioErrore}
            </span>
          )}
        </p>
      </div>
      {variabile ? (
        // Nessun pulsante che promette una strada inesistente: l'indirizzo
        // dietro questa riga non risolve a niente finche' la variabile non e'
        // impostata. Il link porta davvero da qualche parte, invece: al
        // riquadro "Configura una credenziale" piu' sotto nella stessa pagina.
        <a
          href="#configura-credenziale-titolo"
          className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-md border px-4 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{ borderColor: 'var(--bordo)', color: 'var(--testo)', outlineColor: 'var(--blu)' }}
        >
          {t('vaiAConfigura')}
        </a>
      ) : (
        <button
          type="button"
          onClick={() => void accediAdesso()}
          disabled={stato === 'avvio' || stato === 'in corso'}
          aria-label={t('accediAria', { nome: ambiente.nome })}
          className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-md px-4 text-sm font-medium text-white disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{ background: 'var(--blu-fondo)', outlineColor: 'var(--blu)' }}
        >
          {stato === 'avvio' || stato === 'in corso' ? (
            <Loader2 size={16} className="animate-spin" aria-hidden="true" />
          ) : (
            <LogIn size={16} aria-hidden="true" />
          )}
          {t('accediAdesso')}
        </button>
      )}
    </li>
  );
}

/**
 * Sezione Ambienti della schermata di controllo: elenca gli ambienti già
 * configurati con il loro indirizzo, permette di aggiungerne uno nuovo (o di
 * correggere l'indirizzo di uno esistente) e, per ciascuno, avvia una
 * sessione di accesso manuale — la sola parte del login che questa finestra
 * costruisce: i passi di accesso automatico restano un lavoro da preparare a
 * mano nel file degli ambienti.
 */
export function SezioneAmbienti({ onCambiato }: { onCambiato?: () => void }) {
  const t = useTranslations('Ambienti');
  const [ambienti, setAmbienti] = useState<AmbienteVisibile[]>([]);
  const [nome, setNome] = useState('');
  const [url, setUrl] = useState('');
  const [inCorso, setInCorso] = useState(false);
  const [messaggio, setMessaggio] = useState<{ ok: boolean; testo: string } | null>(null);

  const carica = useCallback(async () => {
    try {
      const risposta = await fetch('/api/configurazione');
      const corpo = (await risposta.json()) as RispostaAmbienti;
      setAmbienti(corpo.ambienti ?? []);
    } catch {
      setAmbienti([]);
    }
  }, []);

  useEffect(() => {
    void carica();
  }, [carica]);

  async function aggiungi(evento: React.FormEvent) {
    evento.preventDefault();
    setInCorso(true);
    setMessaggio(null);
    try {
      const risposta = await fetch('/api/configurazione/ambienti', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, url }),
      });
      const corpo = (await risposta.json()) as { scritto?: boolean; errore?: string };
      if (risposta.ok && corpo.scritto) {
        setMessaggio({ ok: true, testo: t('ambienteSalvato') });
        setNome('');
        setUrl('');
        await carica();
        onCambiato?.();
      } else {
        setMessaggio({ ok: false, testo: corpo.errore ?? t('nonSalvato') });
      }
    } catch {
      setMessaggio({ ok: false, testo: t('erroreSalvarlo') });
    } finally {
      setInCorso(false);
    }
  }

  const sessioneConclusa = useCallback(() => {
    void carica();
    onCambiato?.();
  }, [carica, onCambiato]);

  return (
    <section
      className="flex flex-col gap-3 rounded-lg border p-4"
      style={{ borderColor: 'var(--bordo)', background: 'var(--superficie)' }}
      aria-labelledby="ambienti-titolo"
    >
      <div>
        <h2 id="ambienti-titolo" className="font-medium" style={{ color: 'var(--testo)' }}>
          {t('titolo')}
        </h2>
        <p className="mt-1 text-sm" style={{ color: 'var(--testo-tenue)' }}>
          {t('descrizione')}
        </p>
      </div>

      {ambienti.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {ambienti.map((a) => (
            <RigaAmbiente key={a.nome} ambiente={a} onSessioneConclusa={sessioneConclusa} />
          ))}
        </ul>
      ) : (
        <p className="text-sm" style={{ color: 'var(--testo-tenue)' }}>
          {t('nessunoConfigurato')}
        </p>
      )}

      <form onSubmit={aggiungi} className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <label htmlFor="ambiente-nome" className="text-sm" style={{ color: 'var(--testo)' }}>
            {t('nomeAmbiente')}
          </label>
          <input
            id="ambiente-nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder={t('placeholderNome')}
            className="min-h-10 min-w-0 rounded-md border px-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ borderColor: 'var(--bordo)', outlineColor: 'var(--blu)' }}
          />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <label htmlFor="ambiente-url" className="text-sm" style={{ color: 'var(--testo)' }}>
            {t('indirizzo')}
          </label>
          <input
            id="ambiente-url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={t('placeholderIndirizzo')}
            className="min-h-10 min-w-0 rounded-md border px-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ borderColor: 'var(--bordo)', outlineColor: 'var(--blu)' }}
          />
        </div>
        <button
          type="submit"
          disabled={!nome || !url || inCorso}
          className="inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-md px-4 text-sm font-medium text-white disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{ background: 'var(--blu-fondo)', outlineColor: 'var(--blu)' }}
        >
          <Plus size={16} aria-hidden="true" />
          {inCorso ? t('salvando') : t('aggiungi')}
        </button>
      </form>

      {messaggio && (
        <p role="status" className="flex items-center gap-1.5 text-sm" style={{ color: messaggio.ok ? 'var(--verde)' : 'var(--rosso)' }}>
          {messaggio.ok ? <CheckCircle2 size={16} aria-hidden="true" /> : <XCircle size={16} aria-hidden="true" />}
          {messaggio.testo}
        </p>
      )}
    </section>
  );
}
