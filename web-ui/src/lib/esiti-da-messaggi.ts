import { analizzaMessaggi, riepilogoErrore, type CasoAnalizzato, type RiepilogoErrore } from './artefatti';
import { rimuoviCodiciAnsi } from './ansi';
import { improntaDiTesto } from './impronta-scenario';
import { REPO_ROOT } from './repo';

/**
 * Dai messaggi di Cucumber a un esito per scenario.
 *
 * E' la parte della pagina Scenari dove un numero puo' essere sbagliato con
 * l'aria giusta, quindi le regole sono scritte una per una (e provate in
 * `esiti-da-messaggi.test.ts`):
 *
 *  - il tentativo che conta e' l'ultimo: uno con `willBeRetried` non vale;
 *  - un caso senza `testCaseFinished` (processo ucciso a meta') non e' ne'
 *    rosso ne' verde: non produce niente;
 *  - fallito se un passo e' FAILED o AMBIGUOUS; anche se un passo e' UNDEFINED
 *    o PENDING senza altri fallimenti, perche' uno scenario che non puo'
 *    partire non e' verde;
 *  - `testRunFinished.success` NON si guarda: dice com'e' andata l'esecuzione
 *    intera, e lo scenario A puo' essere verde mentre il B e' rosso;
 *  - uno scenario i cui passi sono tutti saltati non e' verde: non produce
 *    niente;
 *  - un esito non porta mai uno screenshot, il messaggio grezzo o i codici
 *    colore: dice a che passo si e' fermato e basta.
 */

export interface PassoFallito {
  /** 1-based, fra i passi dello scenario. */
  numero: number;
  totale: number;
  testo: string;
  motivo: 'errore' | 'non-collegato';
  riepilogo?: RiepilogoErrore;
}

export interface VoceEsito {
  /** Percorso relativo a `src/features/`, con `/`: lo stesso di `FileScenari.file`. */
  file: string;
  /** Il nome della definizione nel file, mai quello espanso di un esempio. */
  nome: string;
  esito: 'passato' | 'fallito';
  /** ISO: la fine dello scenario. */
  quando: string;
  durataMs: number;
  /** Su quale ambiente e' girato; `null` quando non si sa (indice ricostruito). */
  ambiente: string | null;
  /** L'id dell'esecuzione: serve al futuro "Vedi la schermata". */
  esecuzione: string;
  /** Hash del testo del sorgente com'era al lancio. */
  impronta: string;
  passoFallito?: PassoFallito;
}

export interface OpzioniEstrazione {
  ambiente: string | null;
  esecuzione: string;
}

const RADICE_FEATURES = 'src/features/';
const LUNGHEZZA_MASSIMA_RIGA = 300;

/** `src\features\shop\order\x.feature` -> `shop/order/x.feature`. */
export function fileDaUri(uri: string): string {
  const conBarre = uri.replace(/\\/g, '/').replace(/^\.\//, '');
  return conBarre.startsWith(RADICE_FEATURES) ? conBarre.slice(RADICE_FEATURES.length) : conBarre;
}

const FALLITI = new Set(['FAILED', 'AMBIGUOUS']);
const NON_COLLEGATI = new Set(['UNDEFINED', 'PENDING']);

interface EsitoDiCaso {
  esito: 'passato' | 'fallito';
  passoFallito?: PassoFallito;
  durataMs: number;
  fineMs: number;
}

function riepilogoPulito(messaggio: string): RiepilogoErrore {
  const r = riepilogoErrore(rimuoviCodiciAnsi(messaggio, REPO_ROOT));
  return { ...r, primaRiga: r.primaRiga.slice(0, LUNGHEZZA_MASSIMA_RIGA) };
}

function esitoDelCaso(caso: CasoAnalizzato): EsitoDiCaso | null {
  if (!caso.finito || caso.ritentato) return null;
  if (caso.fineMs === undefined) return null;

  const durataMs = caso.inizioMs !== undefined ? Math.max(0, caso.fineMs - caso.inizioMs) : 0;
  const totale = caso.passiPickle.length;
  const numeroDi = (pickleStepId?: string): number =>
    pickleStepId ? caso.passiPickle.findIndex((p) => p.id === pickleStepId) + 1 : 0;
  const testoDi = (pickleStepId?: string): string =>
    caso.passiPickle.find((p) => p.id === pickleStepId)?.testo ?? '';

  const fallito = caso.passi.find((p) => FALLITI.has(p.stato));
  if (fallito) {
    const numero = numeroDi(fallito.pickleStepId);
    return {
      esito: 'fallito',
      durataMs,
      fineMs: caso.fineMs,
      // Un guasto in un hook (prima o dopo lo scenario) non ha un numero di
      // passo: lo scenario e' rosso, e non si inventa dove.
      ...(numero > 0
        ? {
            passoFallito: {
              numero,
              totale,
              testo: testoDi(fallito.pickleStepId),
              motivo: 'errore' as const,
              ...(fallito.messaggio ? { riepilogo: riepilogoPulito(fallito.messaggio) } : {}),
            },
          }
        : {}),
    };
  }

  const nonCollegato = caso.passi.find((p) => NON_COLLEGATI.has(p.stato));
  if (nonCollegato) {
    const numero = numeroDi(nonCollegato.pickleStepId);
    return {
      esito: 'fallito',
      durataMs,
      fineMs: caso.fineMs,
      ...(numero > 0
        ? { passoFallito: { numero, totale, testo: testoDi(nonCollegato.pickleStepId), motivo: 'non-collegato' as const } }
        : {}),
    };
  }

  // Niente di rosso: verde solo se qualcosa e' davvero girato.
  const passiDelloScenario = caso.passi.filter((p) => p.pickleStepId);
  if (passiDelloScenario.length === 0 || passiDelloScenario.every((p) => p.stato === 'SKIPPED')) return null;
  return { esito: 'passato', durataMs, fineMs: caso.fineMs };
}

/**
 * Le voci d'esito di un'esecuzione: una per scenario (file + nome), anche se lo
 * scenario e' stato girato per piu' esempi. Con piu' esempi la voce e' rossa se
 * anche uno solo lo e' (con il primo passo fallito trovato), la durata e' la
 * somma, `quando` il momento piu' recente.
 */
export function estraiVoci(testo: string, opzioni: OpzioniEstrazione): VoceEsito[] {
  const analisi = analizzaMessaggi(testo);
  const perChiave = new Map<string, VoceEsito & { fineMs: number }>();

  for (const caso of analisi.casi) {
    const e = esitoDelCaso(caso);
    if (!e || !caso.uri || !caso.nome) continue;
    const file = fileDaUri(caso.uri);
    const chiave = `${file}\u0000${caso.nome}`;
    const sorgente = analisi.sorgenti.get(caso.uri);
    const precedente = perChiave.get(chiave);

    if (!precedente) {
      perChiave.set(chiave, {
        file,
        nome: caso.nome,
        esito: e.esito,
        quando: new Date(e.fineMs).toISOString(),
        durataMs: e.durataMs,
        ambiente: opzioni.ambiente,
        esecuzione: opzioni.esecuzione,
        impronta: sorgente !== undefined ? improntaDiTesto(sorgente) : '',
        ...(e.passoFallito ? { passoFallito: e.passoFallito } : {}),
        fineMs: e.fineMs,
      });
      continue;
    }

    // Un altro esempio dello stesso scenario.
    precedente.durataMs += e.durataMs;
    if (e.fineMs > precedente.fineMs) {
      precedente.fineMs = e.fineMs;
      precedente.quando = new Date(e.fineMs).toISOString();
    }
    if (e.esito === 'fallito') {
      if (precedente.esito !== 'fallito') {
        precedente.esito = 'fallito';
        if (e.passoFallito) precedente.passoFallito = e.passoFallito;
      } else if (!precedente.passoFallito && e.passoFallito) {
        precedente.passoFallito = e.passoFallito;
      }
    }
  }

  return [...perChiave.values()].map((v) => {
    const voce: VoceEsito & { fineMs?: number } = { ...v };
    delete voce.fineMs;
    return voce;
  });
}
