import * as fs from 'fs';
import * as path from 'path';
import { createHash } from 'crypto';
import { walkFeatures } from './features';

/**
 * cache-file.ts
 * -------------
 * Una cache per file, per le rotte che rileggevano TUTTO a ogni chiamata
 * (`/api/scenari`, `/api/catalogo`): si ricalcola solo cio' che e' cambiato.
 *
 * LA REGOLA CHE NON SI PIEGA: la cache non deve mai mostrare un risultato
 * vecchio dopo che il file e' cambiato — anche se a cambiarlo e' stato
 * qualcuno da fuori (l'editor, `git checkout`, un altro programma), non
 * soltanto il cruscotto. Per questo non si ascolta nessun evento: a ogni
 * chiamata si guarda il file (`stat`, una chiamata di sistema, ordini di
 * grandezza meno di leggerlo e analizzarlo) e si confronta la sua firma —
 * data di modifica e di cambio al nanosecondo, e dimensione — con quella di
 * quando lo si e' letto. Firma diversa: si rilegge.
 *
 * IL CASO "TROPPO RECENTE" (lo stesso trucco di git): un file scritto due
 * volte nello stesso istante, con la stessa dimensione, puo' avere la stessa
 * firma. Quindi un file modificato da meno di `FINESTRA_RECENTE_MS` non si
 * da' mai per buono: lo si rilegge a ogni chiamata, finche' non e' "vecchio"
 * abbastanza da essere certi che una nuova scrittura cambierebbe la firma.
 * Costo: i pochi file toccati negli ultimi secondi si rileggono. Vantaggio:
 * nessuna finestra in cui si possa vedere un testo che non c'e' piu'.
 *
 * Una cache vive nel processo del server e non e' mai su disco: un riavvio
 * riparte da zero, ed e' giusto cosi'.
 */

export const FINESTRA_RECENTE_MS = 2500;

export interface FirmaFile {
  /** Cio' che cambia se il file cambia: modifica, cambio e dimensione. */
  firma: string;
  /** Il file e' stato modificato cosi' da poco che la firma non basta a fidarsi. */
  recente: boolean;
}

/** La firma di un file, o `null` se non c'e' (o non e' un file). Mai un'eccezione. */
export function firmaDi(percorso: string): FirmaFile | null {
  try {
    const s = fs.statSync(percorso, { bigint: true });
    if (!s.isFile()) return null;
    return {
      firma: `${s.mtimeNs}:${s.ctimeNs}:${s.size}`,
      recente: Date.now() - Number(s.mtimeMs) < FINESTRA_RECENTE_MS,
    };
  } catch {
    return null;
  }
}

/** Restituisce il turno al server: le richieste in attesa vanno avanti prima che il lavoro riprenda. */
export const cediIlTurno = (): Promise<void> => new Promise((risolvi) => setImmediate(risolvi));

/** Un'impronta corta e stabile di un elenco di stringhe (la "chiave" di un catalogo di step). */
export function improntaDiElenco(voci: readonly string[]): string {
  const h = createHash('sha1');
  for (const v of voci) {
    h.update(v);
    h.update('\u0000');
  }
  return h.digest('hex');
}

interface Voce<T> {
  firma: string;
  chiave: string;
  valore: T;
}

function leggiDalDisco(percorso: string): string | null {
  try {
    return fs.readFileSync(percorso, 'utf-8');
  } catch {
    return null;
  }
}

/**
 * Il risultato di `calcola(testo)` per ogni file, ricordato finche' la firma del
 * file e la `chiave` (cio' da cui il risultato dipende oltre al file stesso)
 * restano uguali.
 */
export class CachePerFile<T> {
  private readonly voci = new Map<string, Voce<T>>();

  /** `leggi`: come si ottiene il testo quando serve. Di norma dal disco; `testoCondiviso` lo divide con le altre cache. */
  constructor(private readonly leggi: (percorso: string) => string | null = leggiDalDisco) {}

  /**
   * Il valore per questo file, o `null` se non si legge. `calcola` riceve il
   * testo: si chiama solo se il file e' cambiato (o e' troppo recente per
   * fidarsi, o la `chiave` e' diversa).
   *
   * Il valore restituito e' quello ricordato, non una copia: chi lo modifica
   * sporcherebbe le chiamate dopo. Chi lo espone fuori dal modulo lo copia.
   */
  ottieni(percorso: string, chiave: string, calcola: (testo: string) => T): T | null {
    const f = firmaDi(percorso);
    if (!f) {
      this.voci.delete(percorso);
      return null;
    }
    const nota = this.voci.get(percorso);
    if (nota && !f.recente && nota.firma === f.firma && nota.chiave === chiave) return nota.valore;

    const testo = this.leggi(percorso);
    if (testo === null) {
      this.voci.delete(percorso);
      return null;
    }
    const valore = calcola(testo);
    // La firma e' quella di PRIMA della lettura: se il file cambia in mezzo, la
    // chiamata dopo vede una firma diversa e rilegge. Mai il contrario.
    if (f.recente) this.voci.delete(percorso);
    else this.voci.set(percorso, { firma: f.firma, chiave, valore });
    return valore;
  }

  /** Dimentica i file sotto `prefisso` che non sono fra `vivi`: un file cancellato non resta in memoria. */
  pota(prefisso: string, vivi: ReadonlySet<string>): void {
    for (const p of this.voci.keys()) {
      if (p.startsWith(prefisso) && !vivi.has(p)) this.voci.delete(p);
    }
  }

  /** C'e' un valore ricordato per questo file, con questa firma e questa chiave? */
  haFirma(percorso: string, firma: string, chiave = ''): boolean {
    const nota = this.voci.get(percorso);
    return nota !== undefined && nota.firma === firma && nota.chiave === chiave;
  }

  /** Ricorda un valore calcolato altrove (una lettura anticipata): la `firma` e' quella di PRIMA della lettura. */
  inserisci(percorso: string, firma: string, valore: T, chiave = ''): void {
    this.voci.set(percorso, { firma, chiave, valore });
  }

  svuota(): void {
    this.voci.clear();
  }
}

const cacheTesti = new CachePerFile<string>();

/**
 * Il testo di un file, riletto dal disco solo se e' cambiato, e UNO per tutti:
 * `/api/scenari` e `/api/catalogo` si aprono insieme e leggono gli stessi
 * `.feature`, e leggerli due volte a freddo costava ~150 ms con 300 file.
 * Chi lo usa non deve modificare il testo (e' una stringa: non puo').
 */
export function testoCondiviso(percorso: string): string | null {
  return cacheTesti.ottieni(percorso, '', (testo) => testo);
}

const LETTURE_INSIEME = 16;

async function caricaUnTesto(percorso: string): Promise<void> {
  const f = firmaDi(percorso);
  // Un file appena scritto non si ricorda (vedi in testa): lo leggera' chi ne ha bisogno, al momento.
  if (!f || f.recente || cacheTesti.haFirma(percorso, f.firma)) return;
  try {
    const testo = await fs.promises.readFile(percorso, 'utf-8');
    // La firma e' quella di PRIMA della lettura: se il file cambia in mezzo, la prossima volta si rilegge.
    cacheTesti.inserisci(percorso, f.firma, testo);
  } catch {
    // Non si legge: ci pensera' chi lo chiede, con la sua gestione dell'errore.
  }
}

/**
 * Legge in anticipo, e FUORI dal filo principale (lettura asincrona, qualche
 * file alla volta), i `.feature` che `riepilogaScenari` e `trovaUsatoIn`
 * leggeranno subito dopo. A freddo, con 300 file, la lettura era ~150 ms di
 * server fermo; cosi' il conto che segue trova i testi gia' pronti e il server
 * resta libero per le altre richieste mentre il disco lavora.
 */
export async function precaricaFeatures(cartella: string): Promise<void> {
  const percorsi = walkFeatures(cartella).map((rel) => path.join(cartella, rel));
  let prossimo = 0;
  const lavora = async (): Promise<void> => {
    while (prossimo < percorsi.length) await caricaUnTesto(percorsi[prossimo++]);
  };
  await Promise.all(Array.from({ length: Math.min(LETTURE_INSIEME, percorsi.length) }, lavora));
}

/** Come `CachePerFile.pota`, per i testi condivisi. */
export function potaTestiCondivisi(prefisso: string, vivi: ReadonlySet<string>): void {
  cacheTesti.pota(prefisso, vivi);
}
