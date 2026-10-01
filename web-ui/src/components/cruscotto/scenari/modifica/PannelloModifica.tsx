'use client';

import { useCallback, useEffect, useId, useMemo, useReducer, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Loader2, Plus, X } from 'lucide-react';
import {
  aggiungiVerifica,
  cambiaTitolo,
  leggiPassi,
  MAX_TITOLO,
  rigaScenario,
  rimuoviPasso,
  sostituisciPasso,
  titoloDi,
} from '@/lib/modifica-scenario';
import {
  bozzaIniziale,
  haModificheNonSalvate,
  riduci,
  type Focus,
} from '@/lib/bozza-scenario';
import {
  chiediAnnulla,
  chiediAnteprima,
  chiediModifica,
  leggiContenutoDalServer,
  type Anteprima,
  type ErroreServer,
} from '@/lib/client-modifica';
import type { Contenuto } from '@/lib/contenuto-scenario';
import type { Messaggio } from '@/lib/convalida-scenario';
import { indirizzoEsecuzione } from '@/lib/percorso-esecuzione';
import { useModifiche } from '@/context/ModificheContext';
import { RigaPasso } from './RigaPasso';
import { SelettorePasso } from './SelettorePasso';
import { ConfermaConseguenze } from './ConfermaConseguenze';
import { DialogoNonSalvate } from './DialogoNonSalvate';
import { DialogoConflitto } from './DialogoConflitto';
import { BannerRifiuto, BannerSalvata } from './BannerEsito';
import { ElencoMessaggi } from './MessaggiControllo';
import { Bottone, CLASSE_CAMPO, STILE_CAMPO } from './stile';

type Apertura = { tipo: 'rinomina' | 'selettore'; riga: number } | { tipo: 'verifica' } | null;

interface StatoRinomina {
  riga: number;
  da: string;
  a: string;
  anteprima: Anteprima | null;
  errore: ErroreServer | null;
  occupato: boolean;
}

interface EsitoSalvato {
  scenari: number;
  avvisi: Messaggio[];
  marcatoreTolto: boolean;
  catalogoRigenerato: boolean | null;
}

const titoloValido = (v: string): boolean => {
  const s = v.trim();
  return s !== '' && s.length <= MAX_TITOLO && !/[\r\n]/.test(s);
};

/**
 * La modifica guidata di UNO scenario salvato (spec A2-A6, A11), nel pannello della
 * pagina Scenari al posto della lettura. Gesti sulle righe che ci sono — titolo,
 * usa un altro passo, togli il passo, aggiungi una verifica — che si salvano
 * insieme con "Controlla e salva"; e la rinomina di un passo, che vale ovunque, con
 * elenco e conferma, e si applica subito (solo a bozza pulita).
 *
 * Tutta la logica di stato sta in `bozza-scenario.ts` (riduttore puro, provato con
 * vitest); qui si disegna e si chiamano le rotte. Il tester non vede mai Gherkin ne'
 * percorsi: vede passi, frasi e nomi di scenario.
 */
export function PannelloModifica({
  file,
  focusIniziale,
  onEsci,
  onTermine,
}: {
  /** Percorso relativo a `src/features/`: serve solo alle rotte, non si mostra. */
  file: string;
  focusIniziale: Focus | null;
  /** Il tester ha chiuso la modifica (anche scartando): si torna alla lettura. */
  onEsci: () => void;
  /** Una modifica e' stata salvata o annullata: l'elenco si rilegge e l'indirizzo si aggiorna. */
  onTermine: (titolo: string) => void;
}) {
  const t = useTranslations('ModificaScenario');
  const router = useRouter();
  const id = useId();
  const modifiche = useModifiche();

  const [b, dispatch] = useReducer(riduci, undefined, () =>
    riduci(bozzaIniziale(), { tipo: 'apri', ...(focusIniziale ? { focus: focusIniziale } : {}) })
  );
  const [meta, setMeta] = useState<Contenuto | null>(null);
  const [campoTitolo, setCampoTitolo] = useState<string | null>(null);
  const [apertura, setApertura] = useState<Apertura>(null);
  const [rinomina, setRinomina] = useState<StatoRinomina | null>(null);
  const [verifica, setVerifica] = useState('');
  const [controllo, setControllo] = useState<{ blocchi: Messaggio[]; avvisi: Messaggio[] } | null>(null);
  const [esito, setEsito] = useState<EsitoSalvato | null>(null);
  const [rifiuto, setRifiuto] = useState<ErroreServer | null>(null);
  const [occupatoAnnulla, setOccupatoAnnulla] = useState(false);
  // Dove mettere il fuoco dopo un gesto: un passo (per posizione, perche' le righe si spostano) o il titolo.
  const [daFocalizzare, setDaFocalizzare] = useState<{ indice: number } | { titolo: true } | null>(null);

  const operazione = useRef<'testo' | { da: string; a: string }>('testo');
  const inVoloControllo = useRef(false);
  const inVoloSalvataggio = useRef(false);
  const focusFatto = useRef(false);
  const titoloRef = useRef<HTMLInputElement>(null);
  const righe = useRef(new Map<number, HTMLElement>());

  const fase = b.fase;
  const occupato = fase === 'controllo' || fase === 'salvataggio' || fase === 'conferma' || fase === 'conflitto';
  const passi = useMemo(() => leggiPassi(b.testo), [b.testo]);
  const metaPerFrase = useMemo(() => new Map((meta?.passi ?? []).map((p) => [p.frase, p])), [meta]);
  const nonSalvate = haModificheNonSalvate(b);

  // --- Lettura ------------------------------------------------------------

  const carica = useCallback(async () => {
    try {
      const r = await leggiContenutoDalServer(file);
      if (!r.ok) {
        dispatch({ tipo: 'lettura-fallita' });
        return;
      }
      setMeta(r.corpo);
      if (r.corpo.semplice) {
        dispatch({ tipo: 'letto', testo: r.corpo.testo, versione: r.corpo.versione, marcatore: r.corpo.marcatore });
      } else {
        dispatch({ tipo: 'non-modificabile', ragione: r.corpo.ragione ?? 'complesso' });
      }
    } catch {
      dispatch({ tipo: 'lettura-fallita' });
    }
  }, [file]);

  useEffect(() => {
    if (fase === 'carico') void carica();
  }, [fase, carica]);

  /** Dopo un salvataggio o un annullamento: chi condivide cosa e' cambiato. */
  const aggiornaMeta = useCallback(async () => {
    try {
      const r = await leggiContenutoDalServer(file);
      if (r.ok) setMeta(r.corpo);
    } catch {
      /* si tengono i dati di prima: la rinomina si offre solo dove si sapeva */
    }
  }, [file]);

  // --- Fuoco --------------------------------------------------------------

  // Entrando in modifica il fuoco va al titolo, o al passo su cui si e' cliccato.
  useEffect(() => {
    if (fase !== 'pulita' || focusFatto.current) return;
    focusFatto.current = true;
    if (b.focus?.tipo === 'passo') {
      const el = righe.current.get(b.focus.riga);
      if (el) {
        el.focus();
        el.scrollIntoView({ block: 'nearest' });
        return;
      }
    }
    titoloRef.current?.focus();
  }, [fase, b.focus]);

  useEffect(() => {
    if (!daFocalizzare) return;
    if ('titolo' in daFocalizzare) titoloRef.current?.focus();
    else {
      const p = passi[Math.min(daFocalizzare.indice, passi.length - 1)];
      const el = (p ? righe.current.get(p.riga) : undefined) ?? titoloRef.current;
      el?.focus();
    }
    setDaFocalizzare(null);
  }, [daFocalizzare, passi]);

  // --- Modifiche non salvate: barra laterale, elenco, chiusura della finestra --

  const { imposta } = modifiche;
  useEffect(() => {
    imposta(nonSalvate, (verso) => dispatch({ tipo: 'vuole-uscire', verso }));
    return () => imposta(false, null);
  }, [nonSalvate, imposta]);

  useEffect(() => {
    if (!nonSalvate) return;
    // Il browser chiede conferma; in Electron lo gestisce `will-prevent-unload` in main.js.
    const alloScarico = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', alloScarico);
    return () => window.removeEventListener('beforeunload', alloScarico);
  }, [nonSalvate]);

  useEffect(() => {
    const via = b.proseguire;
    if (!via) return;
    dispatch({ tipo: 'proseguito' });
    if (via.tipo !== 'verso') return;
    if (via.verso === '') onEsci();
    else if (via.verso.startsWith('/scenari')) router.replace(via.verso, { scroll: false });
    else router.push(via.verso);
  }, [b.proseguire, onEsci, router]);

  // --- Gesti sul testo ----------------------------------------------------

  const applicaGesto = (calcola: () => string) => {
    if (occupato) return;
    try {
      dispatch({ tipo: 'modifica', testo: calcola() });
    } catch {
      // Un gesto che il testo rifiuta (riga che non c'e' piu') non cambia niente.
      return;
    }
    setControllo(null);
    setEsito(null);
    setRifiuto(null);
  };

  const suTitolo = (valore: string) => {
    setCampoTitolo(valore);
    if (titoloValido(valore)) applicaGesto(() => cambiaTitolo(b.testo, valore));
  };

  const usaAltro = (indice: number, frase: string) => {
    applicaGesto(() => sostituisciPasso(b.testo, passi[indice].riga, frase));
    setApertura(null);
    setDaFocalizzare({ indice });
  };

  const togli = (indice: number) => {
    applicaGesto(() => rimuoviPasso(b.testo, passi[indice].riga));
    setApertura(null);
    // Il passo dopo prende il posto di quello tolto; se era l'ultimo, il fuoco va a quello di prima.
    setDaFocalizzare({ indice });
  };

  const aggiungi = () => {
    if (!verifica.trim()) return;
    applicaGesto(() => aggiungiVerifica(b.testo, verifica));
    setVerifica('');
    setApertura(null);
  };

  // --- Rinomina (vale ovunque) --------------------------------------------

  const apriRinomina = (riga: number, frase: string) => {
    if (fase === 'sporca') {
      dispatch({ tipo: 'chiedi-rinomina' });
      return;
    }
    setRinomina({ riga, da: frase, a: frase, anteprima: null, errore: null, occupato: false });
    setApertura({ tipo: 'rinomina', riga });
  };

  const controllaRinomina = async () => {
    if (!rinomina) return;
    const a = rinomina.a.trim();
    if (!a || a === rinomina.da) return;
    setRinomina({ ...rinomina, occupato: true, errore: null, anteprima: null });
    try {
      const r = await chiediAnteprima({ operazione: 'rinomina', file, versione: b.versione, da: rinomina.da, a });
      if (!r.ok) {
        setRinomina((x) => (x ? { ...x, occupato: false, errore: r.corpo } : x));
        return;
      }
      setRinomina((x) => (x ? { ...x, occupato: false, anteprima: r.corpo } : x));
      if (r.corpo.blocchi.length === 0) {
        operazione.current = { da: rinomina.da, a };
        dispatch({ tipo: 'chiedi-rinomina' });
      }
    } catch {
      setRinomina((x) => (x ? { ...x, occupato: false, errore: { errore: 'rete' } } : x));
    }
  };

  // --- Controllo e salvataggio --------------------------------------------

  const apriConflitto = useCallback(async () => {
    try {
      const r = await leggiContenutoDalServer(file);
      if (r.ok) {
        dispatch({ tipo: 'conflitto', attuale: { testo: r.corpo.testo, versione: r.corpo.versione } });
        return;
      }
    } catch {
      /* il file non si legge piu': resta l'errore */
    }
    dispatch({ tipo: 'rifiutata', codice: 'conflitto' });
    setRifiuto({ errore: 'conflitto' });
  }, [file]);

  // "Controlla e salva", e il "Salva" del dialogo delle modifiche non salvate: entrambi portano qui.
  useEffect(() => {
    if (fase !== 'controllo' || inVoloControllo.current) return;
    inVoloControllo.current = true;
    operazione.current = 'testo';
    void (async () => {
      try {
        const r = await chiediAnteprima({ operazione: 'testo', file, versione: b.versione, testo: b.testo });
        if (!r.ok) {
          if (r.stato === 409 && r.corpo.errore === 'conflitto') await apriConflitto();
          else {
            dispatch({ tipo: 'rifiutata', codice: r.corpo.errore });
            setRifiuto(r.corpo);
          }
          return;
        }
        setControllo({ blocchi: r.corpo.blocchi, avvisi: r.corpo.avvisi });
        dispatch({ tipo: 'controllato', blocchi: r.corpo.blocchi.length, tocca: false });
      } catch {
        dispatch({ tipo: 'rifiutata', codice: 'rete' });
        setRifiuto({ errore: 'rete' });
      } finally {
        inVoloControllo.current = false;
      }
    })();
  }, [fase, file, b.versione, b.testo, apriConflitto]);

  useEffect(() => {
    if (fase !== 'salvataggio' || inVoloSalvataggio.current) return;
    inVoloSalvataggio.current = true;
    const op = operazione.current;
    void (async () => {
      try {
        const r = await chiediModifica(
          op === 'testo'
            ? { operazione: 'testo', file, versione: b.versione, testo: b.testo }
            : { operazione: 'rinomina', file, versione: b.versione, da: op.da, a: op.a }
        );
        if (!r.ok) {
          if (r.stato === 409 && r.corpo.errore === 'conflitto') {
            dispatch({ tipo: 'conflitto', attuale: r.corpo.attuale ?? { testo: '', versione: b.versione } });
          } else {
            dispatch({ tipo: 'rifiutata', codice: r.corpo.errore });
            setRifiuto(r.corpo);
          }
          return;
        }
        dispatch({ tipo: 'salvata', testo: r.corpo.testo, versione: r.corpo.versione });
        setEsito({
          scenari: r.corpo.scenari.length,
          avvisi: r.corpo.avvisi,
          marcatoreTolto: r.corpo.marcatoreTolto,
          catalogoRigenerato: r.corpo.catalogoRigenerato,
        });
        setControllo(null);
        setRifiuto(null);
        setCampoTitolo(null);
        setRinomina(null);
        setApertura(null);
        void aggiornaMeta();
        onTermine(titoloDi(r.corpo.testo));
      } catch {
        dispatch({ tipo: 'rifiutata', codice: 'rete' });
        setRifiuto({ errore: 'rete' });
      } finally {
        inVoloSalvataggio.current = false;
      }
    })();
    // La bozza non si muove mentre si salva (i gesti sono ignorati): b.versione e b.testo sono quelli del via.
  }, [fase, file, b.versione, b.testo, aggiornaMeta, onTermine]);

  const annullaUltima = async () => {
    setOccupatoAnnulla(true);
    setRifiuto(null);
    try {
      const r = await chiediAnnulla();
      if (!r.ok) {
        setRifiuto(r.corpo);
        return;
      }
      if (r.corpo.attuale) {
        dispatch({ tipo: 'annullata', testo: r.corpo.attuale.testo, versione: r.corpo.attuale.versione });
        setCampoTitolo(null);
        setEsito(null);
        void aggiornaMeta();
        onTermine(titoloDi(r.corpo.attuale.testo));
      }
    } catch {
      setRifiuto({ errore: 'rete' });
    } finally {
      setOccupatoAnnulla(false);
    }
  };

  // --- Disegno ------------------------------------------------------------

  const scegliNonSalvate = (scelta: 'salva' | 'scarta' | 'resta') => {
    if (scelta === 'scarta') {
      setCampoTitolo(null);
      setControllo(null);
      setRifiuto(null);
      setApertura(null);
      setRinomina(null);
    }
    dispatch({ tipo: 'scelta', scelta });
  };

  if (fase === 'carico' || fase === 'lettura') {
    return (
      <p role="status" className="flex items-center gap-2 text-sm" style={{ color: 'var(--testo-tenue)' }}>
        <Loader2 size={16} aria-hidden="true" className="animate-spin motion-reduce:animate-none" />
        {t('caricamento')}
      </p>
    );
  }

  if (fase === 'errore' && b.letto === '') {
    return (
      <div role="alert" className="flex flex-col items-start gap-2 text-sm" style={{ color: 'var(--rosso)' }}>
        <p>{t('letturaErrore')}</p>
        <Bottone onClick={() => dispatch({ tipo: 'apri' })}>{t('riprova')}</Bottone>
      </div>
    );
  }

  if (fase === 'non-modificabile') {
    return (
      <div className="flex flex-col items-start gap-3 text-sm" style={{ color: 'var(--testo)' }}>
        <p>
          {b.ragione === 'registrato'
            ? t('nonModificabileRegistrato')
            : b.ragione === 'documento'
              ? t('nonModificabileDocumento')
              : t('nonModificabileComplesso')}
        </p>
        <Bottone onClick={onEsci}>{t('chiudi')}</Bottone>
      </div>
    );
  }

  const titoloVisibile = campoTitolo ?? titoloDi(b.testo);
  const titoloInvalido = campoTitolo !== null && !titoloValido(campoTitolo);
  const indirizzoEsegui = indirizzoEsecuzione(file, rigaScenario(b.letto));
  const stato = fase === 'controllo' ? t('controllo') : fase === 'salvataggio' ? t('salvataggio') : '';
  const mostraTuo = b.marcatore && (fase === 'pulita' || fase === 'sporca' || fase === 'controllo' || fase === 'errore');

  return (
    <section aria-labelledby={`${id}-titolo`} className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id={`${id}-titolo`} className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--testo-tenue)' }}>
          {t('modificaTitolo')}
        </h3>
        <Bottone disabled={occupato} onClick={() => dispatch({ tipo: 'vuole-uscire', verso: '' })}>
          <X size={16} aria-hidden="true" />
          {t('chiudi')}
        </Bottone>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${id}-campo-titolo`} className="text-sm font-medium" style={{ color: 'var(--testo)' }}>
          {t('titoloCampo')}
        </label>
        <input
          id={`${id}-campo-titolo`}
          ref={titoloRef}
          value={titoloVisibile}
          maxLength={MAX_TITOLO + 20}
          disabled={occupato}
          aria-invalid={titoloInvalido}
          aria-describedby={titoloInvalido ? `${id}-titolo-errore` : undefined}
          onChange={(e) => suTitolo(e.target.value)}
          className={CLASSE_CAMPO}
          style={titoloInvalido ? { ...STILE_CAMPO, borderColor: 'var(--rosso)' } : STILE_CAMPO}
        />
        {titoloInvalido && (
          <p id={`${id}-titolo-errore`} role="alert" className="text-sm" style={{ color: 'var(--rosso)' }}>
            {t('titoloNonValido')}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <h4 className="text-sm font-medium" style={{ color: 'var(--testo)' }}>
          {t('passi')}
        </h4>
        <ol className="flex flex-col gap-2">
          {passi.map((p, i) => {
            const meta1 = metaPerFrase.get(p.frase);
            const aperta = apertura && 'riga' in apertura && apertura.riga === p.riga ? apertura : null;
            return (
              <RigaPasso
                key={p.riga}
                passo={p}
                indice={i + 1}
                totale={passi.length}
                meta={meta1}
                occupato={occupato}
                puoiTogliere={passi.length > 1}
                innescoRef={(el) => {
                  if (el) righe.current.set(p.riga, el);
                  else righe.current.delete(p.riga);
                }}
                onRinomina={() => apriRinomina(p.riga, p.frase)}
                onUsaAltro={() => setApertura({ tipo: 'selettore', riga: p.riga })}
                onTogli={() => togli(i)}
                pannello={
                  aperta?.tipo === 'selettore' ? (
                    <SelettorePasso
                      offribili={meta?.offribili ?? []}
                      corrente={p.frase}
                      onScegli={(frase) => usaAltro(i, frase)}
                      onChiudi={() => {
                        setApertura(null);
                        setDaFocalizzare({ indice: i });
                      }}
                    />
                  ) : aperta?.tipo === 'rinomina' && rinomina ? (
                    <div className="ml-6 flex flex-col gap-2 rounded-md border p-3" style={{ borderColor: 'var(--bordo)', background: 'var(--superficie-tenue)' }}>
                      <label htmlFor={`${id}-rinomina`} className="text-sm font-medium" style={{ color: 'var(--testo)' }}>
                        {t('rinominaCampo')}
                      </label>
                      <input
                        id={`${id}-rinomina`}
                        autoFocus
                        value={rinomina.a}
                        autoComplete="off"
                        onChange={(e) => setRinomina({ ...rinomina, a: e.target.value, anteprima: null, errore: null })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') void controllaRinomina();
                          if (e.key === 'Escape') {
                            setApertura(null);
                            setRinomina(null);
                            setDaFocalizzare({ indice: i });
                          }
                        }}
                        className={CLASSE_CAMPO}
                        style={STILE_CAMPO}
                      />
                      {rinomina.errore && <BannerRifiuto errore={rinomina.errore} />}
                      {rinomina.anteprima && rinomina.anteprima.blocchi.length > 0 && (
                        <ElencoMessaggi blocchi={rinomina.anteprima.blocchi} avvisi={rinomina.anteprima.avvisi} />
                      )}
                      <div className="flex flex-wrap gap-2">
                        <Bottone
                          primario
                          disabled={rinomina.occupato || !rinomina.a.trim() || rinomina.a.trim() === rinomina.da}
                          onClick={() => void controllaRinomina()}
                        >
                          {rinomina.occupato && <Loader2 size={16} aria-hidden="true" className="animate-spin motion-reduce:animate-none" />}
                          {t('rinominaAvanti')}
                        </Bottone>
                        <Bottone
                          onClick={() => {
                            setApertura(null);
                            setRinomina(null);
                            setDaFocalizzare({ indice: i });
                          }}
                        >
                          {t('annulla')}
                        </Bottone>
                      </div>
                    </div>
                  ) : undefined
                }
              />
            );
          })}
        </ol>
        {b.avviso === 'salva-prima' && (
          <p role="alert" className="text-sm" style={{ color: 'var(--ambra)' }}>
            {t('rinominaSalvaPrima')}
          </p>
        )}

        {apertura?.tipo === 'verifica' ? (
          <div className="flex flex-col gap-2 rounded-md border p-3" style={{ borderColor: 'var(--bordo)', background: 'var(--superficie-tenue)' }}>
            <label htmlFor={`${id}-verifica`} className="text-sm font-medium" style={{ color: 'var(--testo)' }}>
              {t('verificaCampo')}
            </label>
            <input
              id={`${id}-verifica`}
              autoFocus
              value={verifica}
              autoComplete="off"
              onChange={(e) => setVerifica(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') aggiungi();
                if (e.key === 'Escape') setApertura(null);
              }}
              className={CLASSE_CAMPO}
              style={STILE_CAMPO}
            />
            <div className="flex flex-wrap gap-2">
              <Bottone primario disabled={!verifica.trim()} onClick={aggiungi}>
                {t('aggiungi')}
              </Bottone>
              <Bottone onClick={() => setApertura(null)}>{t('annulla')}</Bottone>
            </div>
          </div>
        ) : (
          <div>
            <Bottone disabled={occupato} onClick={() => setApertura({ tipo: 'verifica' })}>
              <Plus size={16} aria-hidden="true" />
              {t('aggiungiVerifica')}
            </Bottone>
          </div>
        )}
      </div>

      {mostraTuo && (
        <p className="text-sm" style={{ color: 'var(--testo-tenue)' }}>
          {t('diventaTuo')}
        </p>
      )}

      {controllo && (fase === 'sporca' || fase === 'controllo') && (
        <ElencoMessaggi blocchi={controllo.blocchi} avvisi={controllo.avvisi} />
      )}

      <div role="status" aria-live="polite" className="min-h-5 text-sm" style={{ color: 'var(--testo-tenue)' }}>
        {stato && (
          <span className="flex items-center gap-2">
            <Loader2 size={16} aria-hidden="true" className="animate-spin motion-reduce:animate-none" />
            {stato}
          </span>
        )}
      </div>

      {fase === 'errore' && rifiuto && (
        <div className="flex flex-col items-start gap-2">
          <BannerRifiuto errore={rifiuto} />
          <Bottone
            onClick={() => {
              setRifiuto(null);
              dispatch({ tipo: 'riprova' });
            }}
          >
            {t('riprova')}
          </Bottone>
        </div>
      )}

      {fase === 'salvata' && esito && (
        <BannerSalvata
          scenari={esito.scenari}
          avvisi={esito.avvisi}
          marcatoreTolto={esito.marcatoreTolto}
          catalogoRigenerato={esito.catalogoRigenerato}
          indirizzoEsegui={indirizzoEsegui}
          occupato={occupatoAnnulla}
          onAnnulla={() => void annullaUltima()}
        />
      )}
      {fase !== 'errore' && rifiuto && fase !== 'conflitto' && <BannerRifiuto errore={rifiuto} />}

      <div className="flex flex-wrap gap-2">
        <Bottone primario disabled={fase !== 'sporca' || titoloInvalido} onClick={() => dispatch({ tipo: 'controlla' })}>
          {t('salva')}
        </Bottone>
        <Bottone disabled={fase !== 'sporca'} onClick={() => dispatch({ tipo: 'annulla-modifiche' })}>
          {t('annullaModifiche')}
        </Bottone>
      </div>

      {b.miaBozza !== null && (
        <details className="text-sm" style={{ color: 'var(--testo)' }}>
          <summary className="min-h-10 cursor-pointer py-2 font-medium">{t('miaBozzaTitolo')}</summary>
          <textarea readOnly value={b.miaBozza} rows={8} aria-label={t('miaBozzaTitolo')} className={`${CLASSE_CAMPO} font-mono text-xs`} style={STILE_CAMPO} />
        </details>
      )}

      {fase === 'conferma' && b.conferma === 'rinomina' && rinomina?.anteprima && (
        <ConfermaConseguenze
          da={rinomina.da}
          a={rinomina.a.trim()}
          scenari={rinomina.anteprima.conseguenze.scenari}
          avvisi={rinomina.anteprima.avvisi}
          onConferma={() => dispatch({ tipo: 'conferma' })}
          onIndietro={() => dispatch({ tipo: 'indietro' })}
        />
      )}
      {b.inSospeso && <DialogoNonSalvate onScelta={scegliNonSalvate} />}
      {fase === 'conflitto' && (
        <DialogoConflitto
          testoMio={b.testo}
          onVediAttuale={() => {
            setCampoTitolo(null);
            setControllo(null);
            dispatch({ tipo: 'adotta-attuale' });
          }}
          onSalvaComunque={() => dispatch({ tipo: 'salva-comunque' })}
        />
      )}
    </section>
  );
}
