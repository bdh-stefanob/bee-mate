'use client';

import { useCallback, useEffect, useState } from 'react';
import { PlayCircle, Loader2 } from 'lucide-react';
import { PassoTest, type Passo } from '@/components/cruscotto/PassoTest';
import { cn } from '@/lib/utils';

type StatoEsecuzione = 'in corso' | 'conclusa' | 'fallita' | 'interrotta';

const PAROLE_ESITO: Record<Passo['esito'], [string, string]> = {
  passato: ['superato', 'superati'],
  fallito: ['fallito', 'falliti'],
  saltato: ['saltato', 'saltati'],
};

function conta(passi: Passo[]): Record<Passo['esito'], number> {
  const conteggio: Record<Passo['esito'], number> = { passato: 0, fallito: 0, saltato: 0 };
  for (const p of passi) conteggio[p.esito]++;
  return conteggio;
}

function formattaRiepilogo(passi: Passo[]): string {
  const conteggio = conta(passi);
  return (['passato', 'fallito', 'saltato'] as const)
    .map((esito) => {
      const n = conteggio[esito];
      const [singolare, plurale] = PAROLE_ESITO[esito];
      return `${n} ${n === 1 ? singolare : plurale}`;
    })
    .join(', ');
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

export default function EsecuzionePage() {
  const [bersagli, setBersagli] = useState<string[]>([]);
  const [bersaglio, setBersaglio] = useState('');
  const [guardaIlBrowser, setGuardaIlBrowser] = useState(false);
  const [senzaSessione, setSenzaSessione] = useState(false);
  const [id, setId] = useState<string | null>(null);
  const [statoCorrente, setStatoCorrente] = useState<StatoEsecuzione | null>(null);
  const [passi, setPassi] = useState<Passo[]>([]);
  const [errore, setErrore] = useState<string | null>(null);
  const [inLancio, setInLancio] = useState(false);

  const inCorso = statoCorrente === 'in corso';

  useEffect(() => {
    let attivo = true;
    fetch('/api/configurazione')
      .then((r) => r.json())
      .then((d: { bersagli?: string[] }) => {
        if (!attivo) return;
        const elenco = d.bersagli ?? [];
        setBersagli(elenco);
        setBersaglio((corrente) => corrente || elenco[0] || '');
      })
      .catch(() => {});
    return () => {
      attivo = false;
    };
  }, []);

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
    const suFine = (evento: MessageEvent<string>) => {
      try {
        const dati = JSON.parse(evento.data) as { stato?: StatoEsecuzione };
        setStatoCorrente(dati.stato ?? 'conclusa');
      } catch {
        setStatoCorrente('conclusa');
      }
      fonte.close();
    };
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
      fonte.removeEventListener('fine', suFine);
      fonte.close();
    };
  }, [id, inCorso]);

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
        setErrore(dati.errore ?? 'Non e stato possibile lanciare il test.');
        return;
      }
      setId(dati.id);
      setStatoCorrente('in corso');
    } catch {
      setErrore('Non e stato possibile contattare il cruscotto.');
    } finally {
      setInLancio(false);
    }
  }, [bersaglio, guardaIlBrowser, senzaSessione]);

  return (
    <div className="flex flex-col gap-6 max-w-3xl min-w-0">
      <h1 className="text-xl font-semibold" style={{ color: 'var(--testo)' }}>
        Esecuzione
      </h1>

      <section
        className="flex flex-col gap-4 rounded-lg border p-4"
        style={{ borderColor: 'var(--bordo)', background: 'var(--superficie)' }}
      >
        <div className="flex flex-col gap-1">
          <label htmlFor="bersaglio" className="text-sm font-medium" style={{ color: 'var(--testo)' }}>
            Bersaglio
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
            {bersagli.length === 0 && <option value="">Nessun bersaglio configurato</option>}
            {bersagli.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>

        <Interruttore
          etichetta="Guarda il browser"
          attivo={guardaIlBrowser}
          onChange={setGuardaIlBrowser}
          disabilitato={inCorso}
        />
        <Interruttore
          etichetta="Parti senza sessione"
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
          {inCorso ? 'Test in corso' : 'Lancia il test'}
        </button>

        {errore && (
          <p role="alert" className="text-sm font-medium" style={{ color: 'var(--rosso)' }}>
            {errore}
          </p>
        )}
      </section>

      {passi.length > 0 && (
        <section aria-label="Passi del test" className="flex flex-col gap-4 min-w-0">
          <ul className="flex flex-col gap-2" role="list">
            {passi.map((p, i) => (
              <PassoTest key={i} passo={p} />
            ))}
          </ul>

          <p
            className="text-sm font-semibold border-t pt-3"
            style={{ color: 'var(--testo-tenue)', borderColor: 'var(--bordo)' }}
          >
            {formattaRiepilogo(passi)}
          </p>
        </section>
      )}
    </div>
  );
}
