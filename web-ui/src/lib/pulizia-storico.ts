import * as fs from 'fs';
import * as path from 'path';
import type { NomeComando } from './esecuzione';
import { leggiEsiti, percorsoIndice } from './esiti-scenari';

/**
 * La pulizia di `reports/cruscotto/`, dove ogni esecuzione lascia uno stato
 * (`<id>.json`) e, per i test, i messaggi con le schermate (`<id>.ndjson`) e il
 * rapporto HTML (`<id>.html`, circa 1 MB a prova).
 * Senza una regola la cartella cresce senza limite (oggi: ~1400 file).
 *
 * LA REGOLA
 *   - per ogni tipo di esecuzione (test, registrazione, diagnosi...) si
 *     tengono le ultime `TIENI_ULTIME`;
 *   - in piu' si tiene ogni esecuzione a cui l'indice degli esiti per scenario
 *     punta ancora (`UltimoEsito.esecuzione`): e' il "Vedi la schermata" di un
 *     rosso passato, e non deve rompersi;
 *   - in piu' si tiene ogni esecuzione in corso.
 * Il resto si cancella, stato e messaggi insieme.
 *
 * LA SCELTA DI 50 PER TIPO
 * Un `.ndjson` con una schermata pesa da ~0,25 MB a qualche MB: 50 test sono
 * al peggio poche decine di MB, e coprono settimane di lavoro. Per tipo, e non
 * in totale, perche' le registrazioni e le diagnosi sono molte e minuscole: in
 * un conteggio unico caccerebbero via i test, che sono gli unici che pesano e
 * gli unici con una schermata da rivedere.
 *
 * LA SICUREZZA
 * Si toccano solo file che hanno la forma esatta di un'esecuzione
 * (`<tipo>-<8 caratteri di base 36>[-<n>].json|ndjson|html`,
 * tipo fra quelli noti). `catalogo-stato.json`, `generazione-manifesto.json`,
 * `catalogo-messages.ndjson` e qualunque altro file non sono esecuzioni e non
 * si toccano mai. Senza indice leggibile non si cancella niente: non si sa
 * cosa serve.
 */
export const TIENI_ULTIME = 50;

const TIPI: NomeComando[] = [
  'diagnosi', 'sessione', 'registrazione', 'generazione', 'test', 'scansione',
  'installa-browser', 'sincronizza-regole', 'catalogo',
];

/** Parole di otto lettere che compaiono in nomi di file fissi della cartella (non sono id). */
const NOMI_FISSI = ['messages'];

export interface FileStorico {
  nome: string;
  mtimeMs: number;
  byte: number;
}

const FORMA = /^([a-z]+(?:-[a-z]+)*)-([0-9a-z]{8})(?:-(\d+))?\.(json|ndjson|html)$/;

/** L'id e il tipo dell'esecuzione a cui un file appartiene, o `null` se non e' di un'esecuzione. */
export function idDelFile(nome: string): { id: string; tipo: string } | null {
  const m = FORMA.exec(nome);
  if (!m) return null;
  const [, tipo, marca, numero] = m;
  if (!TIPI.includes(tipo as NomeComando)) return null;
  // Un id nasce da `Date.now().toString(36)`: otto caratteri (fino al 2058), e
  // puo' non contenere nemmeno una cifra. Un nome fisso lungo otto come
  // `catalogo-messages` ha la stessa forma: lo si esclude per nome.
  if (NOMI_FISSI.includes(marca)) return null;
  return { id: numero ? `${tipo}-${marca}-${numero}` : `${tipo}-${marca}`, tipo };
}

export interface RegolaPulizia {
  tieni: number;
  /** Gli id a cui l'indice degli esiti punta. */
  referenziate: string[];
  /** Gli id delle esecuzioni che girano adesso. */
  inCorso: string[];
}

/** Pura: dati i file della cartella e la regola, i nomi da cancellare. */
export function cosaCancellare(file: FileStorico[], regola: RegolaPulizia): string[] {
  const gruppi = new Map<string, { tipo: string; file: FileStorico[]; recente: number }>();
  for (const f of file) {
    const d = idDelFile(f.nome);
    if (!d) continue;
    const g = gruppi.get(d.id) ?? { tipo: d.tipo, file: [], recente: 0 };
    g.file.push(f);
    g.recente = Math.max(g.recente, f.mtimeMs);
    gruppi.set(d.id, g);
  }

  const protette = new Set([...regola.referenziate, ...regola.inCorso]);
  const perTipo = new Map<string, Array<[string, { file: FileStorico[]; recente: number }]>>();
  for (const [id, g] of gruppi) {
    const lista = perTipo.get(g.tipo) ?? [];
    lista.push([id, g]);
    perTipo.set(g.tipo, lista);
  }

  const via: string[] = [];
  for (const lista of perTipo.values()) {
    // La piu' recente per prima; a parita' di istante, il nome (l'id cresce nel tempo).
    lista.sort((a, b) => b[1].recente - a[1].recente || (a[0] < b[0] ? 1 : -1));
    lista.slice(Math.max(0, regola.tieni)).forEach(([id, g]) => {
      if (!protette.has(id)) via.push(...g.file.map((f) => f.nome));
    });
  }
  return via;
}

/**
 * Applica la regola alla cartella delle esecuzioni. Non lancia mai: la pulizia
 * e' un servizio, e un errore qui non deve cambiare l'esito di una prova.
 * `inCorso` arriva da chi la chiama (il registro): e' lui a sapere cosa gira.
 */
export function ripulisciStorico(
  radice: string,
  opzioni: { tieni?: number; inCorso: string[] }
): { cancellati: number; byteLiberati: number } {
  const nulla = { cancellati: 0, byteLiberati: 0 };
  try {
    const indice = percorsoIndice(radice);
    // Senza indice (primo avvio, o prova senza messaggi) o con un indice che
    // non si legge non si sa a cosa puntano gli esiti: non si cancella niente.
    if (!fs.existsSync(indice)) return nulla;
    const lettura = leggiEsiti(indice);
    if (lettura.stato !== 'ok') return nulla;

    const cartella = path.join(radice, 'reports', 'cruscotto');
    const file: FileStorico[] = [];
    for (const nome of fs.readdirSync(cartella)) {
      if (!idDelFile(nome)) continue;
      try {
        const s = fs.statSync(path.join(cartella, nome));
        if (s.isFile()) file.push({ nome, mtimeMs: s.mtimeMs, byte: s.size });
      } catch {
        // Sparito nel frattempo: niente da fare.
      }
    }

    const via = cosaCancellare(file, {
      tieni: opzioni.tieni ?? TIENI_ULTIME,
      referenziate: lettura.voci.map((v) => v.esecuzione),
      inCorso: opzioni.inCorso,
    });
    const peso = new Map(file.map((f) => [f.nome, f.byte]));
    let cancellati = 0;
    let byteLiberati = 0;
    for (const nome of via) {
      try {
        fs.rmSync(path.join(cartella, nome), { force: true });
        cancellati++;
        byteLiberati += peso.get(nome) ?? 0;
      } catch {
        // Un file che non si cancella (aperto altrove) resta: si riprova alla prossima.
      }
    }
    return { cancellati, byteLiberati };
  } catch {
    return nulla;
  }
}
