'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { PlayCircle, Loader2, AlertTriangle } from 'lucide-react';
import { PassoTest, type Passo } from '@/components/cruscotto/PassoTest';
import { cn } from '@/lib/utils';

type StatoEsecuzione = 'in corso' | 'conclusa' | 'fallita' | 'interrotta';

const CHIAVE_ESITO: Record<Passo['esito'], 'esitoPassato' | 'esitoFallito' | 'esitoSaltato'> = {
  passato: 'esitoPassato',
  fallito: 'esitoFallito',
  saltato: 'esitoSaltato',
};

function conta(passi: Passo[]): Record<Passo['esito'], number> {
  const conteggio: Record<Passo['esito'], number> = { passato: 0, fallito: 0, saltato: 0 };
  for (const p of passi) conteggio[p.esito]++;
  return conteggio;
}

type Traduttore = (chiave: string, valori?: Record<string, number | string>) => string;

function formattaRiepilogo(passi: Passo[], t: Traduttore): string {
  const conteggio = conta(passi);
  return (['passato', 'fallito', 'saltato'] as const)
    .map((esito) => t(CHIAVE_ESITO[esito], { n: conteggio[esito] }))
    .join(', ');
}

/**
 * Il bersaglio scelto in "Registra" viaggia verso questa schermata nella
 * query string: e' un dato che arriva dall'esterno (chiunque puo' costruire
 * un link con un valore qualsiasi), quindi si accetta solo se corrisponde a
 * uno dei bersagli configurati davvero. Altrimenti si ricade sul valore gia'
 * scelto, o sul primo dell'elenco.
 */
function scegliBersaglioIniziale(
  daQuery: string | null,
  corrente: string,
  elenco: string[]
): string {
  if (daQuery && elenco.includes(daQuery)) return daQuery;
  return corrente || elenco[0] || '';
}

/**
 * Sotto il minuto un numero di secondi con un decimale basta e si legge a
 * colpo d'occhio; sopra il minuto, minuti e secondi separati sono piu'
 * leggibili di "127.3 s". Il separatore decimale segue la lingua scelta
 * (virgola in italiano, punto in inglese): un numero scritto alla rovescia
 * per chi legge si nota subito, anche in mezzo a una frase che per il resto
 * e' tradotta bene.
 */
function formattaDurata(ms: number, locale: string, t: Traduttore): string {
  const secondiTotali = ms / 1000;
  if (secondiTotali < 60) {
    const s = secondiTotali.toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    return t('durataSecondi', { s });
  }
  const minuti = Math.floor(secondiTotali / 60);
  const secondi = Math.floor(secondiTotali % 60);
  return t('durataMinutiSecondi', { m: minuti, s: String(secondi).padStart(2, '0') });
}

/**
 * La riga d'esito in fondo: conteggio dei passi e, quando nota, la durata.
 * La durata si calcola qui, dal momento in cui la finestra ha lanciato il
 * test: il registro delle esecuzioni conosce avvio e fine, ma questa
 * schermata non lo consulta per quello, quindi ricaricando la scheda a test
 * concluso il tempo impiegato si perde (resta il conteggio dei passi, che
 * arriva sempre dal file).
 */
function rigaEsito(passi: Passo[], durataMs: number | null, locale: string, t: Traduttore): string {
  const riepilogo = formattaRiepilogo(passi, t);
  return durataMs === null ? riepilogo : `${riepilogo} · ${formattaDurata(durataMs, locale, t)}`;
}

/**
 * Quando l'esecuzione finisce male prima di produrre un solo passo
 * (bersaglio non risolto, sessione assente, Cucumber non installato...) la
 * sezione dei passi non si disegna affatto: e' lo scenario piu' probabile
 * alla prima esecuzione, e l'unico in cui la schermata non si puo' permettere
 * di restare muta.
 */
function deveMostrareErroreSenzaPassi(
  stato: StatoEsecuzione | null,
  passi: Passo[]
): boolean {
  // Qualunque esito, non solo quelli rossi.
  //
  // Con nessuno scenario da eseguire Cucumber esce con codice ZERO, quindi
  // l'esecuzione risulta conclusa: e' lo stato di una macchina appena accesa,
  // e anche di una generazione che non ha prodotto niente. Guardando solo
  // "fallita" e "interrotta", il tester premeva Lancia, aspettava, e la
  // finestra tornava com'era senza dire una parola. Zero passi e' sempre una
  // notizia.
  return stato !== null && stato !== 'in corso' && passi.length === 0;
}

/** Cosa dire, quando non e' uscito nemmeno un passo. */
function fraseSenzaPassi(stato: StatoEsecuzione | null, t: Traduttore): string {
  if (stato === 'interrotta') return t('senzaPassiInterrotto');
  if (stato === 'fallita') return t('senzaPassiFallito');
  return t('senzaPassiVuoto');
}

/** Un interruttore accessibile: mai un checkbox nascosto senza etichetta visibile. */
function Interruttore({
  etichetta,
  attivo,
  onChange,
  disabilitato,
}: {
  etichetta: string;
  attivo: boolean;
  onChange: (v: boolean) => void;
  disabilitato: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={attivo}
      disabled={disabilitato}
      onClick={() => onChange(!attivo)}
      className={cn(
        'flex items-center justify-between gap-3 min-h-10 rounded-md border px-3 text-sm font-medium text-left',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
        'disabled:opacity-50 disabled:cursor-not-allowed'
      )}
      style={{ borderColor: 'var(--bordo)', color: 'var(--testo)', outlineColor: 'var(--blu)' }}
    >
      <span>{etichetta}</span>
      <span
        aria-hidden="true"
        className="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors"
        style={{ background: attivo ? 'var(--blu)' : 'var(--bordo)' }}
      >
        <span
          className="inline-block h-5 w-5 rounded-full bg-white transition-transform"
          style={{ transform: attivo ? 'translateX(22px)' : 'translateX(2px)' }}
        />
      </span>
    </button>
  );
}

function EsecuzioneContenuto() {
  const t = useTranslations('Esecuzione');
  const locale = useLocale();
  const searchParams = useSearchParams();
  const [bersagli, setBersagli] = useState<string[]>([]);
  const [bersaglio, setBersaglio] = useState('');
  const [guardaIlBrowser, setGuardaIlBrowser] = useState(false);
  const [senzaSessione, setSenzaSessione] = useState(false);
  const [id, setId] = useState<string | null>(null);
  const [statoCorrente, setStatoCorrente] = useState<StatoEsecuzione | null>(null);
  const [passi, setPassi] = useState<Passo[]>([]);
  const [errore, setErrore] = useState<string | null>(null);
  const [inLancio, setInLancio] = useState(false);
  // Le ultime righe grezze del processo: servono solo per lo scenario in cui
  // il test muore prima di produrre un passo, l'unico in cui la finestra non
  // ha nient'altro da mostrare. Non e' l'output di una registrazione (dove le
  // righe grezze possono contenere i nomi che il tester sta dando ai passi, e
  // si e' scelto di non mostrarle): qui e' l'output di un test gia' scritto,
  // che non ha quel problema.
  const [righeOutput, setRigheOutput] = useState<string[]>([]);
  const [codiceUscita, setCodiceUscita] = useState<number | null>(null);
  const [avviatoAlle, setAvviatoAlle] = useState<number | null>(null);
  const [durataMs, setDurataMs] = useState<number | null>(null);

  const inCorso = statoCorrente === 'in corso';

  useEffect(() => {
    let attivo = true;
    const daQuery = searchParams.get('bersaglio');
    fetch('/api/configurazione')
      .then((r) => r.json())
      .then((d: { bersagli?: string[] }) => {
        if (!attivo) return;
        const elenco = d.bersagli ?? [];
        setBersagli(elenco);
        setBersaglio((corrente) => scegliBersaglioIniziale(daQuery, corrente, elenco));
      })
      .catch(() => {});
    return () => {
      attivo = false;
    };
  }, [searchParams]);

  // I passi si aggiornano da soli mentre l'esecuzione gira: una richiesta al
  // secondo basta, e si ferma da sola quando l'esecuzione non e' piu' in corso.
  useEffect(() => {
    if (!id || !inCorso) return;
    let attivo = true;
    const leggi = () => {
      fetch(`/api/passi?id=${encodeURIComponent(id)}`)
        .then((r) => r.json())
        .then((d: { passi?: Passo[] }) => {
          if (attivo) setPassi(d.passi ?? []);
        })
        .catch(() => {});
    };
    leggi();
    const intervallo = setInterval(leggi, 1000);
    return () => {
      attivo = false;
      clearInterval(intervallo);
    };
  }, [id, inCorso]);

  // Il flusso dice quando l'esecuzione e' conclusa: e' il segnale per smettere
  // di interrogare i passi, e per un ultimo aggiornamento a esecuzione finita.
  useEffect(() => {
    if (!id || !inCorso) return;
    const fonte = new EventSource(`/api/esegui/${encodeURIComponent(id)}/flusso`);
    // Le righe arrivano gia' sul flusso: se ne tengono da parte solo le
    // ultime, per il caso (raro, si spera) in cui servano perche' non c'e'
    // nessun passo da mostrare.
    const suRiga = (evento: MessageEvent<string>) => {
      try {
        const nuove = JSON.parse(evento.data) as string[];
        setRigheOutput((precedenti) => [...precedenti, ...nuove].slice(-20));
      } catch {
        // Una riga malformata non e' un guasto da segnalare: si ignora.
      }
    };
    const suFine = (evento: MessageEvent<string>) => {
      try {
        const dati = JSON.parse(evento.data) as { stato?: StatoEsecuzione; codice?: number | null };
        setStatoCorrente(dati.stato ?? 'conclusa');
        setCodiceUscita(dati.codice ?? null);
      } catch {
        setStatoCorrente('conclusa');
      }
      setDurataMs(avviatoAlle !== null ? Date.now() - avviatoAlle : null);
      fonte.close();
    };
    fonte.addEventListener('riga', suRiga);
    fonte.addEventListener('fine', suFine);
    // Nessun `close` sull'errore, ed e' deliberato.
    //
    // Chiudere qui spegne per sempre la riconnessione che il browser fa da
    // solo: basta un portatile che va in sospensione o un ricarico in
    // sviluppo perche' l'evento di fine non arrivi mai piu'. La schermata
    // resterebbe a girare con lo spinner mentre il test e' gia' finito — cioe'
    // direbbe una cosa falsa, che e' l'unica cosa che non deve fare.
    //
    // Lasciando riconnettere, alla prima riconnessione la rotta rilegge lo
    // stato e manda subito la fine se nel frattempo e' arrivata.
    return () => {
      fonte.removeEventListener('riga', suRiga);
      fonte.removeEventListener('fine', suFine);
      fonte.close();
    };
  }, [id, inCorso, avviatoAlle]);

  // Un ultimo giro sui passi quando l'esecuzione si conclude: il file dei
  // messaggi puo' aver ricevuto le ultime righe dopo l'ultima lettura al secondo.
  useEffect(() => {
    if (!id || inCorso || statoCorrente === null) return;
    fetch(`/api/passi?id=${encodeURIComponent(id)}`)
      .then((r) => r.json())
      .then((d: { passi?: Passo[] }) => setPassi(d.passi ?? []))
      .catch(() => {});
  }, [id, inCorso, statoCorrente]);

  const lancia = useCallback(async () => {
    setErrore(null);
    setPassi([]);
    setRigheOutput([]);
    setCodiceUscita(null);
    setDurataMs(null);
    setInLancio(true);
    try {
      const risposta = await fetch('/api/esegui', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: 'test',
          parametri: { bersaglio, vedi: guardaIlBrowser, pulito: senzaSessione },
        }),
      });
      const dati = (await risposta.json()) as { id?: string; errore?: string };
      if (!risposta.ok || !dati.id) {
        setErrore(dati.errore ?? t('erroreLancio'));
        return;
      }
      setId(dati.id);
      setAvviatoAlle(Date.now());
      setStatoCorrente('in corso');
    } catch {
      setErrore(t('erroreContattoCruscotto'));
    } finally {
      setInLancio(false);
    }
  }, [bersaglio, guardaIlBrowser, senzaSessione, t]);

  return (
    <div className="flex flex-col gap-6 max-w-3xl min-w-0">
      <h1 className="text-xl font-semibold" style={{ color: 'var(--testo)' }}>
        {t('titolo')}
      </h1>

      <section
        className="flex flex-col gap-4 rounded-lg border p-4"
        style={{ borderColor: 'var(--bordo)', background: 'var(--superficie)' }}
      >
        <div className="flex flex-col gap-1">
          <label htmlFor="bersaglio" className="text-sm font-medium" style={{ color: 'var(--testo)' }}>
            {t('bersaglio')}
          </label>
          <select
            id="bersaglio"
            value={bersaglio}
            onChange={(e) => setBersaglio(e.target.value)}
            disabled={inCorso || bersagli.length === 0}
            className={cn(
              'h-10 rounded-md border px-3 text-sm',
              'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
              'disabled:opacity-50'
            )}
            style={{ borderColor: 'var(--bordo)', color: 'var(--testo)', outlineColor: 'var(--blu)' }}
          >
            {bersagli.length === 0 && <option value="">{t('nessunBersaglio')}</option>}
            {bersagli.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>

        <Interruttore
          etichetta={t('guardaIlBrowser')}
          attivo={guardaIlBrowser}
          onChange={setGuardaIlBrowser}
          disabilitato={inCorso}
        />
        <Interruttore
          etichetta={t('partiSenzaSessione')}
          attivo={senzaSessione}
          onChange={setSenzaSessione}
          disabilitato={inCorso}
        />

        <button
          type="button"
          onClick={lancia}
          disabled={inLancio || inCorso || !bersaglio}
          className={cn(
            'inline-flex items-center justify-center gap-2 min-h-10 px-4 rounded-md text-sm font-semibold text-white transition-colors',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
          style={{ background: 'var(--blu-fondo)', outlineColor: 'var(--blu)' }}
        >
          {inCorso ? (
            <Loader2 size={18} aria-hidden="true" className="animate-spin" />
          ) : (
            <PlayCircle size={18} aria-hidden="true" />
          )}
          {inCorso ? t('testInCorso') : t('lanciaIlTest')}
        </button>

        {errore && (
          <p role="alert" className="text-sm font-medium" style={{ color: 'var(--rosso)' }}>
            {errore}
          </p>
        )}
      </section>

      {passi.length > 0 && (
        <section aria-label={t('passiAriaLabel')} className="flex flex-col gap-4 min-w-0">
          <ul className="flex flex-col gap-2" role="list">
            {passi.map((p, i) => (
              <PassoTest key={i} passo={p} />
            ))}
          </ul>

          <p
            className="text-sm font-semibold border-t pt-3"
            style={{ color: 'var(--testo-tenue)', borderColor: 'var(--bordo)' }}
          >
            {rigaEsito(passi, durataMs, locale, t)}
          </p>
        </section>
      )}

      {deveMostrareErroreSenzaPassi(statoCorrente, passi) && (
        <section
          role="alert"
          aria-label={t('esitoAriaLabel')}
          className="flex flex-col gap-2 rounded-lg border p-4 text-sm"
          style={{
            borderColor:
              statoCorrente === 'fallita' ? 'var(--rosso)' : 'var(--testo-tenue)',
            background: 'var(--superficie-tenue)',
          }}
        >
          <p
            className="flex items-center gap-2 font-semibold"
            style={{ color: statoCorrente === 'fallita' ? 'var(--rosso)' : 'var(--testo-tenue)' }}
          >
            <AlertTriangle size={18} aria-hidden="true" />
            {fraseSenzaPassi(statoCorrente, t)}
          </p>
          <p style={{ color: 'var(--testo-tenue)' }}>
            {codiceUscita !== null
              ? t('codiceUscita', { codice: codiceUscita })
              : t('nessunCodiceUscita')}
          </p>
          {righeOutput.length > 0 && (
            <pre
              className="text-xs whitespace-pre-wrap break-words rounded-md p-2 m-0 font-mono"
              style={{ background: 'var(--superficie)', color: 'var(--testo)' }}
            >
              {righeOutput.join('\n')}
            </pre>
          )}
        </section>
      )}
    </div>
  );
}

function ScheletroCaricamento() {
  const t = useTranslations('Esecuzione');
  return (
    <p className="text-sm" style={{ color: 'var(--testo-tenue)' }}>
      {t('caricamento')}
    </p>
  );
}

export default function EsecuzionePage() {
  return (
    <Suspense fallback={<ScheletroCaricamento />}>
      <EsecuzioneContenuto />
    </Suspense>
  );
}
