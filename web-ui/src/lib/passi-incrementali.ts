import * as fs from 'fs';
import { cediIlTurno } from './cache-file';
import { creaAnalizzatore, passiDaAnalisi, type AnalizzatoreMessaggi, type PassoLetto } from './artefatti';

/**
 * passi-incrementali.ts
 * ---------------------
 * I passi di un test che gira, per `GET /api/passi` (una richiesta al secondo).
 *
 * Il file dei messaggi (`reports/cruscotto/<id>.ndjson`) cresce a ogni passo e
 * porta anche le schermate dei passi falliti, in base64: da 0,1 MB a decine di
 * MB. Rileggerlo e analizzarlo tutto a ogni secondo costava ~5,6 ms per MB —
 * 448 ms a 80 MB — e in quel tempo il server non serviva nient'altro.
 *
 * Qui si ricorda, per file, fin dove si e' gia' letto e lo stato dell'analisi, e
 * a ogni richiesta si legge solo cio' che e' stato aggiunto. Le schermate non si
 * tolgono: la finestra le mostra sotto il passo fallito, e la risposta resta
 * quella di prima.
 *
 * PERCHE' NON SI PUO' FIDARE SOLO DELLA DIMENSIONE: un file sostituito da un
 * altro piu' lungo avrebbe una dimensione "cresciuta" e un contenuto che non
 * c'entra. Per questo, prima di riprendere da dove si era, si confrontano gli
 * ultimi byte gia' letti con quelli che il file ha adesso in quel punto: se non
 * coincidono, o se il file e' piu' corto, si riparte da zero. Costa una lettura
 * di pochi byte.
 *
 * NON BLOCCA IL SERVER: si legge a pezzi, con le funzioni asincrone, e ogni
 * poche decine di millisecondi di analisi si restituisce il turno, cosi' le altre
 * richieste (la barra laterale, il flusso del test) vanno avanti anche durante
 * la prima lettura di un file da 80 MB.
 */

const BYTE_PER_PEZZO = 8 * 1024 * 1024;
const BYTE_DI_CONTROLLO = 64;
/** Dopo tanto lavoro di analisi si lascia andare avanti il resto del server. */
const MS_PRIMA_DI_CEDERE = 8;
/** Piu' di cosi' non serve: un test alla volta, al massimo un paio guardati. */
const MAX_FILE_RICORDATI = 4;

interface Ricordo {
  analizzatore: AnalizzatoreMessaggi;
  /** Byte gia' dati all'analisi: sempre alla fine di una riga intera. */
  letti: number;
  /** Gli ultimi byte gia' dati all'analisi, per riconoscere un file sostituito. */
  coda: Buffer;
  /** Una richiesta alla volta per file: la seconda aspetta la prima e trova il lavoro fatto. */
  catena: Promise<unknown>;
}

const ricordi = new Map<string, Ricordo>();
const statistiche = { byteLetti: 0 };

/** Per i test e per le misure: quanti byte di contenuto si sono letti dal disco in tutto. */
export function statistichePassi(): { byteLetti: number } {
  return { ...statistiche };
}

export function azzeraCachePassi(): void {
  ricordi.clear();
  statistiche.byteLetti = 0;
}

function nuovo(): Ricordo {
  return { analizzatore: creaAnalizzatore(), letti: 0, coda: Buffer.alloc(0), catena: Promise.resolve() };
}

function ricordoDi(percorso: string): Ricordo {
  let r = ricordi.get(percorso);
  if (r) {
    ricordi.delete(percorso); // il piu' recente va in fondo
  } else {
    r = nuovo();
  }
  ricordi.set(percorso, r);
  while (ricordi.size > MAX_FILE_RICORDATI) {
    const piuVecchio = ricordi.keys().next().value as string;
    ricordi.delete(piuVecchio);
  }
  return r;
}

function riparti(r: Ricordo): void {
  r.analizzatore = creaAnalizzatore();
  r.letti = 0;
  r.coda = Buffer.alloc(0);
}

async function leggiEsattamente(fh: fs.promises.FileHandle, posizione: number, lunghezza: number): Promise<Buffer> {
  const buf = Buffer.alloc(lunghezza);
  let fatti = 0;
  while (fatti < lunghezza) {
    const { bytesRead } = await fh.read(buf, fatti, lunghezza - fatti, posizione + fatti);
    if (bytesRead === 0) return buf.subarray(0, fatti); // il file si e' accorciato mentre si leggeva
    fatti += bytesRead;
  }
  return buf;
}

function ricordaCoda(r: Ricordo, consumati: Buffer): void {
  const tutti = Buffer.concat([r.coda, consumati]);
  r.coda = Buffer.from(tutti.subarray(Math.max(0, tutti.length - BYTE_DI_CONTROLLO)));
}

/** Da' all'analisi le righe intere di `blocco`, cedendo il turno ogni tanto. */
async function analizza(r: Ricordo, blocco: Buffer): Promise<void> {
  let ultimaCessione = Date.now();
  for (const riga of blocco.toString('utf-8').split('\n')) {
    r.analizzatore.aggiungiRiga(riga);
    if (Date.now() - ultimaCessione > MS_PRIMA_DI_CEDERE) {
      await cediIlTurno();
      ultimaCessione = Date.now();
    }
  }
}

async function aggiorna(percorso: string, r: Ricordo): Promise<void> {
  let fh: fs.promises.FileHandle;
  try {
    fh = await fs.promises.open(percorso, 'r');
  } catch {
    riparti(r);
    return;
  }
  try {
    const { size } = await fh.stat();
    if (size < r.letti) {
      riparti(r);
    } else if (r.coda.length > 0) {
      const adesso = await leggiEsattamente(fh, r.letti - r.coda.length, r.coda.length);
      if (!adesso.equals(r.coda)) riparti(r);
    }

    let lunghezzaPezzo = BYTE_PER_PEZZO;
    while (r.letti < size) {
      const lunghezza = Math.min(lunghezzaPezzo, size - r.letti);
      const pezzo = await leggiEsattamente(fh, r.letti, lunghezza);
      statistiche.byteLetti += pezzo.length;
      if (pezzo.length === 0) break;
      const fineUltimaRiga = pezzo.lastIndexOf(0x0a);

      if (fineUltimaRiga === -1) {
        if (r.letti + pezzo.length < size) {
          // Una riga piu' lunga del pezzo (una schermata grande): si riprova con un pezzo piu' largo.
          lunghezzaPezzo *= 2;
          continue;
        }
        break; // niente a capo e il file finisce qui: lo si guarda sotto
      }

      const intere = pezzo.subarray(0, fineUltimaRiga + 1);
      await analizza(r, intere);
      ricordaCoda(r, intere);
      r.letti += intere.length;
      lunghezzaPezzo = BYTE_PER_PEZZO;
    }

    // Un ultimo messaggio completo ma senza a capo (il processo e' stato
    // ucciso, o lo scrittore non ha ancora messo l'a capo): se e' JSON intero
    // lo si prende subito. Se e' a meta' si aspetta: la prossima volta si
    // ricomincia da qui, senza averlo contato.
    if (r.letti < size) {
      const coda = await leggiEsattamente(fh, r.letti, size - r.letti);
      const testo = coda.toString('utf-8');
      if (testo.trim() !== '' && eJsonIntero(testo)) {
        r.analizzatore.aggiungiRiga(testo);
        ricordaCoda(r, coda);
        r.letti += coda.length;
      }
    }
  } finally {
    await fh.close();
  }
}

function eJsonIntero(testo: string): boolean {
  try {
    JSON.parse(testo);
    return true;
  } catch {
    return false;
  }
}

/**
 * Gli stessi passi di `leggiPassiTest`, ma rileggendo solo cio' che il file ha
 * guadagnato dall'ultima volta. Un file che non c'e' da' un elenco vuoto.
 */
export async function leggiPassiTestIncrementale(percorso: string): Promise<PassoLetto[]> {
  const r = ricordoDi(percorso);
  const lavoro = r.catena.then(() => aggiorna(percorso, r));
  r.catena = lavoro.catch(() => undefined);
  try {
    await lavoro;
  } catch {
    // Un errore di lettura a meta': si riparte da zero la prossima volta, e per ora si dice "niente".
    riparti(r);
    return [];
  }
  return passiDaAnalisi(r.analizzatore.risultato());
}
