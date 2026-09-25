'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { CheckCircle2, CircleDot, KeyRound, Loader2, LogIn, Pencil, Plus, Trash2, XCircle } from 'lucide-react';
import { notificaAmbientiCambiati } from '@/lib/eventi-ambienti';

export interface AmbienteVisibile {
  nome: string;
  url: string;
  /** Ha gia' un blocco di accesso (scritto a mano o derivato da una registrazione)? */
  haLogin?: boolean;
  /** I nomi ${VAR} che questo ambiente referenzia (url compreso). Mai i valori. */
  variabiliRichieste?: string[];
  /** Il sottoinsieme di sopra che non e' ancora in .env. Mai i valori. */
  variabiliMancanti?: string[];
  /** C'e' gia' un file di sessione salvato su disco per questo ambiente? */
  haSessione?: boolean;
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
 * Un indirizzo scritto come `${NOME_VARIABILE}` referenzia una variabile
 * d'ambiente invece di un indirizzo letterale. Lo stesso pattern esatto
 * (`[A-Z][A-Z0-9_]*`) usato da `CHIAVE_VALIDA` in `lib/configurazione.ts` per
 * i nomi di variabile: prima qui si accettava anche il minuscolo, e quel
 * disallineamento nascondeva un buco vero — una variabile scritta con un
 * nome che questo controllo riconosceva come "referenziata" ma che
 * `requiredVars`/`missingVars` (lato server, stesso pattern maiuscolo di
 * sempre) non contavano affatto come "richiesta": il bottone "Accedi adesso"
 * restava attivo su un indirizzo che non si sarebbe mai risolto davvero.
 *
 * NON basta pero' sapere che l'indirizzo referenzia una variabile per dire
 * che "manca": bisogna incrociarlo con `variabiliMancanti` (vedi
 * `RigaAmbiente`) — la stessa variabile, una volta impostata in `.env`,
 * resta scritta cosi' com'e' qui (il valore non si mostra mai), ma a quel
 * punto non e' piu' "mancante".
 */
function variabileNonRisolta(url: string): string | null {
  const corrispondenza = /^\$\{([A-Z][A-Z0-9_]{0,60})\}$/.exec(url.trim());
  return corrispondenza ? corrispondenza[1] : null;
}

type StatoCredenziali = 'inattivo' | 'salvo' | 'ok' | 'parziale' | 'errore';

/**
 * Le credenziali mancanti di un ambiente, compilabili sul posto: un campo
 * mascherato per ciascuna variabile che manca ancora, e un solo invio che le
 * scrive tutte (quelle che il tester ha riempito — le altre restano da fare).
 * Riusa /api/configurazione, la stessa rotta del riquadro "Altre variabili":
 * una scrive in .env, l'altra ci arriva da un posto diverso della finestra.
 * Nessun valore torna mai indietro: i campi si svuotano dopo l'invio, riuscito
 * o no, e la risposta della rotta non contiene mai il valore scritto.
 */
function CredenzialiMancanti({
  nomeAmbiente,
  variabiliMancanti,
  onSalvate,
}: {
  nomeAmbiente: string;
  variabiliMancanti: string[];
  onSalvate: () => void;
}) {
  const t = useTranslations('Ambienti');
  const [aperto, setAperto] = useState(false);
  const [valori, setValori] = useState<Record<string, string>>({});
  const [stato, setStato] = useState<StatoCredenziali>('inattivo');

  async function salva(evento: React.FormEvent) {
    evento.preventDefault();
    setStato('salvo');
    const daScrivere = variabiliMancanti.filter((v) => valori[v]);
    setValori({});
    if (daScrivere.length === 0) {
      setStato('inattivo');
      return;
    }
    let riuscite = 0;
    for (const chiave of daScrivere) {
      try {
        const risposta = await fetch('/api/configurazione', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chiave, valore: valori[chiave] }),
        });
        const corpo = (await risposta.json()) as { scritta?: boolean };
        if (risposta.ok && corpo.scritta) riuscite += 1;
      } catch {
        // Si continua con le altre: il conteggio finale dice cosa e' successo.
      }
    }
    if (riuscite === daScrivere.length) {
      setStato('ok');
      setAperto(false);
      onSalvate();
    } else if (riuscite > 0) {
      setStato('parziale');
      onSalvate();
    } else {
      setStato('errore');
    }
  }

  if (!aperto) {
    return (
      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
        <span className="inline-flex items-center gap-1.5 break-words" style={{ color: 'var(--ambra)' }}>
          <KeyRound size={13} aria-hidden="true" />
          {t('credenzialiMancanti', { n: variabiliMancanti.length, elenco: variabiliMancanti.join(', ') })}
        </span>
        <button
          type="button"
          onClick={() => setAperto(true)}
          aria-label={t('compilaCredenzialiAria', { nome: nomeAmbiente })}
          className="inline-flex min-h-10 items-center rounded-md border px-3 font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{ borderColor: 'var(--bordo)', color: 'var(--testo)', outlineColor: 'var(--blu)' }}
        >
          {t('compilaCredenziali')}
        </button>
        {stato === 'parziale' && (
          <span className="inline-flex items-center gap-1.5" style={{ color: 'var(--ambra)' }}>
            <XCircle size={13} aria-hidden="true" />
            {t('credenzialiParzialmenteSalvate')}
          </span>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={(e) => void salva(e)} className="mt-2 flex flex-col gap-2 rounded-md border p-2" style={{ borderColor: 'var(--bordo)' }}>
      {variabiliMancanti.map((chiave) => (
        <div key={chiave} className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
          <label htmlFor={`cred-${nomeAmbiente}-${chiave}`} className="min-w-0 shrink-0 text-xs font-mono break-all" style={{ color: 'var(--testo)' }}>
            {chiave}
          </label>
          <input
            id={`cred-${nomeAmbiente}-${chiave}`}
            type="password"
            autoComplete="off"
            value={valori[chiave] ?? ''}
            onChange={(e) => setValori((v) => ({ ...v, [chiave]: e.target.value }))}
            className="min-h-10 min-w-0 flex-1 rounded-md border px-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ borderColor: 'var(--bordo)', outlineColor: 'var(--blu)' }}
          />
        </div>
      ))}
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={stato === 'salvo'}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-md px-4 text-sm font-medium text-white disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{ background: 'var(--blu-fondo)', outlineColor: 'var(--blu)' }}
        >
          {stato === 'salvo' ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : null}
          {stato === 'salvo' ? t('salvandoCredenziali') : t('salvaCredenziali')}
        </button>
        <button
          type="button"
          onClick={() => { setAperto(false); setValori({}); setStato('inattivo'); }}
          className="inline-flex min-h-10 items-center rounded-md border px-3 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{ borderColor: 'var(--bordo)', color: 'var(--testo)', outlineColor: 'var(--blu)' }}
        >
          {t('annullaCompilazione')}
        </button>
        {stato === 'errore' && (
          <span className="inline-flex items-center gap-1.5 text-xs" style={{ color: 'var(--rosso)' }}>
            <XCircle size={14} aria-hidden="true" />
            {t('credenzialiNonSalvate')}
          </span>
        )}
      </div>
    </form>
  );
}

type StatoRegistrazioneAccesso =
  | 'inattivo'
  | 'avvio'
  | 'in corso'
  | 'derivando'
  | 'fatto'
  | 'fallita'
  | 'errore';

interface RispostaLogin {
  scritto?: boolean;
  variabili?: string[];
  errore?: string;
}

/**
 * Il pulsante «Registra l'accesso»: riusa il registratore che gia' esiste
 * (lo stesso di `npm run record`, dietro il comando 'registrazione') invece
 * di aprirne un secondo. Il tester entra come farebbe di solito e chiude il
 * browser; la registrazione appena prodotta viene letta e trasformata nel
 * blocco di accesso di questo ambiente — mai un valore digitato, solo
 * segnaposto (vedi `lib/derivazione-login.ts`).
 *
 * Se l'ambiente ha gia' un accesso registrato, si chiede conferma prima:
 * registrare di nuovo lo sostituisce per intero.
 */
function RegistraAccesso({
  ambiente,
  onRegistrato,
}: {
  ambiente: AmbienteVisibile;
  onRegistrato: () => void;
}) {
  const t = useTranslations('Ambienti');
  const [stato, setStato] = useState<StatoRegistrazioneAccesso>('inattivo');
  const [messaggioErrore, setMessaggioErrore] = useState('');
  const [variabili, setVariabili] = useState<string[]>([]);
  const sorgenteRef = useRef<EventSource | null>(null);

  useEffect(() => () => sorgenteRef.current?.close(), []);

  const deriva = useCallback(async () => {
    setStato('derivando');
    try {
      const risposta = await fetch('/api/configurazione/ambienti/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: ambiente.nome }),
      });
      const corpo = (await risposta.json()) as RispostaLogin;
      if (risposta.ok && corpo.scritto) {
        setStato('fatto');
        setVariabili(corpo.variabili ?? []);
        onRegistrato();
      } else {
        setStato('errore');
        setMessaggioErrore(corpo.errore ?? t('erroreDerivazioneAccesso'));
      }
    } catch {
      setStato('errore');
      setMessaggioErrore(t('erroreParlareCruscotto'));
    }
  }, [ambiente.nome, onRegistrato, t]);

  const avvia = useCallback(async () => {
    if (ambiente.haLogin && !window.confirm(t('confermaSostituzioneAccesso'))) return;

    setStato('avvio');
    setMessaggioErrore('');
    try {
      const risposta = await fetch('/api/esegui', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: 'registrazione', parametri: { bersaglio: ambiente.nome } }),
      });
      const corpo = (await risposta.json()) as { id?: string; errore?: string };
      if (!risposta.ok || !corpo.id) {
        setStato('errore');
        setMessaggioErrore(corpo.errore ?? t('erroreAvvioRegistrazioneAccesso'));
        return;
      }
      setStato('in corso');
      const sorgente = new EventSource(`/api/esegui/${corpo.id}/flusso`);
      sorgenteRef.current = sorgente;
      sorgente.addEventListener('fine', (evento) => {
        const dettagli = JSON.parse((evento as MessageEvent).data) as { stato: string };
        sorgente.close();
        if (dettagli.stato === 'conclusa') {
          void deriva();
        } else {
          setStato('fallita');
        }
      });
      // Nessun `close` sull'errore, ed e' deliberato — stesso criterio della
      // schermata Esecuzione (vedi il commento li'): chiudere qui spegne per
      // sempre la riconnessione che il browser fa da solo, e un portatile che
      // si sospende o un ricarico in sviluppo lascerebbero questo pulsante a
      // girare con la rotellina anche a registrazione gia' conclusa.
    } catch {
      setStato('errore');
      setMessaggioErrore(t('erroreParlareCruscotto'));
    }
  }, [ambiente.haLogin, ambiente.nome, deriva, t]);

  const inCorso = stato === 'avvio' || stato === 'in corso' || stato === 'derivando';

  return (
    <div className="mt-1 flex flex-col gap-1">
      <button
        type="button"
        onClick={() => void avvia()}
        disabled={inCorso}
        aria-label={t('registraAccessoAria', { nome: ambiente.nome })}
        className="inline-flex min-h-10 w-fit shrink-0 items-center gap-1.5 rounded-md border px-3 text-sm font-medium disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        style={{ borderColor: 'var(--bordo)', color: 'var(--testo)', outlineColor: 'var(--blu)' }}
      >
        {inCorso ? (
          <Loader2 size={16} className="animate-spin" aria-hidden="true" />
        ) : (
          <CircleDot size={16} aria-hidden="true" />
        )}
        {ambiente.haLogin ? t('registraDiNuovoAccesso') : t('registraAccesso')}
      </button>
      <p className="text-xs break-words" aria-live="polite">
        {stato === 'avvio' && <span style={{ color: 'var(--testo-tenue)' }}>{t('avvioInCorso')}</span>}
        {stato === 'in corso' && (
          <span className="inline-flex items-center gap-1.5" style={{ color: 'var(--testo-tenue)' }}>
            <Loader2 size={14} className="animate-spin" aria-hidden="true" />
            {t('browserApertoRegistrazione')}
          </span>
        )}
        {stato === 'derivando' && (
          <span className="inline-flex items-center gap-1.5" style={{ color: 'var(--testo-tenue)' }}>
            <Loader2 size={14} className="animate-spin" aria-hidden="true" />
            {t('derivandoAccesso')}
          </span>
        )}
        {stato === 'fatto' && (
          <span className="inline-flex items-center gap-1.5" style={{ color: 'var(--verde)' }}>
            <CheckCircle2 size={14} aria-hidden="true" />
            {variabili.length > 0
              ? t('accessoRegistratoConVariabili', { n: variabili.length, elenco: variabili.join(', ') })
              : t('accessoRegistrato')}
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
  );
}

type StatoModificaIndirizzo = 'inattivo' | 'salvo' | 'errore';

/**
 * Corregge l'indirizzo di un ambiente gia' esistente — riusa la stessa rotta
 * del form "Aggiungi ambiente" (`POST /api/configurazione/ambienti`), che
 * quando il nome esiste gia' aggiorna solo `url` e lascia intatto tutto il
 * resto (`scriviBersaglio` in `lib/configurazione.ts`).
 *
 * Il nome NON si puo' cambiare da qui, ed e' una scelta esplicita, non
 * un'omissione: vive anche nelle sessioni salvate e nelle registrazioni di
 * quell'ambiente, e rinominarlo le lascerebbe orfane. Il campo appare come
 * testo fisso con la spiegazione accanto, cosi' il limite si vede invece di
 * doverlo scoprire cercando un campo che non c'e'.
 */
function ModificaIndirizzo({
  ambiente,
  onSalvato,
}: {
  ambiente: AmbienteVisibile;
  onSalvato: () => void;
}) {
  const t = useTranslations('Ambienti');
  const [aperto, setAperto] = useState(false);
  const [url, setUrl] = useState(ambiente.url);
  const [stato, setStato] = useState<StatoModificaIndirizzo>('inattivo');
  const [messaggioErrore, setMessaggioErrore] = useState('');

  async function salva(evento: React.FormEvent) {
    evento.preventDefault();
    setStato('salvo');
    setMessaggioErrore('');
    try {
      const risposta = await fetch('/api/configurazione/ambienti', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: ambiente.nome, url }),
      });
      const corpo = (await risposta.json()) as { scritto?: boolean; errore?: string };
      if (risposta.ok && corpo.scritto) {
        setAperto(false);
        setStato('inattivo');
        onSalvato();
      } else {
        setStato('errore');
        setMessaggioErrore(corpo.errore ?? t('erroreAggiornareIndirizzo'));
      }
    } catch {
      setStato('errore');
      setMessaggioErrore(t('erroreParlareCruscotto'));
    }
  }

  if (!aperto) {
    return (
      <button
        type="button"
        onClick={() => {
          setUrl(ambiente.url);
          setStato('inattivo');
          setMessaggioErrore('');
          setAperto(true);
        }}
        aria-label={t('modificaIndirizzoAria', { nome: ambiente.nome })}
        className="inline-flex min-h-10 w-fit items-center gap-1.5 rounded-md border px-3 text-xs font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        style={{ borderColor: 'var(--bordo)', color: 'var(--testo)', outlineColor: 'var(--blu)' }}
      >
        <Pencil size={13} aria-hidden="true" />
        {t('modificaIndirizzo')}
      </button>
    );
  }

  return (
    <form
      onSubmit={(e) => void salva(e)}
      className="flex min-w-0 flex-1 flex-col gap-2 rounded-md border p-2"
      style={{ borderColor: 'var(--bordo)' }}
    >
      <p className="text-xs break-words" style={{ color: 'var(--testo-tenue)' }}>
        {t('nomeNonModificabileNota')}
      </p>
      <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
        <label htmlFor={`url-${ambiente.nome}`} className="shrink-0 text-xs" style={{ color: 'var(--testo)' }}>
          {t('indirizzo')}
        </label>
        <input
          id={`url-${ambiente.nome}`}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder={t('placeholderIndirizzo')}
          className="min-h-10 min-w-0 flex-1 rounded-md border px-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{ borderColor: 'var(--bordo)', outlineColor: 'var(--blu)' }}
        />
      </div>
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={stato === 'salvo' || !url}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-md px-4 text-sm font-medium text-white disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{ background: 'var(--blu-fondo)', outlineColor: 'var(--blu)' }}
        >
          {stato === 'salvo' ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : null}
          {stato === 'salvo' ? t('salvando') : t('salvaIndirizzo')}
        </button>
        <button
          type="button"
          onClick={() => { setAperto(false); setStato('inattivo'); setMessaggioErrore(''); }}
          className="inline-flex min-h-10 items-center rounded-md border px-3 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{ borderColor: 'var(--bordo)', color: 'var(--testo)', outlineColor: 'var(--blu)' }}
        >
          {t('annullaCompilazione')}
        </button>
        {stato === 'errore' && messaggioErrore && (
          <span className="inline-flex items-center gap-1.5 text-xs break-words" style={{ color: 'var(--rosso)' }}>
            <XCircle size={14} aria-hidden="true" />
            {messaggioErrore}
          </span>
        )}
      </div>
    </form>
  );
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
  const [eliminazione, setEliminazione] = useState<'inattivo' | 'in corso' | 'errore'>('inattivo');
  const [messaggioEliminazione, setMessaggioEliminazione] = useState('');
  const sorgenteRef = useRef<EventSource | null>(null);
  const variabile = variabileNonRisolta(ambiente.url);
  const variabiliMancanti = ambiente.variabiliMancanti ?? [];
  const variabiliRichieste = ambiente.variabiliRichieste ?? [];
  // La stessa variabile che l'indirizzo referenzia puo' benissimo essere gia'
  // stata impostata in .env: `variabile` dice solo che l'indirizzo e' scritto
  // come `${VAR}`, non che quella variabile manchi davvero. La domanda "manca
  // davvero?" ha una sola risposta autorevole, `variabiliMancanti` (calcolata
  // lato server contro .env con la stessa regola di `missingVars`) — prima
  // questa riga rispondeva "manca" guardando solo la sintassi dell'indirizzo,
  // e diceva "Indirizzo non ancora risolto" anche quando la variabile era gia'
  // configurata da un pezzo: la stessa riga contraddiceva se stessa.
  const indirizzoMancante = variabile !== null && variabiliMancanti.includes(variabile);
  // Un indirizzo vuoto (nessun `${VAR}`, nessun testo) non e' un caso che
  // `variabiliMancanti` puo' vedere, perche' un ambiente senza nessuna
  // variabile referenziata ha comunque un elenco vuoto: senza questo
  // controllo "Accedi adesso" restava attivo su un ambiente senza indirizzo,
  // e il browser si apriva su niente.
  const indirizzoAssente = ambiente.url.trim() === '';
  // Le credenziali (compreso l'indirizzo, se e' una variabile) sono a posto
  // solo se .env non ne segnala nessuna mancante: e' cio' che decide se
  // mostrare "Credenziali configurate" o il modulo per compilarle.
  const credenzialiOk = variabiliMancanti.length === 0;
  // "Accedi adesso" in piu' pretende un indirizzo che esista davvero: le due
  // condizioni servono a domande diverse (le credenziali sono a posto? / c'e'
  // una strada da percorrere?) e si tengono separate apposta.
  const prontoPerAccesso = credenzialiOk && !indirizzoAssente && !indirizzoMancante;

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
      // Nessun `close` sull'errore, ed e' deliberato — stesso criterio della
      // schermata Esecuzione (vedi il commento li'): chiudere qui spegne per
      // sempre la riconnessione che il browser fa da solo, e un portatile che
      // si sospende o un ricarico in sviluppo lascerebbero questa riga a
      // girare con la rotellina anche a sessione gia' conclusa.
    } catch {
      setStato('errore');
      setMessaggioErrore(t('erroreParlareCruscotto'));
    }
  }, [ambiente.nome, onSessioneConclusa, t]);

  const elimina = useCallback(async () => {
    // Una conferma che dice cosa si perde DAVVERO, non una generica "sei
    // sicuro?": un accesso registrato e una sessione salvata sono lavoro del
    // tester, e sparirebbero insieme all'ambiente senza preavviso altrimenti.
    const righe = [t('confermaEliminazioneTitolo', { nome: ambiente.nome })];
    if (ambiente.haLogin) righe.push(t('confermaEliminazioneLogin'));
    if (ambiente.haSessione) righe.push(t('confermaEliminazioneSessione'));
    righe.push(t('confermaEliminazioneEnv'));
    righe.push(t('confermaEliminazioneIrreversibile'));
    if (!window.confirm(righe.join('\n\n'))) return;

    setEliminazione('in corso');
    setMessaggioEliminazione('');
    try {
      const risposta = await fetch('/api/configurazione/ambienti', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: ambiente.nome }),
      });
      const corpo = (await risposta.json()) as { eliminato?: boolean; errore?: string };
      if (risposta.ok && corpo.eliminato) {
        onSessioneConclusa();
      } else {
        setEliminazione('errore');
        setMessaggioEliminazione(corpo.errore ?? t('erroreEliminarlo'));
      }
    } catch {
      setEliminazione('errore');
      setMessaggioEliminazione(t('erroreParlareCruscotto'));
    }
  }, [ambiente.haLogin, ambiente.haSessione, ambiente.nome, onSessioneConclusa, t]);

  return (
    <li
      className="flex max-w-2xl flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
      style={{ borderColor: 'var(--bordo)', background: 'var(--superficie)' }}
    >
      <div className="min-w-0">
        <p className="font-medium break-words" style={{ color: 'var(--testo)' }}>{ambiente.nome}</p>
        <p
          className="text-sm break-words"
          style={{ color: indirizzoMancante ? 'var(--ambra)' : 'var(--testo-tenue)' }}
        >
          {indirizzoMancante
            ? t('indirizzoNonRisolto', { variabile })
            : variabile
              ? t('indirizzoRisoltoTramiteVariabile', { variabile })
              : ambiente.url || t('indirizzoNonImpostato')}
        </p>

        {variabiliRichieste.length > 0 && (
          credenzialiOk ? (
            <p className="mt-1 inline-flex items-center gap-1.5 text-xs" style={{ color: 'var(--verde)' }}>
              <CheckCircle2 size={13} aria-hidden="true" />
              {t('credenzialiConfigurate')}
            </p>
          ) : (
            <CredenzialiMancanti
              nomeAmbiente={ambiente.nome}
              variabiliMancanti={variabiliMancanti}
              onSalvate={onSessioneConclusa}
            />
          )
        )}

        <RegistraAccesso ambiente={ambiente} onRegistrato={onSessioneConclusa} />

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

        {/*
          Modifica ed elimina stanno qui, piccole e in una riga a parte —
          lontane dal pulsante "Accedi adesso" (grande, blu, sulla destra) di
          proposito: la prima e' l'azione frequente, elimina e' distruttiva, e
          non devono poter essere confuse da chi clicca in fretta.
        */}
        <div className="mt-2 flex flex-wrap items-start gap-2">
          <ModificaIndirizzo ambiente={ambiente} onSalvato={onSessioneConclusa} />
          <div>
            <button
              type="button"
              onClick={() => void elimina()}
              disabled={eliminazione === 'in corso'}
              aria-label={t('eliminaAria', { nome: ambiente.nome })}
              className="inline-flex min-h-10 w-fit items-center gap-1.5 rounded-md border px-3 text-xs font-medium disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{ borderColor: 'var(--rosso)', color: 'var(--rosso)', outlineColor: 'var(--blu)' }}
            >
              {eliminazione === 'in corso' ? (
                <Loader2 size={13} className="animate-spin" aria-hidden="true" />
              ) : (
                <Trash2 size={13} aria-hidden="true" />
              )}
              {t('elimina')}
            </button>
            {eliminazione === 'errore' && messaggioEliminazione && (
              <p className="mt-1 text-xs break-words" style={{ color: 'var(--rosso)' }}>
                {messaggioEliminazione}
              </p>
            )}
          </div>
        </div>
      </div>
      {prontoPerAccesso && (
        // Nessun pulsante finche' manca anche una sola variabile (credenziale
        // o indirizzo) o finche' l'indirizzo e' vuoto: prometterebbe una
        // strada che fallirebbe di sicuro (il browser si aprirebbe su
        // niente). Il modo per risolvere e' proprio sopra, nella stessa riga.
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
    // Questo form scrive con la stessa rotta di "Modifica indirizzo": un nome
    // gia' in elenco non crea un duplicato, aggiorna quello esistente. E'
    // comodo per correggersi al volo, ma silenzioso — chi vuole aggiungerne
    // uno nuovo e sbaglia a digitare un nome gia' preso sovrascriverebbe un
    // indirizzo senza saperlo. Un'unica conferma esplicita basta a distinguere
    // le due intenzioni.
    if (ambienti.some((a) => a.nome === nome) && !window.confirm(t('confermaSovrascritturaIndirizzo', { nome }))) {
      return;
    }
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
        // F3: la barra laterale (SelettoreAmbiente) vive in un altro
        // sottoalbero e non rileggerebbe mai l'elenco da sola.
        notificaAmbientiCambiati();
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
    // F3: copre eliminazione, modifica indirizzo, accesso registrato e
    // credenziali salvate — ogni caso in cui l'elenco puo' essere cambiato
    // da qui, non solo l'aggiunta.
    notificaAmbientiCambiati();
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
          <p className="text-xs" style={{ color: 'var(--testo-tenue)' }}>
            {t('nomeNonModificabileNota')}
          </p>
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
