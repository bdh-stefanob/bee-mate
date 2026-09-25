'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { AlertTriangle, CircleDot, Loader2, Square } from 'lucide-react';
import {
  RiepilogoTraccia,
  type BucoRiepilogo,
  type PassoRiepilogo,
} from '@/components/cruscotto/RiepilogoTraccia';
import type { NomeComando } from '@/lib/esecuzione';
import { cancellaRiaggancio, leggiRiaggancio, scriviRiaggancio } from '@/lib/riaggancio-client';
import { useAmbiente } from '@/context/AmbienteContext';
import { SalvaScenario } from '@/components/cruscotto/SalvaScenario';
import type { EsitoSalvataggio } from '@/lib/salva-scenario';
import { rilevaCausaFallimento, type CausaFallimento } from '@/lib/diagnosi-fallimento';

/** Quante righe finali tenere per il fallimento che non ha una causa nota: solo per mostrarle, non per capirne di piu' di quanto sappiamo davvero. */
const MAX_RIGHE_TECNICHE = 20;

/** Percorso fisso, dentro reports/: la generazione ci scrive l'elenco di cosa ha prodotto. */
const MANIFESTO = 'reports/cruscotto/generazione-manifesto.json';

/** Dove questa schermata ricorda, dentro la sessione, quale operazione sta aspettando. */
const CHIAVE_RIAGGANCIO = 'cruscotto.riaggancio.registra';

interface DatiRiepilogo {
  passi: PassoRiepilogo[];
  durata: number;
  buchi: BucoRiepilogo[];
}

type Azione = 'registrazione' | 'generazione';

interface DatiRiaggancio {
  id: string;
  azione: Azione;
}

type Fase =
  | { tipo: 'scelta' }
  | { tipo: 'in-corso'; id: string; azione: Azione }
  | { tipo: 'riepilogo'; dati: DatiRiepilogo }
  | { tipo: 'salva'; titolo: string }
  | { tipo: 'errore'; messaggio: string; causa?: CausaFallimento; righeTecniche?: string[] }
  | { tipo: 'altrove'; comando: NomeComando };

interface RispostaEsegui {
  id?: string;
  errore?: string;
}

interface RispostaTracciaUltima {
  percorso: string | null;
}

interface RispostaOperazioneInCorso {
  operazione: { id: string; nome: NomeComando; avvio: string } | null;
}

/** Cosa dire di un'operazione lunga che gira altrove, e dove mandare a guardarla. */
const ALTROVE: Partial<Record<NomeComando, { chiaveComando: string; percorso: string; chiaveVai: string }>> = {
  test: { chiaveComando: 'comandoTest', percorso: '/esecuzione', chiaveVai: 'vaiAEsecuzione' },
  sessione: { chiaveComando: 'comandoSessione', percorso: '/controllo', chiaveVai: 'vaiAControllo' },
  scansione: { chiaveComando: 'comandoScansione', percorso: '/controllo', chiaveVai: 'vaiAControllo' },
};

/**
 * Registra: il tester registra una sessione nel browser che si apre, e vede
 * subito cosa il sistema ne ha capito — prima di generare qualunque file.
 *
 * Su quale ambiente: non piu' una tendina locale a questa schermata, ma la
 * scelta unica per tutta la finestra (barra laterale, `useAmbiente`) — la
 * stessa che usa Esecuzione, cosi' le due schermate non possono piu' finire
 * silenziosamente su due ambienti diversi.
 */
export default function RegistraPage() {
  const t = useTranslations('Registra');
  const router = useRouter();
  const { ambiente } = useAmbiente();
  const [fase, setFase] = useState<Fase>({ tipo: 'scelta' });
  const [righeRicevute, setRigheRicevute] = useState(0);
  // Il pulsante si spegne appena parte la richiesta, non quando torna: fra i
  // due momenti ci stanno comodi due click, cioe' due processi che scrivono
  // sullo stesso manifesto, e il secondo che arriva vince su quello che il
  // tester sta guardando.
  const [inviando, setInviando] = useState(false);
  const sorgenteRef = useRef<EventSource | null>(null);
  // Il nome del primo passo, dal riepilogo: e' il titolo proposto quando lo
  // scenario generato riceve la sua casa. Un ref, perche' il riepilogo non e'
  // piu' sullo schermo quando la generazione finisce.
  const titoloPropostoRef = useRef('');
  // Le ultime righe grezze dell'operazione in corso: servono solo se fallisce
  // (F2), per capire perche' senza aprire un terminale.
  const righeGrezzeRef = useRef<string[]>([]);

  // Dopo la generazione non si salta piu' dritti a Esecuzione: prima lo
  // scenario riceve applicazione, flusso e nome (vedi SalvaScenario).
  const dopoGenerazione = useCallback(() => {
    // Il catalogo si aggiorna da solo dopo ogni generazione riuscita, senza
    // che il tester debba saperlo (F19 — la promessa del progetto e' proprio
    // questa). Parte qui, in un comando dell'elenco chiuso come ogni altro,
    // e non blocca la scelta di applicazione e flusso: dura decine di secondi
    // (un dry-run di Cucumber su tutta la suite), e chi vuole vederla arrivare
    // guarda la schermata Catalogo, che legge il suo esito da
    // `/api/catalogo/stato`. Se non riesce nemmeno a partire, il catalogo
    // resta quello di prima e quella schermata lo dira'.
    fetch('/api/esegui', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome: 'catalogo' }),
    }).catch(() => {});
    setFase({ tipo: 'salva', titolo: titoloPropostoRef.current });
  }, []);

  const versoEsecuzione = useCallback(
    (esito?: EsitoSalvataggio) => {
      if (!esito) {
        router.push('/esecuzione');
        return;
      }
      const come = esito.sovrascritto ? 'sovrascritto' : esito.rinominato ? 'rinominato' : 'nuovo';
      const scenario = encodeURIComponent(`src/features/${esito.file}`);
      router.push(`/esecuzione?scenario=${scenario}&salvato=${come}`);
    },
    [router]
  );

  useEffect(() => () => sorgenteRef.current?.close(), []);

  const osserva = useCallback(
    (id: string, azione: 'registrazione' | 'generazione', quandoConclusa: () => void) => {
      sorgenteRef.current?.close();
      setRigheRicevute(0);
      // Le righe grezze servono solo per il caso in cui l'operazione fallisca:
      // e' li' che sta il perche' (F2), non nell'esito "fallita" da solo.
      righeGrezzeRef.current = [];
      const sorgente = new EventSource(`/api/esegui/${id}/flusso`);
      sorgenteRef.current = sorgente;

      sorgente.addEventListener('riga', (evento) => {
        const nuove = JSON.parse((evento as MessageEvent).data) as string[];
        setRigheRicevute((n) => n + nuove.length);
        righeGrezzeRef.current = [...righeGrezzeRef.current, ...nuove].slice(-MAX_RIGHE_TECNICHE);
      });

      sorgente.addEventListener('fine', (evento) => {
        const dati = JSON.parse((evento as MessageEvent).data) as { stato: string };
        sorgente.close();
        // Comunque vada a finire, l'operazione non c'e' piu': niente da
        // riagganciare la prossima volta che si apre questa schermata.
        cancellaRiaggancio(CHIAVE_RIAGGANCIO);
        if (dati.stato === 'conclusa') {
          quandoConclusa();
        } else if (dati.stato === 'interrotta') {
          setFase({ tipo: 'scelta' });
        } else {
          const righeGrezze = righeGrezzeRef.current;
          const causa = rilevaCausaFallimento(righeGrezze) ?? undefined;
          setFase({
            tipo: 'errore',
            messaggio:
              azione === 'registrazione'
                ? t('erroreRegistrazione')
                : t('erroreGenerazione'),
            ...(causa ? { causa } : {}),
            // Le righe arrivano gia' ripulite dal registro, che e' l'unico punto
            // che conosce la radice del progetto: qui ripulirle di nuovo sarebbe
            // una seconda regola da tenere allineata alla prima.
            righeTecniche: righeGrezze,
          });
        }
      });
    },
    [t]
  );

  const caricaRiepilogo = useCallback(async () => {
    try {
      const ultima = (await fetch('/api/traccia/ultima').then((r) =>
        r.json()
      )) as RispostaTracciaUltima;
      if (!ultima.percorso) {
        setFase({
          tipo: 'errore',
          messaggio: t('tracciaNonTrovata'),
        });
        return;
      }
      const dati = (await fetch(
        `/api/traccia?percorso=${encodeURIComponent(ultima.percorso)}`
      ).then((r) => r.json())) as DatiRiepilogo;
      setFase({ tipo: 'riepilogo', dati });
    } catch {
      setFase({ tipo: 'errore', messaggio: t('erroreLetturaTraccia') });
    }
  }, [t]);

  const avviaRegistrazione = useCallback(async () => {
    if (inviando) return;
    setInviando(true);
    try {
      const risposta = await fetch('/api/esegui', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: 'registrazione', parametri: { bersaglio: ambiente } }),
      });
      const corpo = (await risposta.json()) as RispostaEsegui;
      if (!risposta.ok || !corpo.id) {
        setFase({
          tipo: 'errore',
          messaggio: corpo.errore ?? t('erroreAvvioRegistrazione'),
        });
        return;
      }
      setFase({ tipo: 'in-corso', id: corpo.id, azione: 'registrazione' });
      scriviRiaggancio<DatiRiaggancio>(CHIAVE_RIAGGANCIO, {
        id: corpo.id,
        azione: 'registrazione',
      });
      osserva(corpo.id, 'registrazione', () => {
        void caricaRiepilogo();
      });
    } catch {
      setFase({ tipo: 'errore', messaggio: t('erroreParlareCruscotto') });
    } finally {
      setInviando(false);
    }
  }, [ambiente, osserva, caricaRiepilogo, inviando, t]);

  const generaTest = useCallback(async () => {
    if (inviando) return;
    if (fase.tipo === 'riepilogo') titoloPropostoRef.current = fase.dati.passi[0]?.nome ?? '';
    setInviando(true);
    try {
      const risposta = await fetch('/api/esegui', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: 'generazione', parametri: { manifesto: MANIFESTO } }),
      });
      const corpo = (await risposta.json()) as RispostaEsegui;
      if (!risposta.ok || !corpo.id) {
        setFase({
          tipo: 'errore',
          messaggio: corpo.errore ?? t('erroreAvvioGenerazione'),
        });
        return;
      }
      setFase({ tipo: 'in-corso', id: corpo.id, azione: 'generazione' });
      scriviRiaggancio<DatiRiaggancio>(CHIAVE_RIAGGANCIO, {
        id: corpo.id,
        azione: 'generazione',
      });
      osserva(corpo.id, 'generazione', dopoGenerazione);
    } catch {
      setFase({ tipo: 'errore', messaggio: t('erroreParlareCruscotto') });
    } finally {
      setInviando(false);
    }
  }, [osserva, dopoGenerazione, inviando, fase, t]);

  const interrompi = useCallback(async () => {
    if (fase.tipo !== 'in-corso') return;
    await fetch(`/api/esegui/${fase.id}/ferma`, { method: 'POST' }).catch(() => {
      // Se la richiesta non arriva, l'evento "fine" del flusso non arriva
      // comunque: il tester vede l'attesa continuare e puo' riprovare.
    });
  }, [fase]);

  // Riaggancio: appena la schermata si apre, prima di tutto chiede se c'era
  // gia' qualcosa in corso — nella sessione di lavoro (l'ha avviata questa
  // stessa schermata) o nel registro del server (avviata da un'altra). Un
  // solo controllo, non un intervallo: se non c'e' niente, la schermata resta
  // ferma finche' il tester non preme un pulsante.
  useEffect(() => {
    let attivo = true;

    const riagganciati = (id: string, azione: Azione) => {
      setFase({ tipo: 'in-corso', id, azione });
      osserva(id, azione, () => {
        if (azione === 'registrazione') {
          void caricaRiepilogo();
        } else {
          dopoGenerazione();
        }
      });
    };

    const salvato = leggiRiaggancio<DatiRiaggancio>(CHIAVE_RIAGGANCIO);
    if (salvato) {
      riagganciati(salvato.id, salvato.azione);
      return;
    }

    fetch('/api/esegui')
      .then((r) => r.json())
      .then((d: RispostaOperazioneInCorso) => {
        if (!attivo || !d.operazione) return;
        const { id, nome } = d.operazione;
        if (nome === 'registrazione' || nome === 'generazione') {
          riagganciati(id, nome);
        } else {
          setFase({ tipo: 'altrove', comando: nome });
        }
      })
      .catch(() => {
        // Nessuna notizia non e' una brutta notizia: si resta sulla scelta.
      });

    return () => {
      attivo = false;
    };
    // Solo all'apertura della schermata: `osserva` e `caricaRiepilogo`
    // dipendono solo da `t`, che non cambia a meta' sessione.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <h1 className="text-xl font-semibold" style={{ color: 'var(--testo)' }}>
        {t('titolo')}
      </h1>

      {fase.tipo === 'scelta' && (
        <div className="flex flex-col items-start gap-4">
          <p className="text-sm" style={{ color: 'var(--testo-tenue)' }}>
            {ambiente ? t('ambienteCorrente', { ambiente }) : t('nessunAmbiente')}
          </p>
          <button
            type="button"
            onClick={() => void avviaRegistrazione()}
            disabled={!ambiente || inviando}
            className="inline-flex min-h-10 items-center gap-2 rounded-md px-4 text-sm font-medium text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50"
            style={{ background: 'var(--blu-fondo)', outlineColor: 'var(--blu)' }}
          >
            <CircleDot size={18} aria-hidden="true" />
            {t('registraSessione')}
          </button>
        </div>
      )}

      {fase.tipo === 'in-corso' && (
        <div
          className="flex flex-col items-start gap-4 rounded-lg border p-6"
          style={{ borderColor: 'var(--bordo)', background: 'var(--superficie-tenue)' }}
        >
          <p
            className="flex items-center gap-2 text-sm font-medium"
            style={{ color: 'var(--testo)' }}
          >
            <Loader2 size={18} className="animate-spin" aria-hidden="true" />
            {fase.azione === 'registrazione'
              ? t('registrazioneInCorso')
              : t('generazioneInCorso')}
          </p>
          {fase.azione === 'registrazione' && (
            <p className="text-sm" style={{ color: 'var(--testo-tenue)' }}>
              {t('istruzioniRegistrazione')}
            </p>
          )}
          <p className="text-xs" style={{ color: 'var(--testo-tenue)' }} aria-live="polite">
            {t('eventiRicevuti', { n: righeRicevute })}
          </p>
          <button
            type="button"
            onClick={() => void interrompi()}
            className="inline-flex min-h-10 items-center gap-2 rounded-md border px-4 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ borderColor: 'var(--rosso)', color: 'var(--rosso)', outlineColor: 'var(--rosso)' }}
          >
            <Square size={16} aria-hidden="true" />
            {t('interrompi')}
          </button>
        </div>
      )}

      {fase.tipo === 'riepilogo' && (
        <div className="flex flex-col gap-6">
          <RiepilogoTraccia
            passi={fase.dati.passi}
            durata={fase.dati.durata}
            buchi={fase.dati.buchi}
          />
          <button
            type="button"
            onClick={() => void generaTest()}
            disabled={inviando}
            className="inline-flex min-h-10 w-fit items-center gap-2 rounded-md px-4 text-sm font-medium text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50"
            style={{ background: 'var(--blu-fondo)', outlineColor: 'var(--blu)' }}
          >
            {t('generaTest')}
          </button>
        </div>
      )}

      {fase.tipo === 'salva' && (
        <SalvaScenario
          titoloProposto={fase.titolo}
          onSalvato={(esito) => versoEsecuzione(esito)}
          onTieni={() => versoEsecuzione()}
        />
      )}

      {fase.tipo === 'errore' && (
        <div
          className="flex flex-col gap-3 rounded-lg border p-4 text-sm"
          style={{ borderColor: 'var(--rosso)', color: 'var(--rosso)', background: 'var(--superficie-tenue)' }}
        >
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} aria-hidden="true" className="mt-0.5 shrink-0" />
            <div className="flex-1">
              <p>{fase.messaggio}</p>
              {/*
               * Perche' e' successo, non solo che e' successo: le due cause
               * che si riconoscono con sicurezza dal testo vero dello script
               * (finding F2). Senza una causa nota, si mostrano le ultime
               * righe invece di indovinare.
               */}
              {fase.causa === 'browser-mancante' && <p>{t('erroreCausaBrowserMancante')}</p>}
              {fase.causa === 'indirizzo-irraggiungibile' && (
                <p>{t('erroreCausaIndirizzoIrraggiungibile')}</p>
              )}
            </div>
          </div>

          {!fase.causa && fase.righeTecniche && fase.righeTecniche.length > 0 && (
            <details className="text-xs" style={{ color: 'var(--testo)' }}>
              <summary
                className="cursor-pointer select-none font-medium min-h-10 flex items-center"
                style={{ color: 'var(--testo-tenue)' }}
              >
                {t('dettagliTecnici')}
              </summary>
              <pre
                className="mt-2 whitespace-pre-wrap break-words rounded-md p-2 m-0 font-mono"
                style={{ background: 'var(--superficie)', color: 'var(--testo)' }}
              >
                {fase.righeTecniche.join('\n')}
              </pre>
            </details>
          )}

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setFase({ tipo: 'scelta' })}
              className="inline-flex min-h-10 items-center rounded-md border px-3 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{ borderColor: 'var(--bordo)', color: 'var(--testo)', outlineColor: 'var(--blu)' }}
            >
              {t('riprova')}
            </button>
            {fase.causa && (
              <button
                type="button"
                onClick={() => router.push('/controllo')}
                className="inline-flex min-h-10 items-center rounded-md border px-3 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{ borderColor: 'var(--bordo)', color: 'var(--testo)', outlineColor: 'var(--blu)' }}
              >
                {t('vaiAControllo')}
              </button>
            )}
          </div>
        </div>
      )}

      {fase.tipo === 'altrove' && (
        <div
          className="flex items-center gap-3 rounded-lg border p-4 text-sm"
          style={{ borderColor: 'var(--ambra)', color: 'var(--testo)', background: 'var(--superficie-tenue)' }}
        >
          <AlertTriangle size={18} aria-hidden="true" style={{ color: 'var(--ambra)' }} />
          <span className="flex-1">
            {t('altroInCorso', { comando: t(ALTROVE[fase.comando]?.chiaveComando ?? 'comandoTest') })}
          </span>
          <button
            type="button"
            onClick={() => router.push(ALTROVE[fase.comando]?.percorso ?? '/controllo')}
            className="inline-flex min-h-10 items-center rounded-md border px-3 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ borderColor: 'var(--bordo)', color: 'var(--testo)', outlineColor: 'var(--blu)' }}
          >
            {t(ALTROVE[fase.comando]?.chiaveVai ?? 'vaiAControllo')}
          </button>
        </div>
      )}
    </div>
  );
}
