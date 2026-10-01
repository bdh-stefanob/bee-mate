/**
 * risorse-catalogo.ts
 * -------------------
 * Tutto cio' che la pagina Catalogo legge dal server, tenuto FUORI dai
 * componenti (stesso schema di `stato-controllo.ts`): una lettura sola per
 * finestra, mostrata da chiunque ne abbia bisogno con `useRisorsa`.
 *
 * Perche' fuori: l'intestazione e il contatore sulla linguetta hanno bisogno
 * di dati che stanno in schede NON montate (le coppie, mentre si guarda Step);
 * cambiare scheda e' istantaneo; e dopo una fusione la lista resta a schermo
 * mentre si rilegge (`aggiornando`), invece di smontarsi insieme al messaggio
 * di esito.
 */
import { creaRisorsa } from './risorsa';
import type { RispostaCatalogo, RispostaRiconciliazione } from '@/components/cruscotto/catalogo/tipi';
import type { EsitoAggiornamento } from './catalogo-numeri';

async function leggiJson<T>(rotta: string): Promise<T> {
  const risposta = await fetch(rotta);
  if (!risposta.ok) throw new Error(`HTTP ${risposta.status}`);
  return (await risposta.json()) as T;
}

export interface StatoAggiornamentoCatalogo {
  stato: EsitoAggiornamento;
  avviatoIl?: string;
  concluseIl?: string;
  durataMs?: number;
  totaleStep?: number;
  messaggio?: string;
}

export interface FileScenariRidotto {
  scenari: unknown[];
}

export const catalogo = creaRisorsa<RispostaCatalogo>(async () => {
  const corpo = await leggiJson<Partial<RispostaCatalogo>>('/api/catalogo');
  return { step: corpo.step ?? [], componenti: corpo.componenti ?? [] };
});

export const riconciliazione = creaRisorsa<RispostaRiconciliazione>(async () => {
  const corpo = await leggiJson<Partial<RispostaRiconciliazione>>('/api/catalogo/riconciliazione');
  return { coppie: corpo.coppie ?? [] };
});

/** Solo cio' che serve a contare: i file con i loro scenari eseguibili. */
export const scenari = creaRisorsa<FileScenariRidotto[]>(async () => {
  const corpo = await leggiJson<{ file?: FileScenariRidotto[] }>('/api/scenari');
  return (corpo.file ?? []).map((f) => ({ scenari: f.scenari ?? [] }));
});

export const statoAggiornamento = creaRisorsa<StatoAggiornamentoCatalogo>(() =>
  leggiJson<StatoAggiornamentoCatalogo>('/api/catalogo/stato')
);

/** Dopo una modifica al vocabolario (fusione, distinzione, annullamento): rilegge catalogo e coppie. */
export function ricaricaCatalogoECoppie(): Promise<void[]> {
  return Promise.all([catalogo.ricarica(), riconciliazione.ricarica()]);
}

/** Quante letture, al massimo, per accorgersi che lo script ha scritto il suo stato. */
const LETTURE_PER_VEDERE_LA_PARTENZA = 20;

/**
 * "Riprova ora": lancia il comando `catalogo` dell'elenco chiuso. true = partito.
 *
 * Lo stato lo scrive lo script, qualche istante DOPO l'avvio: leggerlo subito
 * darebbe quello di prima, e la pagina — che rilegge a intervalli solo mentre
 * vede "in corso" — non si accorgerebbe mai del giro nuovo (e non rileggerebbe
 * il catalogo alla fine). Quindi si rilegge finche' compare un giro nuovo.
 */
export async function rilanciaAggiornamento(pausaMs = 500): Promise<boolean> {
  try {
    const prima = statoAggiornamento.istantanea().dati?.avviatoIl;
    const risposta = await fetch('/api/esegui', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome: 'catalogo' }),
    });
    if (!risposta.ok) return false;
    for (let i = 0; i < LETTURE_PER_VEDERE_LA_PARTENZA; i++) {
      await statoAggiornamento.ricarica();
      const ora = statoAggiornamento.istantanea().dati;
      if (ora?.stato === 'in-corso' || (ora?.avviatoIl !== undefined && ora.avviatoIl !== prima)) {
        // Un giro cosi' breve da essere gia' concluso: nessuno ha visto "in corso", quindi rileggere tocca a noi.
        if (ora.stato !== 'in-corso') void ricaricaCatalogoECoppie();
        break;
      }
      await new Promise((r) => setTimeout(r, pausaMs));
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Dopo "Applica" o "Annulla" dei suggerimenti: rilancia l'aggiornamento del
 * catalogo. Se un altro comando e' in corso la rotta rifiuta (400): si riprova
 * UNA volta dopo `attesaMs`, poi si dice false e chi chiama lo spiega al tester.
 */
export async function riallineaCatalogo(attesaMs = 3000): Promise<boolean> {
  if (await rilanciaAggiornamento()) return true;
  await new Promise((r) => setTimeout(r, attesaMs));
  return rilanciaAggiornamento();
}
