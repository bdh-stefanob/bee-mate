'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { AlertTriangle, Loader2, Square } from 'lucide-react';
import { PassoTest, type Passo } from '@/components/cruscotto/PassoTest';
import { cn } from '@/lib/utils';
import { dopoUnCambioDegliScenari } from '@/lib/stato-scenari';
import { formattaDurata, type Traduttore } from '@/lib/formato-quando';
import { leggiConLimite } from '@/lib/lettura';
import { TITOLO_SEZIONE } from '@/lib/scala-tipografica';

export type StatoCorsia = 'in corso' | 'conclusa' | 'fallita' | 'interrotta';

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

function formattaRiepilogo(passi: Passo[], t: Traduttore): string {
  const conteggio = conta(passi);
  return (['passato', 'fallito', 'saltato'] as const)
    .map((esito) => t(CHIAVE_ESITO[esito], { n: conteggio[esito] }))
    .join(', ');
}

/**
 * La riga d'esito in fondo: conteggio dei passi e, quando nota, la durata.
 * La durata si calcola dal momento in cui la corsia e' partita: ricaricando la
 * scheda a test concluso il tempo si perde (resta il conteggio, che arriva
 * sempre dal file).
 */
function rigaEsito(passi: Passo[], durataMs: number | null, locale: string, t: Traduttore): string {
  const riepilogo = formattaRiepilogo(passi, t);
  return durataMs === null ? riepilogo : `${riepilogo} · ${formattaDurata(durataMs, locale, t)}`;
}

/**
 * Quando l'esecuzione finisce male prima di produrre un solo passo, la sezione
 * dei passi non si disegna: e' lo scenario piu' probabile alla prima esecuzione,
 * e l'unico in cui la schermata non puo' restare muta. Zero passi e' sempre una
 * notizia, anche con codice zero.
 */
function deveMostrareErroreSenzaPassi(stato: StatoCorsia | null, passi: Passo[]): boolean {
  return stato !== null && stato !== 'in corso' && passi.length === 0;
}

function fraseSenzaPassi(stato: StatoCorsia | null, t: Traduttore): string {
  if (stato === 'interrotta') return t('senzaPassiInterrotto');
  if (stato === 'fallita') return t('senzaPassiFallito');
  return t('senzaPassiVuoto');
}

export interface PropsPannelloCorsia {
  /** Id dell'esecuzione (`test-...`), come lo restituisce il registro. */
  id: string;
  /** Posizione nella schermata, da 1: solo per il titolo. */
  numero: number;
  /** Ambiente della corsia; vuoto se la corsia e' stata riagganciata senza saperlo. */
  ambiente: string;
  /** Scenario scelto, nella forma `src/features/...`; vuoto vuol dire "tutti i registrati". */
  scenario: string;
  /** Quando la corsia e' partita, in millisecondi: serve solo alla durata. */
  avviatoAlle: number | null;
  /** Comunica lo stato della corsia alla schermata, che decide i bottoni "Interrompi tutto" e "Lancia". */
  onStato: (id: string, stato: StatoCorsia) => void;
}

/**
 * Una corsia sulla schermata Esecuzione: i suoi passi, il suo esito e il suo
 * "Interrompi". Ogni corsia legge i propri passi e il proprio flusso; la
 * schermata non conosce i dettagli, solo lo stato.
 */
export function PannelloCorsia({ id, numero, ambiente, scenario, avviatoAlle, onStato }: PropsPannelloCorsia) {
  const t = useTranslations('Esecuzione');
  const locale = useLocale();
  // Una corsia che il pannello monta e' in corso: lo stato finale arriva dal flusso.
  const [statoCorrente, setStatoCorrente] = useState<StatoCorsia>('in corso');
  const [passi, setPassi] = useState<Passo[]>([]);
  const [righeOutput, setRigheOutput] = useState<string[]>([]);
  const [codiceUscita, setCodiceUscita] = useState<number | null>(null);
  const [durataMs, setDurataMs] = useState<number | null>(null);
  const [interrompendo, setInterrompendo] = useState(false);

  const inCorso = statoCorrente === 'in corso';
  const etichettaScenario = scenario ? scenario.replace(/^src\/features\//, '') : t('tuttiIRegistrati');

  // I passi si aggiornano da soli mentre la corsia gira: una richiesta al secondo
  // basta, e si ferma da sola quando la corsia non e' piu' in corso.
  useEffect(() => {
    if (!inCorso) return;
    let attivo = true;
    const leggi = () => {
      leggiConLimite(`/api/passi?id=${encodeURIComponent(id)}`)
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

  // Il flusso dice quando la corsia e' conclusa: e' il segnale per smettere di
  // interrogare i passi e per un ultimo aggiornamento.
  useEffect(() => {
    if (!inCorso) return;
    const fonte = new EventSource(`/api/esegui/${encodeURIComponent(id)}/flusso`);
    // Le righe grezze si tengono solo per il caso senza passi (vedi sotto).
    const suRiga = (evento: MessageEvent<string>) => {
      try {
        const nuove = JSON.parse(evento.data) as string[];
        setRigheOutput((precedenti) => [...precedenti, ...nuove].slice(-20));
      } catch {
        // Una riga malformata non e' un guasto da segnalare: si ignora.
      }
    };
    const suFine = (evento: MessageEvent<string>) => {
      // L'esito per scenario e' gia' scritto (il server lo fa prima di dire
      // "finita"): si rilegge l'elenco, cosi' la pagina Scenari ha il dato nuovo.
      dopoUnCambioDegliScenari();
      let nuovo: StatoCorsia = 'conclusa';
      try {
        const dati = JSON.parse(evento.data) as { stato?: StatoCorsia; codice?: number | null };
        nuovo = dati.stato ?? 'conclusa';
        setCodiceUscita(dati.codice ?? null);
      } catch {
        // Un evento illeggibile: la corsia risulta conclusa.
      }
      setStatoCorrente(nuovo);
      setDurataMs(avviatoAlle !== null ? Date.now() - avviatoAlle : null);
      onStato(id, nuovo);
      fonte.close();
    };
    fonte.addEventListener('riga', suRiga);
    fonte.addEventListener('fine', suFine);
    // Nessun `close` sull'errore, ed e' deliberato: il browser riconnette da solo,
    // e alla riconnessione la rotta manda subito la fine se nel frattempo e' arrivata.
    return () => {
      fonte.removeEventListener('riga', suRiga);
      fonte.removeEventListener('fine', suFine);
      fonte.close();
    };
  }, [id, inCorso, avviatoAlle, onStato]);

  // Un ultimo giro sui passi quando la corsia si conclude: il file dei messaggi
  // puo' aver ricevuto le ultime righe dopo l'ultima lettura.
  useEffect(() => {
    if (inCorso) return;
    leggiConLimite(`/api/passi?id=${encodeURIComponent(id)}`)
      .then((r) => r.json())
      .then((d: { passi?: Passo[] }) => setPassi(d.passi ?? []))
      .catch(() => {});
  }, [id, inCorso]);

  const interrompi = async () => {
    setInterrompendo(true);
    await fetch(`/api/esegui/${encodeURIComponent(id)}/ferma`, { method: 'POST' }).catch(() => {
      // Se la richiesta non arriva, il flusso non manda comunque una fine: la
      // corsia resta in corso e il tester puo' riprovare.
    });
    setInterrompendo(false);
  };

  return (
    <section
      aria-labelledby={`corsia-${id}-titolo`}
      className="flex min-w-0 flex-col gap-4 rounded-scheda border p-4 border-bordo bg-superficie"
    >
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h2 id={`corsia-${id}-titolo`} className={cn(TITOLO_SEZIONE, 'text-testo')}>
          {t('corsiaNumero', { n: numero })}
        </h2>
        {inCorso && (
          <button
            type="button"
            onClick={() => void interrompi()}
            disabled={interrompendo}
            className="inline-flex min-h-10 items-center gap-2 rounded-controllo border px-4 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 border-rosso text-rosso outline-rosso"
          >
            <Square size={16} aria-hidden="true" />
            {t('interrompi')}
          </button>
        )}
      </header>

      <p className="text-sm text-testo-tenue">
        {ambiente ? t('ambienteCorrente', { ambiente }) : t('ambienteNonNoto')}
        {' · '}
        {etichettaScenario}
      </p>

      {inCorso && (
        <p className="flex items-center gap-2 text-sm font-medium text-testo">
          <Loader2 size={18} aria-hidden="true" className="animate-spin" />
          {t('testInCorso')}
        </p>
      )}

      {passi.length > 0 && (
        <section aria-label={t('passiAriaLabel')} className="flex flex-col gap-4 min-w-0">
          <ul className="flex flex-col gap-2" role="list">
            {passi.map((p, i) => (
              <PassoTest key={i} passo={p} />
            ))}
          </ul>
          <p className="text-sm font-semibold border-t pt-3 text-testo-tenue border-bordo">
            {rigaEsito(passi, durataMs, locale, t)}
          </p>
        </section>
      )}

      {deveMostrareErroreSenzaPassi(statoCorrente, passi) && (
        <section
          role="alert"
          aria-label={t('esitoAriaLabel')}
          className={cn('flex flex-col gap-2 rounded-scheda border p-4 text-sm bg-superficie-tenue', statoCorrente === 'fallita' ? 'border-rosso' : 'border-testo-tenue')}
        >
          <p className={cn('flex items-center gap-2 font-semibold', statoCorrente === 'fallita' ? 'text-rosso' : 'text-testo-tenue')}>
            <AlertTriangle size={18} aria-hidden="true" />
            {fraseSenzaPassi(statoCorrente, t)}
          </p>
          <p className="text-testo-tenue">
            {codiceUscita !== null ? t('codiceUscita', { codice: codiceUscita }) : t('nessunCodiceUscita')}
          </p>
          {righeOutput.length > 0 && (
            <pre className="text-xs whitespace-pre-wrap break-words rounded-scheda p-2 m-0 font-mono bg-superficie text-testo">
              {righeOutput.join('\n')}
            </pre>
          )}
        </section>
      )}
    </section>
  );
}
