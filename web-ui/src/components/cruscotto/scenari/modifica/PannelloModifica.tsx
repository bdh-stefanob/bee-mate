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
  valutaSemplicita,
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
  leggiCartelleDalServer,
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
import { ConfermaElimina, ConfermaSposta } from './ConfermeImmediate';
import { Avanzate } from './Avanzate';
import { EditorTesto } from './EditorTesto';
import { DialogoNonSalvate } from './DialogoNonSalvate';
import { DialogoConflitto } from './DialogoConflitto';
import { BannerRifiuto, BannerSalvata } from './BannerEsito';
import { ElencoMessaggi } from './MessaggiControllo';
import { Bottone, CLASSE_CAMPO, STILE_CAMPO } from './stile';
import { TITOLO_GRUPPO } from '@/lib/scala-tipografica';

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

/** Cosa si sta per salvare: il testo della bozza, o un'azione che vale oltre il testo e si applica subito. */
type OpInVolo =
  | { tipo: 'testo' }
  | { tipo: 'rinomina'; da: string; a: string }
  | { tipo: 'sposta'; flusso: string }
  | { tipo: 'elimina' };

interface StatoSposta {
  flusso: string;
  anteprima: Anteprima | null;
  errore: ErroreServer | null;
  occupato: boolean;
}

/**
 * Uno scenario che non e' piu' dov'era: la pagina Scenari lo segue (spostato) o sceglie
 * il vicino (eliminato), e offre di annullare. Il pannello si smonta: l'avviso sta fuori.
 */
export type AzioneFatta =
  | { tipo: 'eliminato'; file: string; nome: string }
  | { tipo: 'spostato'; da: string; a: string; nome: string; flusso: string };

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
  onAzione,
}: {
  /** Percorso relativo a `src/features/`: serve solo alle rotte, non si mostra. */
  file: string;
  focusIniziale: Focus | null;
  /** Il tester ha chiuso la modifica (anche scartando): si torna alla lettura. */
  onEsci: () => void;
  /** Una modifica e' stata salvata o annullata: l'elenco si rilegge e l'indirizzo si aggiorna. */
  onTermine: (titolo: string) => void;
  /** Lo scenario e' stato spostato o eliminato: non e' piu' qui. */
  onAzione: (azione: AzioneFatta) => void;
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
  // Il testo avanzato (spec A9) o la modifica guidata: la bozza e' la stessa stringa, cambia il modo di toccarla.
  const [modo, setModo] = useState<'guidata' | 'testo'>('guidata');
  const [sposta, setSposta] = useState<StatoSposta | null>(null);
  const [flussi, setFlussi] = useState<string[]>([]);
  // L'anteprima di sposta/elimina che la conferma mostra (i passi che vanno e restano, dove va lo scenario).
  const [anteprimaAzione, setAnteprimaAzione] = useState<Anteprima | null>(null);
  const [occupatoAzione, setOccupatoAzione] = useState(false);

  const operazione = useRef<OpInVolo>({ tipo: 'testo' });
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
      // Un file con piu' scenari, esempi o tabelle non ha la modifica guidata, ma ha il testo.
      // Un documento (`@non-automatizzato`) e uno scenario non ancora salvato non si modificano in nessun modo.
      if (r.corpo.semplice || r.corpo.ragione === 'complesso') {
        dispatch({ tipo: 'letto', testo: r.corpo.testo, versione: r.corpo.versione, marcatore: r.corpo.marcatore });
        if (!r.corpo.semplice) setModo('testo');
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
        operazione.current = { tipo: 'rinomina', da: rinomina.da, a };
        dispatch({ tipo: 'chiedi-rinomina' });
      }
    } catch {
      setRinomina((x) => (x ? { ...x, occupato: false, errore: { errore: 'rete' } } : x));
    }
  };

  // --- Testo avanzato ------------------------------------------------------

  // Un file che non e' semplice (piu' scenari, esempi, tabelle) ha solo il testo; uno semplice ci passa e ne torna.
  const soloTesto = meta !== null && !meta.semplice;
  const puoiTornareGuidata = !soloTesto && valutaSemplicita(b.testo).semplice;

  // Un editor che riceve dal di fuori il testo appena salvato lo riscrive e lo ridice: non e' una
  // modifica del tester, e non deve cancellare l'esito ("Salvato", "Annulla") ne' sporcare la bozza.
  const suTesto = (testo: string) => {
    if (testo === b.testo) return;
    applicaGesto(() => testo);
  };

  const passaATesto = () => {
    setCampoTitolo(null);
    setApertura(null);
    setModo('testo');
  };

  const tornaGuidata = () => {
    if (!puoiTornareGuidata) return;
    setCampoTitolo(null);
    setModo('guidata');
  };

  // --- Sposta ed elimina (si applicano subito, come la rinomina, solo a bozza pulita) --

  const apriSposta = async () => {
    if (fase === 'sporca') {
      dispatch({ tipo: 'chiedi', quale: 'sposta' });
      return;
    }
    setRifiuto(null);
    setSposta({ flusso: '', anteprima: null, errore: null, occupato: false });
    try {
      const r = await leggiCartelleDalServer();
      // Solo i flussi della stessa applicazione (M4), senza quello in cui lo scenario sta gia'.
      if (r.ok) {
        const [app, flussoAttuale] = file.split('/');
        setFlussi((r.corpo.cartelle.find((c) => c.app === app)?.flussi ?? []).filter((f) => f !== flussoAttuale));
      }
    } catch {
      /* i suggerimenti sono un aiuto, non un requisito: si scrive a mano */
    }
  };

  const controllaSposta = async () => {
    if (!sposta) return;
    const flusso = sposta.flusso.trim();
    if (!flusso) return;
    setSposta({ ...sposta, occupato: true, errore: null });
    try {
      const r = await chiediAnteprima({ operazione: 'sposta', file, versione: b.versione, flusso });
      if (!r.ok) {
        setSposta((x) => (x ? { ...x, occupato: false, errore: r.corpo } : x));
        return;
      }
      setSposta((x) => (x ? { ...x, occupato: false } : x));
      setAnteprimaAzione(r.corpo);
      operazione.current = { tipo: 'sposta', flusso };
      dispatch({ tipo: 'chiedi', quale: 'sposta' });
    } catch {
      setSposta((x) => (x ? { ...x, occupato: false, errore: { errore: 'rete' } } : x));
    }
  };

  const apriElimina = async () => {
    if (fase === 'sporca') {
      dispatch({ tipo: 'chiedi', quale: 'elimina' });
      return;
    }
    setRifiuto(null);
    setSposta(null);
    setOccupatoAzione(true);
    try {
      // L'elenco delle conseguenze si calcola PRIMA, sul disco di adesso, e si mostra nel dialogo.
      const r = await chiediAnteprima({ operazione: 'elimina', file, versione: b.versione });
      if (!r.ok) {
        setRifiuto(r.corpo);
        return;
      }
      setAnteprimaAzione(r.corpo);
      operazione.current = { tipo: 'elimina' };
      dispatch({ tipo: 'chiedi', quale: 'elimina' });
    } catch {
      setRifiuto({ errore: 'rete' });
    } finally {
      setOccupatoAzione(false);
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
    operazione.current = { tipo: 'testo' };
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
          op.tipo === 'testo'
            ? { operazione: 'testo', file, versione: b.versione, testo: b.testo }
            : op.tipo === 'rinomina'
              ? { operazione: 'rinomina', file, versione: b.versione, da: op.da, a: op.a }
              : op.tipo === 'sposta'
                ? { operazione: 'sposta', file, versione: b.versione, flusso: op.flusso }
                : { operazione: 'elimina', file, versione: b.versione }
        );
        if (!r.ok) {
          // Il conflitto con "il mio testo" ha senso solo per un testo: spostare o eliminare un file cambiato non si "salva comunque".
          if (r.stato === 409 && r.corpo.errore === 'conflitto' && (op.tipo === 'testo' || op.tipo === 'rinomina')) {
            dispatch({ tipo: 'conflitto', attuale: r.corpo.attuale ?? { testo: '', versione: b.versione } });
          } else {
            dispatch({ tipo: 'rifiutata', codice: r.corpo.errore });
            setRifiuto(r.corpo);
          }
          return;
        }
        // Sposta ed elimina: lo scenario non e' piu' qui. La pagina lo segue (o sceglie il vicino) e offre di annullare.
        if (op.tipo === 'elimina' || op.tipo === 'sposta') {
          const nome = titoloDi(b.letto);
          setSposta(null);
          setAnteprimaAzione(null);
          dispatch({ tipo: 'esci' });
          if (op.tipo === 'elimina') onAzione({ tipo: 'eliminato', file, nome });
          else if (r.corpo.file) onAzione({ tipo: 'spostato', da: file, a: r.corpo.file, nome, flusso: op.flusso });
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
  }, [fase, file, b.versione, b.testo, b.letto, aggiornaMeta, onTermine, onAzione]);

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
        <h3 id={`${id}-titolo`} className={TITOLO_GRUPPO} style={{ color: 'var(--testo-tenue)' }}>
          {t('modificaTitolo')}
        </h3>
        <Bottone disabled={occupato} onClick={() => dispatch({ tipo: 'vuole-uscire', verso: '' })}>
          <X size={16} aria-hidden="true" />
          {t('chiudi')}
        </Bottone>
      </div>

      {modo === 'guidata' ? (
      <>
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
                    <div className="ml-6 flex flex-col gap-2 rounded-scheda border p-3" style={{ borderColor: 'var(--bordo)', background: 'var(--superficie-tenue)' }}>
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
          <div className="flex flex-col gap-2 rounded-scheda border p-3" style={{ borderColor: 'var(--bordo)', background: 'var(--superficie-tenue)' }}>
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
      </>
      ) : (
        <EditorTesto testo={b.testo} espressioni={meta?.espressioni ?? []} occupato={occupato} onCambia={suTesto} />
      )}

      <Avanzate
        modo={modo}
        semplice={meta?.semplice ?? true}
        puoiTornareGuidata={puoiTornareGuidata}
        occupato={occupato || occupatoAzione}
        aperto={soloTesto}
        onApriTesto={passaATesto}
        onTornaGuidata={tornaGuidata}
        onSposta={() => void apriSposta()}
        onElimina={() => void apriElimina()}
      />
      {(b.avviso === 'salva-prima-sposta' || b.avviso === 'salva-prima-elimina') && (
        <p role="alert" className="text-sm" style={{ color: 'var(--ambra)' }}>
          {b.avviso === 'salva-prima-sposta' ? t('spostaSalvaPrima') : t('eliminaSalvaPrima')}
        </p>
      )}
      {sposta && (fase === 'pulita' || fase === 'salvata' || fase === 'conferma') && (
        <div className="flex flex-col gap-2 rounded-scheda border p-3" style={{ borderColor: 'var(--bordo)', background: 'var(--superficie-tenue)' }}>
          <label htmlFor={`${id}-sposta`} className="text-sm font-medium" style={{ color: 'var(--testo)' }}>
            {t('spostaCampo', { app: file.split('/')[0] })}
          </label>
          <input
            id={`${id}-sposta`}
            autoFocus
            value={sposta.flusso}
            list={`${id}-flussi`}
            autoComplete="off"
            aria-describedby={`${id}-sposta-aiuto`}
            onChange={(e) => setSposta({ ...sposta, flusso: e.target.value, anteprima: null, errore: null })}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void controllaSposta();
              if (e.key === 'Escape') setSposta(null);
            }}
            className={CLASSE_CAMPO}
            style={STILE_CAMPO}
          />
          <datalist id={`${id}-flussi`}>
            {flussi.map((f) => (
              <option key={f} value={f} />
            ))}
          </datalist>
          <p id={`${id}-sposta-aiuto`} className="text-xs" style={{ color: 'var(--testo-tenue)' }}>
            {t('spostaAiuto')}
          </p>
          {sposta.errore && <BannerRifiuto errore={sposta.errore} />}
          <div className="flex flex-wrap gap-2">
            <Bottone primario disabled={sposta.occupato || !sposta.flusso.trim() || fase === 'conferma'} onClick={() => void controllaSposta()}>
              {sposta.occupato && <Loader2 size={16} aria-hidden="true" className="animate-spin motion-reduce:animate-none" />}
              {t('spostaAvanti')}
            </Bottone>
            <Bottone onClick={() => setSposta(null)}>{t('annulla')}</Bottone>
          </div>
        </div>
      )}

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
          {/* Un file cambiato mentre si spostava o eliminava: la versione che si ha e' vecchia, "riprova" ricadrebbe nello stesso conflitto. Si riapre. */}
          {rifiuto.errore === 'conflitto' ? (
            <Bottone onClick={onEsci}>{t('chiudi')}</Bottone>
          ) : (
            <Bottone
              onClick={() => {
                setRifiuto(null);
                dispatch({ tipo: 'riprova' });
              }}
            >
              {t('riprova')}
            </Bottone>
          )}
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
      {fase === 'conferma' && b.conferma === 'elimina' && anteprimaAzione?.passi && (
        <ConfermaElimina
          nome={titoloDi(b.letto)}
          vanno={anteprimaAzione.passi.vanno}
          restano={anteprimaAzione.passi.restano}
          onConferma={() => dispatch({ tipo: 'conferma' })}
          onIndietro={() => {
            setAnteprimaAzione(null);
            dispatch({ tipo: 'indietro' });
          }}
        />
      )}
      {fase === 'conferma' && b.conferma === 'sposta' && sposta && (
        <ConfermaSposta
          nome={titoloDi(b.letto)}
          da={file.split('/')[1] ?? ''}
          a={sposta.flusso.trim()}
          onConferma={() => dispatch({ tipo: 'conferma' })}
          onIndietro={() => {
            setAnteprimaAzione(null);
            dispatch({ tipo: 'indietro' });
          }}
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
