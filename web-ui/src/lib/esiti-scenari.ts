import * as fs from 'fs';
import * as path from 'path';
import { REPO_ROOT, FEATURES_DIR } from './repo';
import { cediIlTurno } from './cache-file';
import { estraiVoci, type VoceEsito } from './esiti-da-messaggi';
import type { FileScenari } from './scenari';
import type { FileConEsiti, UltimoEsito } from './esiti-tipi';
import { cronometroDi, percorsoPrimiVerdi, primoVerdeDi, registraPrimiVerdi } from './cronometro';

/**
 * L'indice degli esiti per scenario: `reports/esiti-scenari.json`.
 *
 * Sta in `reports/`, non in `reports/cruscotto/`: quella cartella e' il
 * bersaglio della pulizia dei file di stato (F20), e un indice che serve a
 * ricordare come e' andata ogni scenario non deve poter sparire con una
 * pulizia per numero. E' gia' coperto da `.gitignore` (`reports/`): gli esiti
 * non escono dalla macchina.
 *
 * Perdere l'indice costa "mai eseguito su questo computer", mai un numero
 * sbagliato: e' per questo che un indice illeggibile si DICE (`illeggibile`)
 * invece di mostrare un elenco che sembra giusto e non lo e'.
 */

export const VERSIONE_INDICE = 1;

export function percorsoIndice(radice: string = REPO_ROOT): string {
  return path.join(radice, 'reports', 'esiti-scenari.json');
}

export function cartellaMessaggi(radice: string = REPO_ROOT): string {
  return path.join(radice, 'reports', 'cruscotto');
}

export type LetturaEsiti =
  | { stato: 'ok'; voci: VoceEsito[] }
  | { stato: 'illeggibile'; voci: [] };

function voceValida(v: unknown): v is VoceEsito {
  if (typeof v !== 'object' || v === null) return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.file === 'string' &&
    typeof o.nome === 'string' &&
    (o.esito === 'passato' || o.esito === 'fallito') &&
    typeof o.quando === 'string' &&
    typeof o.durataMs === 'number' &&
    (o.ambiente === null || typeof o.ambiente === 'string') &&
    typeof o.esecuzione === 'string' &&
    typeof o.impronta === 'string'
  );
}

/**
 * Senza file: nessun esito (e' il primo avvio, non un guasto). Con un file che
 * non si legge o non ha la forma attesa: `illeggibile`, e NON lo si tocca.
 */
export function leggiEsiti(percorso: string): LetturaEsiti {
  let testo: string;
  try {
    testo = fs.readFileSync(percorso, 'utf-8');
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return { stato: 'ok', voci: [] };
    return { stato: 'illeggibile', voci: [] };
  }
  try {
    const indice = JSON.parse(testo) as { versione?: unknown; voci?: unknown };
    if (indice === null || typeof indice !== 'object') return { stato: 'illeggibile', voci: [] };
    if (indice.versione !== VERSIONE_INDICE || !Array.isArray(indice.voci)) return { stato: 'illeggibile', voci: [] };
    // Una voce malformata in un indice buono si salta: le altre restano vere.
    return { stato: 'ok', voci: indice.voci.filter(voceValida) };
  } catch {
    return { stato: 'illeggibile', voci: [] };
  }
}

const chiaveDi = (v: VoceEsito): string => `${v.file}\u0000${v.nome}\u0000${v.ambiente ?? '\u0001sconosciuto'}`;

/**
 * Una voce nuova sostituisce quella con la stessa chiave se la sua `quando` e'
 * piu' recente o uguale: un orologio che torna indietro non cancella un esito
 * piu' nuovo.
 */
export function fondiEsiti(vecchie: VoceEsito[], nuove: VoceEsito[]): VoceEsito[] {
  const perChiave = new Map<string, VoceEsito>();
  for (const v of vecchie) perChiave.set(chiaveDi(v), v);
  for (const n of nuove) {
    const k = chiaveDi(n);
    const presente = perChiave.get(k);
    if (!presente || Date.parse(n.quando) >= Date.parse(presente.quando)) perChiave.set(k, n);
  }
  return [...perChiave.values()];
}

function scriviAtomico(percorso: string, contenuto: string): void {
  fs.mkdirSync(path.dirname(percorso), { recursive: true });
  const temporaneo = `${percorso}.tmp-${process.pid}`;
  try {
    fs.writeFileSync(temporaneo, contenuto);
    fs.renameSync(temporaneo, percorso);
  } catch (err) {
    try {
      fs.rmSync(temporaneo, { force: true });
    } catch {
      // Niente da ripulire.
    }
    throw err;
  }
}

/**
 * Fonde le voci nuove nell'indice e lo riscrive, in modo atomico (file
 * temporaneo + rinomina: una scrittura interrotta non lascia un indice a
 * meta'). Le voci di file che non esistono piu' sotto `src/features/` si
 * scartano qui, cosi' l'indice non cresce con gli scenari cancellati. Se
 * l'indice c'e' ma non si legge, lo si conserva come `.illeggibile` prima di
 * scriverne uno nuovo: non si butta una cosa che qualcuno potrebbe voler
 * guardare.
 *
 * Sincrona: il processo lancia una sola prova alla volta (`LUNGHI` in
 * `registro.ts`), e due fusioni nello stesso processo non si intrecciano.
 * Puo' lanciare (disco pieno, permessi): chi chiama decide cosa farne.
 */
export function registraEsiti(percorso: string, nuove: VoceEsito[], cartellaFeatures: string = FEATURES_DIR): void {
  const lettura = leggiEsiti(percorso);
  if (lettura.stato === 'illeggibile') {
    fs.renameSync(percorso, `${percorso}.illeggibile`);
  }
  const fuse = fondiEsiti(lettura.voci, nuove).filter((v) => {
    try {
      return fs.statSync(path.join(cartellaFeatures, v.file)).isFile();
    } catch {
      return false;
    }
  });
  scriviAtomico(percorso, JSON.stringify({ versione: VERSIONE_INDICE, voci: fuse }, null, 2));
}

/**
 * Uno scenario spostato (o uno spostamento annullato) porta con se' i suoi esiti: la chiave
 * di una voce e' file + titolo, e col file nuovo "mai eseguito" sarebbe una bugia a meta'.
 * Le voci passano da `da` ad `a` CON la loro impronta: il file e' cambiato (tag e commento
 * del percorso), quindi l'elenco dice "modificato dopo l'ultima prova" e il tester ripete la
 * prova; se si annulla e il file torna com'era, torna anche "aggiornato".
 *
 * Va chiamata DOPO aver spostato il file sul disco (le voci di un file che non c'e' piu'
 * le scarta `registraEsiti`, ed e' cosi' che le vecchie spariscono). Non crea l'indice, non
 * tocca un indice illeggibile, non scrive se non c'e' niente da spostare, e non lancia mai:
 * gli esiti sono un servizio, non un requisito.
 */
export function spostaEsiti(percorso: string, da: string, a: string, cartellaFeatures: string = FEATURES_DIR): void {
  try {
    const lettura = leggiEsiti(percorso);
    if (lettura.stato !== 'ok') return;
    const daSpostare = lettura.voci.filter((v) => v.file === da);
    if (daSpostare.length === 0) return;
    registraEsiti(percorso, daSpostare.map((v) => ({ ...v, file: a })), cartellaFeatures);
  } catch {
    // Perdere gli esiti costa "mai eseguito", mai un numero sbagliato.
  }
}

/**
 * Le voci che si ricavano dai `.ndjson` delle esecuzioni gia' fatte. L'ambiente
 * non c'e' ne' nei messaggi ne' nei vecchi file di stato, e non lo si inventa:
 * `null`. Robusta per costruzione: un file illeggibile, troncato o vuoto si
 * salta, e non lancia mai.
 */
export function vociDaiMessaggiGiaFatti(cartella: string, escludi: string[] = []): VoceEsito[] {
  let nomi: string[];
  try {
    nomi = fs.readdirSync(cartella).filter((n) => /^test-.+\.ndjson$/.test(n) && !escludi.includes(n));
  } catch {
    return [];
  }
  let tutte: VoceEsito[] = [];
  for (const nome of nomi) {
    try {
      const testo = fs.readFileSync(path.join(cartella, nome), 'utf-8');
      tutte = fondiEsiti(tutte, estraiVoci(testo, { ambiente: null, esecuzione: nome.replace(/\.ndjson$/, '') }));
    } catch {
      // Un file che non si legge non ferma gli altri.
    }
  }
  return tutte;
}

/**
 * La stessa lettura di `vociDaiMessaggiGiaFatti`, ma un file alla volta e
 * restituendo il turno al server fra un file e l'altro: con 2000 `.ndjson`
 * (368 MB) quella sincrona teneva fermo il server per ~7 s, e ogni altra
 * richiesta — la barra laterale compresa — restava ad aspettare (a volte la
 * connessione cadeva). Stesso risultato, stesso ordine di lettura.
 */
export async function vociDaiMessaggiGiaFattiAsync(cartella: string, escludi: string[] = []): Promise<VoceEsito[]> {
  let nomi: string[];
  try {
    nomi = (await fs.promises.readdir(cartella)).filter((n) => /^test-.+\.ndjson$/.test(n) && !escludi.includes(n));
  } catch {
    return [];
  }
  let tutte: VoceEsito[] = [];
  let ultimaCessione = Date.now();
  for (const nome of nomi) {
    try {
      const testo = await fs.promises.readFile(path.join(cartella, nome), 'utf-8');
      tutte = fondiEsiti(tutte, estraiVoci(testo, { ambiente: null, esecuzione: nome.replace(/\.ndjson$/, '') }));
    } catch {
      // Un file che non si legge non ferma gli altri.
    }
    if (Date.now() - ultimaCessione > 8) {
      await cediIlTurno();
      ultimaCessione = Date.now();
    }
  }
  return tutte;
}

const ricostruzioniInCorso = new Map<string, Promise<void>>();

/**
 * Come `assicuraIndice`, senza fermare il server mentre legge. Due richieste
 * insieme (la schermata Scenari e quella di Esecuzione si aprono quasi nello
 * stesso istante) aspettano la stessa ricostruzione: si fa una volta sola. Se
 * mentre si legge l'indice nasce da un'altra parte (una prova conclusa lo
 * scrive), non lo si sovrascrive. Non lancia mai.
 */
export function assicuraIndiceAsync(
  percorso: string = percorsoIndice(),
  cartella: string = cartellaMessaggi(),
  cartellaFeatures: string = FEATURES_DIR,
  escludi: string[] = []
): Promise<void> {
  if (fs.existsSync(percorso)) return Promise.resolve();
  const inCorso = ricostruzioniInCorso.get(percorso);
  if (inCorso) return inCorso;
  const lavoro = (async () => {
    try {
      const voci = await vociDaiMessaggiGiaFattiAsync(cartella, escludi);
      if (fs.existsSync(percorso)) return;
      registraEsiti(percorso, voci, cartellaFeatures);
    } catch {
      // Lo stato su disco e' un servizio, non un requisito.
    }
  })().finally(() => ricostruzioniInCorso.delete(percorso));
  ricostruzioniInCorso.set(percorso, lavoro);
  return lavoro;
}

/**
 * Al primo avvio (l'indice non c'e'), lo si costruisce dalle esecuzioni gia'
 * fatte, UNA volta sola: dopo il file esiste, anche con zero voci, e non si
 * rilegge piu' niente. Un indice che c'e' (anche se corrotto) non si tocca.
 * Non lancia: se non riesce a scrivere, la pagina funziona lo stesso.
 */
export function assicuraIndice(
  percorso: string = percorsoIndice(),
  cartella: string = cartellaMessaggi(),
  cartellaFeatures: string = FEATURES_DIR,
  /** Nomi di file da non leggere: la prova che si sta registrando adesso porta il suo ambiente. */
  escludi: string[] = []
): void {
  if (fs.existsSync(percorso)) return;
  try {
    registraEsiti(percorso, vociDaiMessaggiGiaFatti(cartella, escludi), cartellaFeatures);
  } catch {
    // Lo stato su disco e' un servizio, non un requisito.
  }
}

/**
 * Unisce l'elenco degli scenari con gli esiti salvati. Pura: si prova senza
 * server. Un esito e' `aggiornato` solo se l'impronta della prova e quella del
 * file adesso coincidono (e non e' vuota): un verde di un testo che non c'e'
 * piu' non si da' per buono. Le voci di scenari che non ci sono piu' (titolo
 * cambiato, file spostato) non compaiono.
 */
export function unisciEsiti(
  elenco: FileScenari[],
  voci: VoceEsito[],
  /** Da `leggiPrimiVerdi`: senza, nessun cronometro ha ancora un verde. */
  primiVerdi: Record<string, string> = {}
): FileConEsiti[] {
  const perScenario = new Map<string, VoceEsito[]>();
  for (const v of voci) {
    const k = `${v.file}\u0000${v.nome}`;
    const lista = perScenario.get(k);
    if (lista) lista.push(v);
    else perScenario.set(k, [v]);
  }
  return elenco.map((f) => ({
    ...f,
    scenari: f.scenari.map((s) => {
      const esiti: UltimoEsito[] = (perScenario.get(`${f.file}\u0000${s.nome}`) ?? [])
        .slice()
        .sort((a, b) => Date.parse(b.quando) - Date.parse(a.quando))
        .map((v) => ({
          esito: v.esito,
          quando: v.quando,
          durataMs: v.durataMs,
          ambiente: v.ambiente,
          esecuzione: v.esecuzione,
          aggiornato: v.impronta !== '' && v.impronta === f.impronta,
          ...(v.passoFallito ? { passoFallito: v.passoFallito } : {}),
        }));
      const cronometro = cronometroDi(f.registrazione ?? null, primoVerdeDi(primiVerdi, f.file, s.nome));
      return { ...s, esiti, cronometro };
    }),
  }));
}

/**
 * Cio' che il registro chiama a fine di una prova: legge i messaggi di
 * quell'esecuzione e li fonde nell'indice. Se l'indice non c'era ancora, prima
 * lo ricostruisce (cosi' la ricostruzione avviene una volta sola, anche se la
 * prima cosa che succede e' una prova e non l'apertura della pagina).
 */
export interface ProvaConclusa {
  id: string;
  ambiente: string | null;
  /** Percorso dei messaggi relativo alla radice (`reports/cruscotto/<id>.ndjson`). */
  messaggi: string;
  /**
   * I nomi dei `.ndjson` delle altre corsie ancora in corso. Una ricostruzione
   * dell'indice non deve leggerli: sono parziali, e poi comparirebbero due volte
   * (una con ambiente sconosciuto, una con quello vero).
   */
  altriInCorso?: string[];
}

export function registraEsitiDiUnaProva(prova: ProvaConclusa, radice: string = REPO_ROOT): void {
  // Niente messaggi, niente da registrare (e niente indice creato a vuoto): un
  // processo che muore prima di scrivere il file, o un'esecuzione finta.
  if (!fs.existsSync(path.join(radice, prova.messaggi))) return;
  const indice = percorsoIndice(radice);
  assicuraIndice(indice, cartellaMessaggi(radice), path.join(radice, 'src', 'features'), [
    path.basename(prova.messaggi),
    ...(prova.altriInCorso ?? []),
  ]);
  const testo = fs.readFileSync(path.join(radice, prova.messaggi), 'utf-8');
  const voci = estraiVoci(testo, { ambiente: prova.ambiente, esecuzione: prova.id });
  registraEsiti(indice, voci, path.join(radice, 'src', 'features'));
  try {
    registraPrimiVerdi(percorsoPrimiVerdi(radice), voci);
  } catch {
    // Senza il primo verde il cronometro resta "nessun verde": mai un numero sbagliato.
  }
}
