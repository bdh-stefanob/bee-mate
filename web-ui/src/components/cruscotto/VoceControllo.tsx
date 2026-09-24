'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { AlertTriangle, Check, CheckCircle2, Copy, Loader2, Play, Square, XCircle } from 'lucide-react';
import { comeComandoEseguibile } from '@/lib/rimedi';
import type { VoceDiagnosi } from '@/lib/controllo';

type StatoRimedio = 'inattivo' | 'avvio' | 'in corso' | 'conclusa' | 'fallita' | 'interrotta' | 'errore';

interface Props {
  voce: VoceDiagnosi;
  /** Chiamato quando il rimedio e' finito con successo: la pagina puo' ricontrollare. */
  onRimediato?: () => void;
}

interface EventoRiga extends MessageEvent {
  data: string;
}

const CHIAVE_PAROLA: Record<VoceDiagnosi['esito'], 'esitoOk' | 'esitoAttenzione' | 'esitoManca'> = {
  ok: 'esitoOk',
  attenzione: 'esitoAttenzione',
  manca: 'esitoManca',
};

const ASPETTO: Record<VoceDiagnosi['esito'], { Icona: typeof CheckCircle2; colore: string }> = {
  ok: { Icona: CheckCircle2, colore: 'var(--verde)' },
  attenzione: { Icona: AlertTriangle, colore: 'var(--ambra)' },
  manca: { Icona: XCircle, colore: 'var(--rosso)' },
};

/** Una riga di stato della diagnosi, con l'eventuale rimedio nella stessa riga. */
export function VoceControllo({ voce, onRimediato }: Props) {
  const t = useTranslations();
  const tv = useTranslations('VoceControllo');
  const { Icona, colore } = ASPETTO[voce.esito];
  const nome = t(voce.chiaveNome);
  const dettaglio = t(voce.chiaveDettaglio, voce.dati);
  const dallaFinestra = voce.chiaveDallaFinestra ? t(voce.chiaveDallaFinestra) : undefined;
  const comando = comeComandoEseguibile(voce.rimedio?.chiuso);

  const [statoRimedio, setStatoRimedio] = useState<StatoRimedio>('inattivo');
  const [idEsecuzione, setIdEsecuzione] = useState<string | undefined>();
  const [ultimaRiga, setUltimaRiga] = useState('');
  const [messaggioErrore, setMessaggioErrore] = useState('');
  const [copiato, setCopiato] = useState(false);
  const sorgenteRef = useRef<EventSource | null>(null);

  useEffect(() => {
    return () => {
      sorgenteRef.current?.close();
    };
  }, []);

  async function avvia() {
    if (!comando) return;
    setStatoRimedio('avvio');
    setMessaggioErrore('');
    setUltimaRiga('');
    try {
      const risposta = await fetch('/api/esegui', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: comando }),
      });
      const corpo = (await risposta.json()) as { id?: string; errore?: string };
      if (!risposta.ok || !corpo.id) {
        setStatoRimedio('errore');
        setMessaggioErrore(corpo.errore ?? tv('erroreNonPartito'));
        return;
      }
      setIdEsecuzione(corpo.id);
      setStatoRimedio('in corso');

      const sorgente = new EventSource(`/api/esegui/${corpo.id}/flusso`);
      sorgenteRef.current = sorgente;
      sorgente.addEventListener('riga', (evento) => {
        const righe = JSON.parse((evento as EventoRiga).data) as string[];
        if (righe.length > 0) setUltimaRiga(righe[righe.length - 1]);
      });
      sorgente.addEventListener('fine', (evento) => {
        const dettagli = JSON.parse((evento as EventoRiga).data) as { stato: string };
        sorgente.close();
        if (dettagli.stato === 'conclusa') {
          setStatoRimedio('conclusa');
          onRimediato?.();
        } else if (dettagli.stato === 'interrotta') {
          setStatoRimedio('interrotta');
        } else {
          setStatoRimedio('fallita');
        }
      });
      // Nessun `close` sull'errore, ed e' deliberato — stesso criterio gia'
      // corretto nella schermata Esecuzione (vedi il commento li'): chiudere
      // qui spegne per sempre la riconnessione che il browser fa da solo, e
      // un portatile che si sospende o un ricarico in sviluppo lascerebbero
      // questa riga a girare con la rotellina anche a rimedio gia' concluso.
    } catch {
      setStatoRimedio('errore');
      setMessaggioErrore(tv('erroreNonRiuscitoPartire'));
    }
  }

  async function ferma() {
    if (!idEsecuzione) return;
    try {
      await fetch(`/api/esegui/${idEsecuzione}/ferma`, { method: 'POST' });
    } catch {
      // Il tentativo di fermare resta best-effort: lo stato arriva comunque dal flusso.
    }
  }

  async function copiaComando() {
    if (!voce.rimedio) return;
    try {
      await navigator.clipboard.writeText(voce.rimedio.comando);
      setCopiato(true);
      setTimeout(() => setCopiato(false), 2000);
    } catch {
      // Senza clipboard il comando resta comunque leggibile: nessun guasto da mostrare.
    }
  }

  return (
    <li
      className="flex max-w-2xl flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-start sm:justify-between"
      style={{ borderColor: 'var(--bordo)', background: 'var(--superficie)' }}
    >
      <div className="flex min-w-0 items-start gap-3">
        <Icona size={22} aria-hidden="true" style={{ color: colore }} className="mt-0.5 shrink-0" />
        <div className="min-w-0">
          <p className="font-medium break-words" style={{ color: 'var(--testo)' }}>
            {nome} <span style={{ color: colore }}>— {tv(CHIAVE_PAROLA[voce.esito])}</span>
          </p>
          <p className="text-sm break-words" style={{ color: 'var(--testo-tenue)' }}>{dettaglio}</p>

          <p className="mt-1 text-xs break-words" aria-live="polite">
            {statoRimedio === 'avvio' && <span style={{ color: 'var(--testo-tenue)' }}>{tv('avvioInCorso')}</span>}
            {statoRimedio === 'in corso' && (
              <span style={{ color: 'var(--testo-tenue)' }}>{ultimaRiga || tv('inCorso')}</span>
            )}
            {statoRimedio === 'conclusa' && (
              <span style={{ color: 'var(--verde)' }}>{tv('conclusa')}</span>
            )}
            {(statoRimedio === 'fallita' || statoRimedio === 'interrotta') && (
              <span style={{ color: 'var(--rosso)' }}>{tv('nonAndata')}</span>
            )}
            {statoRimedio === 'errore' && messaggioErrore && (
              <span style={{ color: 'var(--rosso)' }}>{messaggioErrore}</span>
            )}
          </p>
        </div>
      </div>

      {dallaFinestra && (
        <span className="text-sm" style={{ color: 'var(--testo-tenue)' }}>
          {dallaFinestra}
        </span>
      )}

      {voce.rimedio && (
        <div className="flex shrink-0 items-center gap-2 sm:pl-3">
          {comando ? (
            statoRimedio === 'in corso' ? (
              <button
                type="button"
                onClick={ferma}
                aria-label={tv('fermaAria', { nome })}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-md border px-3 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{ borderColor: 'var(--bordo)', color: 'var(--testo)', outlineColor: 'var(--blu)' }}
              >
                <Square size={16} aria-hidden="true" />
                {tv('ferma')}
              </button>
            ) : (
              <button
                type="button"
                onClick={avvia}
                disabled={statoRimedio === 'avvio'}
                aria-label={tv('rimediaAria', { nome })}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-md px-3 text-sm font-medium text-white disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{ background: 'var(--blu-fondo)', outlineColor: 'var(--blu)' }}
              >
                {statoRimedio === 'avvio' ? (
                  <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                ) : (
                  <Play size={16} aria-hidden="true" />
                )}
                {tv('rimedia')}
              </button>
            )
          ) : (
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <code
                className="max-w-[16rem] truncate rounded px-2 py-1.5 text-xs"
                style={{ background: 'var(--superficie-tenue)', color: 'var(--testo)' }}
                title={voce.rimedio.comando}
              >
                {voce.rimedio.comando}
              </code>
              <button
                type="button"
                onClick={copiaComando}
                aria-label={tv('copiaComandoAria', { nome, comando: voce.rimedio.comando })}
                className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-md border px-3 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{ borderColor: 'var(--bordo)', color: 'var(--testo)', outlineColor: 'var(--blu)' }}
              >
                {copiato ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
                {copiato ? tv('copiato') : tv('copiaComando')}
              </button>
            </div>
          )}
        </div>
      )}
    </li>
  );
}
