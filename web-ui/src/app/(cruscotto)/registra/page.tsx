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
  ambiente: string;
}

type Fase =
  | { tipo: 'scelta' }
  | { tipo: 'in-corso'; id: string; azione: Azione }
  | { tipo: 'riepilogo'; dati: DatiRiepilogo }
  | { tipo: 'errore'; messaggio: string }
  | { tipo: 'altrove'; comando: NomeComando };

interface RispostaEsegui {
  id?: string;
  errore?: string;
}

interface RispostaConfigurazione {
  bersagli?: string[];
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
 * Registra: il tester sceglie l'ambiente, registra una sessione nel browser
 * che si apre, e vede subito cosa il sistema ne ha capito — prima di
 * generare qualunque file.
 */
export default function RegistraPage() {
  const t = useTranslations('Registra');
  const router = useRouter();
  const [ambienti, setAmbienti] = useState<string[]>([]);
  const [ambiente, setAmbiente] = useState('');
  const [fase, setFase] = useState<Fase>({ tipo: 'scelta' });
  const [righeRicevute, setRigheRicevute] = useState(0);
  // Il pulsante si spegne appena parte la richiesta, non quando torna: fra i
  // due momenti ci stanno comodi due click, cioe' due processi che scrivono
  // sullo stesso manifesto, e il secondo che arriva vince su quello che il
  // tester sta guardando.
  const [inviando, setInviando] = useState(false);
  const sorgenteRef = useRef<EventSource | null>(null);

  useEffect(() => {
    let attivo = true;
    fetch('/api/configurazione')
      .then((r) => r.json() as Promise<RispostaConfigurazione>)
      .then((d) => {
        if (!attivo) return;
        const elenco = d.bersagli ?? [];
        setAmbienti(elenco);
        setAmbiente((corrente) => corrente || elenco[0] || '');
      })
      .catch(() => {
        if (attivo) setAmbienti([]);
      });
    return () => {
      attivo = false;
    };
  }, []);

  useEffect(() => () => sorgenteRef.current?.close(), []);

  const osserva = useCallback(
    (id: string, azione: 'registrazione' | 'generazione', quandoConclusa: () => void) => {
      sorgenteRef.current?.close();
      setRigheRicevute(0);
      const sorgente = new EventSource(`/api/esegui/${id}/flusso`);
      sorgenteRef.current = sorgente;

      sorgente.addEventListener('riga', (evento) => {
        const nuove = JSON.parse((evento as MessageEvent).data) as string[];
        setRigheRicevute((n) => n + nuove.length);
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
          setFase({
            tipo: 'errore',
            messaggio:
              azione === 'registrazione'
                ? t('erroreRegistrazione')
                : t('erroreGenerazione'),
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
        ambiente,
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
        ambiente,
      });
      osserva(corpo.id, 'generazione', () =>
        // Il bersaglio su cui si e' appena registrato viaggia nella query
        // string: senza, la schermata di esecuzione ricadrebbe sul primo
        // dell'elenco, che puo' non essere quello appena usato.
        router.push(ambiente ? `/esecuzione?bersaglio=${encodeURIComponent(ambiente)}` : '/esecuzione')
      );
    } catch {
      setFase({ tipo: 'errore', messaggio: t('erroreParlareCruscotto') });
    } finally {
      setInviando(false);
    }
  }, [osserva, router, inviando, ambiente, t]);

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

    const riagganciati = (id: string, azione: Azione, ambienteRicordato: string) => {
      if (ambienteRicordato) setAmbiente(ambienteRicordato);
      setFase({ tipo: 'in-corso', id, azione });
      osserva(id, azione, () => {
        if (azione === 'registrazione') {
          void caricaRiepilogo();
        } else {
          router.push(
            ambienteRicordato
              ? `/esecuzione?bersaglio=${encodeURIComponent(ambienteRicordato)}`
              : '/esecuzione'
          );
        }
      });
    };

    const salvato = leggiRiaggancio<DatiRiaggancio>(CHIAVE_RIAGGANCIO);
    if (salvato) {
      riagganciati(salvato.id, salvato.azione, salvato.ambiente);
      return;
    }

    fetch('/api/esegui')
      .then((r) => r.json())
      .then((d: RispostaOperazioneInCorso) => {
        if (!attivo || !d.operazione) return;
        const { id, nome } = d.operazione;
        if (nome === 'registrazione' || nome === 'generazione') {
          riagganciati(id, nome, '');
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
          <label className="flex flex-col gap-1 text-sm" style={{ color: 'var(--testo)' }}>
            {t('ambiente')}
            <select
              value={ambiente}
              onChange={(e) => setAmbiente(e.target.value)}
              className="min-h-10 rounded-md border px-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{ borderColor: 'var(--bordo)', outlineColor: 'var(--blu)' }}
            >
              {ambienti.length === 0 && <option value="">{t('nessunAmbiente')}</option>}
              {ambienti.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </label>
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

      {fase.tipo === 'errore' && (
        <div
          className="flex items-center gap-3 rounded-lg border p-4 text-sm"
          style={{ borderColor: 'var(--rosso)', color: 'var(--rosso)', background: 'var(--superficie-tenue)' }}
        >
          <AlertTriangle size={18} aria-hidden="true" />
          <span className="flex-1">{fase.messaggio}</span>
          <button
            type="button"
            onClick={() => setFase({ tipo: 'scelta' })}
            className="inline-flex min-h-10 items-center rounded-md border px-3 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ borderColor: 'var(--bordo)', color: 'var(--testo)', outlineColor: 'var(--blu)' }}
          >
            {t('riprova')}
          </button>
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
