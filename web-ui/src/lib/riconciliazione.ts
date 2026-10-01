import type { CatalogStep, StepComponentRef } from './types';

/**
 * riconciliazione.ts
 * ------------------
 * Trova le coppie di step sospette e dice, per ciascuna, di quale dei due casi
 * si tratta — la parte che la demo deve dimostrare:
 *
 *   the user click on the login button   ->  button 'Sign in'
 *   The user click on the login button   ->  link 'Sign in'
 *
 * Due frasi quasi uguali (differiscono solo per una maiuscola) ma agganciate a
 * COMPONENTI DIVERSI. Non e' un doppione da fondere: e' un equivoco di
 * denominazione, e la cura e' l'opposto — distinguere le frasi, non unirle.
 * Fonderle qui sarebbe l'errore esatto che il progetto vuole evitare.
 *
 * `stessoComponente` e' il campo che porta il verdetto: due frasi simili con
 * `stessoComponente: false` sono un equivoco (da rinominare, non da fondere);
 * con `stessoComponente: true` sono un doppione vero (candidate a fusione). La
 * schermata decide il gesto da proporre leggendo questo campo, non il testo.
 *
 * Funzione pura: nessun accesso al disco, cosi' si verifica con dati inventati
 * senza toccare `step-catalog.json`.
 *
 * IL CONFRONTO E' PER APPLICAZIONE
 * ---------------------------------
 * Il catalogo sa gia' a quale applicazione appartiene ogni step (campo `app`,
 * derivato dalla cartella sotto `src/steps/`: vedi `scripts/extract-steps.ts`).
 * Due step di applicazioni diverse non si confrontano affatto per doppione:
 * un `button "Sign in"` e' comunissimo, e fondere gli step di due prodotti
 * diversi solo perche' si somigliano nel testo sarebbe il danno esatto che
 * questo file esiste per evitare.
 *
 * Due eccezioni, scelte guardando i dati veri (`step-catalog.json`, 10 step,
 * 2026-09-28):
 *
 *  - `common`: condiviso apposta fra le applicazioni (i suoi step sono
 *    scritti per essere riusati ovunque — vedi `CONTRIBUTING.md`). Confrontarlo
 *    con ogni applicazione e' voluto: se un giorno uno step "di app" somiglia
 *    a uno comune, e' un segnale che quello step dovrebbe riusare il comune,
 *    non una minaccia di fusione fra prodotti diversi (i componenti quasi mai
 *    coincidono, e senza componenti uguali non si offre comunque la fusione).
 *  - `generated`: il limbo di cio' che il tester ha appena registrato e non
 *    ancora salvato. E' UNA cartella sola per qualsiasi applicazione (nessuna
 *    sotto-cartella per app: vedi `scripts/extract-steps.ts`), quindi uno step
 *    li' oggi e lo stesso step salvato domani sotto un'app reale sono LO
 *    STESSO STEP in due momenti diversi. Il caso e' gia' nei dati veri:
 *    "the user open the recharge tab" (generated) e "the user clcik on the
 *    recharge button" (human-recharge) toccano entrambi `link "Recharges"` —
 *    trattare "generated" come un'applicazione a se' nasconderebbe esattamente
 *    questo doppione, quello che la calibrazione deve smettere di lasciar
 *    scappare. Il prezzo accettato: con piu' applicazioni registrate e non
 *    ancora salvate nello stesso limbo, la coincidenza di testo potrebbe
 *    accostare per errore step di prodotti diversi. Si accetta perche' la
 *    schermata mostra sempre l'applicazione di ciascun lato della coppia (vedi
 *    `SezioneRiconciliazione.tsx`): il tester vede "generated" contro un nome
 *    di app reale e decide lui, invece di scoprirlo dopo aver fuso alla cieca.
 *
 * Per due applicazioni REALI e diverse (nessuna delle due `common`/`generated`)
 * il confronto per componente non si fa nemmeno: sarebbe rumore puro (ogni app
 * ha un suo `button "Sign in"`). Ma il testo simile non si tace del tutto — se
 * due step di applicazioni diverse hanno un testo quasi identico, la coppia
 * compare comunque, con motivo `applicazioni-diverse`: e' un'informazione
 * onesta ("la stessa frase esiste anche altrove"), mai un invito a fondere ne'
 * a rinominare (`stessoComponente` resta sempre `false` per questo motivo, e
 * la schermata non offre alcun gesto).
 */

export type MotivoRiconciliazione = 'testo-quasi-uguale' | 'stessi-componenti' | 'applicazioni-diverse';

export interface StepPerConfronto {
  espressione: string;
  componenti: StepComponentRef[];
  documentato: boolean;
  app: string;
}

/**
 * Vero se i due step condividono l'ambito di confronto per doppioni/equivoci:
 * stessa applicazione, o almeno uno dei due e' `common`/`generated` (vedi il
 * commento in testa al file per il perche' di queste due eccezioni).
 */
function stessoAmbito(appA: string, appB: string): boolean {
  if (appA === appB) return true;
  if (appA === 'common' || appB === 'common') return true;
  if (appA === 'generated' || appB === 'generated') return true;
  return false;
}

export interface CoppiaRiconciliazione {
  /** Stabile finche' le due espressioni non cambiano: le espressioni stesse, in ordine. */
  id: string;
  motivo: MotivoRiconciliazione;
  spiegazione: string;
  a: StepPerConfronto;
  b: StepPerConfronto;
  /** Il verdetto: componenti identici (doppione) o no (equivoco di denominazione, o non ancora ancorati). */
  stessoComponente: boolean;
}

function normalizza(testo: string): string {
  return testo.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Soglia scelta sui dati veri del catalogo (2026-09-25, 8 step): la coppia
 * voluta (differenza di sola maiuscola) ha somiglianza 1.00; la coppia piu'
 * vicina per errore-di-battitura reale nel catalogo ("clcik" vs "click", ma
 * frasi comunque diverse: "recharge" vs "login") arriva a 0.73. La soglia sta
 * a meta' strada, con margine da entrambi i lati — non tarata sull'unico caso
 * noto, ma neppure a caso.
 */
const SOGLIA_SOMIGLIANZA = 0.85;

function chiaveComponente(c: StepComponentRef): string {
  return `${c.page ?? ''}\u0000${c.role}\u0000${c.name}`;
}

function vista(s: CatalogStep): StepPerConfronto {
  return { espressione: s.expression, componenti: s.components ?? [], documentato: s.documented, app: s.app };
}

/**
 * Firma dell'insieme di componenti: due step hanno la stessa firma se e solo se
 * hanno lo stesso numero di componenti dichiarati e lo stesso insieme di chiavi
 * (e' esattamente la regola di prima, `stessiComponenti`). `null` = nessun
 * componente dichiarato: l'assenza non e' mai un'uguaglianza, e non si confonde
 * con "coincidono" (vedi `component-impact.ts`). Calcolata una volta per step,
 * evita di ricostruire due Set a ogni coppia.
 */
function firmaComponenti(componenti: StepComponentRef[] | undefined): string | null {
  if (!componenti || componenti.length === 0) return null;
  const chiavi = [...new Set(componenti.map(chiaveComponente))].sort();
  return `${componenti.length}\u0001${chiavi.join('\u0002')}`;
}

/**
 * Il testo e' abbastanza simile da superare la soglia? Stesso verdetto di
 * `1 - distanza / lunghezzaMax >= SOGLIA_SOMIGLIANZA`, ma senza pagare una
 * distanza di Levenshtein intera quando si vede prima che la coppia non puo'
 * passare:
 *
 *  1. Scarto per lunghezza: la distanza e' almeno la differenza di lunghezza,
 *     quindi `1 - |la - lb| / max` e' un limite alto della somiglianza vera. Se
 *     gia' quello e' sotto soglia, la coppia non puo' superarla.
 *  2. Conteggio dei caratteri: la distanza e' almeno il maggiore fra caratteri in
 *     eccesso e caratteri mancanti (vedi `limiteInferioreDistanza`).
 *  3. Distanza con tetto: oltre `(1 - soglia) * max` modifiche la coppia e'
 *     persa; il calcolo si ferma appena una riga intera supera il tetto.
 *
 * Quando la distanza viene calcolata e' esatta, e la decisione finale usa la
 * stessa formula di prima: nessuna differenza di arrotondamento.
 */
function testoMoltoSimile(a: string, b: string, ha: Uint16Array, hb: Uint16Array): boolean {
  const lunghezzaMax = Math.max(a.length, b.length);
  if (lunghezzaMax === 0) return true;
  if (1 - Math.abs(a.length - b.length) / lunghezzaMax < SOGLIA_SOMIGLIANZA) return false;
  const tetto = Math.floor((1 - SOGLIA_SOMIGLIANZA) * lunghezzaMax) + 1;
  if (limiteInferioreDistanza(ha, hb) > tetto) return false;
  const d = distanzaConTetto(a, b, tetto);
  if (d > tetto) return false;
  return 1 - d / lunghezzaMax >= SOGLIA_SOMIGLIANZA;
}

const BUCKET = 64;

/** Quante volte compare ciascun carattere (caratteri diversi possono condividere un contenitore: il limite sotto resta valido). */
function istogramma(testo: string): Uint16Array {
  const h = new Uint16Array(BUCKET);
  for (let i = 0; i < testo.length; i++) h[testo.charCodeAt(i) & (BUCKET - 1)]!++;
  return h;
}

/**
 * Limite inferiore della distanza: ogni modifica toglie al piu' un carattere di
 * troppo e ne aggiunge al piu' uno mancante, quindi la distanza e' almeno il
 * maggiore fra caratteri in eccesso e caratteri mancanti. Costa BUCKET passi,
 * indipendente dalla lunghezza.
 */
function limiteInferioreDistanza(ha: Uint16Array, hb: Uint16Array): number {
  let eccesso = 0;
  let mancanti = 0;
  for (let k = 0; k < BUCKET; k++) {
    const d = ha[k]! - hb[k]!;
    if (d > 0) eccesso += d;
    else mancanti -= d;
  }
  return eccesso > mancanti ? eccesso : mancanti;
}

let bufferPrecedente = new Int32Array(256);
let bufferCorrente = new Int32Array(256);

/**
 * Distanza di Levenshtein, programmazione dinamica iterativa, nessuna
 * dipendenza esterna. Esatta fino a `tetto`; oltre restituisce `tetto + 1`.
 *
 * Calcola solo la fascia di larghezza `2 * tetto + 1` attorno alla diagonale:
 * una cella a piu' di `tetto` dalla diagonale costa gia' piu' di `tetto`
 * modifiche, quindi non puo' far parte di una distanza entro il tetto. Il costo
 * per coppia e' cosi' lunghezza x tetto invece di lunghezza x lunghezza, e si
 * ferma appena una riga intera supera il tetto.
 */
function distanzaConTetto(a: string, b: string, tetto: number): number {
  const m = a.length;
  const n = b.length;
  if (Math.abs(m - n) > tetto) return tetto + 1;
  const oltre = tetto + 1;
  if (bufferPrecedente.length < n + 2) {
    bufferPrecedente = new Int32Array(n + 2);
    bufferCorrente = new Int32Array(n + 2);
  }
  let precedente = bufferPrecedente;
  let corrente = bufferCorrente;
  for (let j = 0; j <= n; j++) precedente[j] = j <= tetto ? j : oltre;
  for (let i = 1; i <= m; i++) {
    const da = Math.max(1, i - tetto);
    const fino = Math.min(n, i + tetto);
    corrente[da - 1] = da === 1 ? Math.min(i, oltre) : oltre;
    if (fino < n) corrente[fino + 1] = oltre;
    const carattere = a.charCodeAt(i - 1);
    let minimoRiga = oltre;
    for (let j = da; j <= fino; j++) {
      const costo = carattere === b.charCodeAt(j - 1) ? 0 : 1;
      let v = precedente[j - 1]! + costo;
      const sopra = precedente[j]! + 1;
      if (sopra < v) v = sopra;
      const sinistra = corrente[j - 1]! + 1;
      if (sinistra < v) v = sinistra;
      if (v > oltre) v = oltre;
      corrente[j] = v;
      if (v < minimoRiga) minimoRiga = v;
    }
    // Il minimo di una riga non scende mai nelle righe successive.
    if (minimoRiga > tetto) return oltre;
    const scambio = precedente;
    precedente = corrente;
    corrente = scambio;
  }
  return Math.min(precedente[n]!, oltre);
}

/**
 * Le coppie sospette del catalogo, ciascuna gia' giudicata.
 *
 * Non confronta uno step con se stesso e non produce coppie duplicate
 * (a,b)/(b,a): ogni coppia non ordinata compare una sola volta.
 *
 * Il ciclo resta su tutte le coppie (cosi' l'ordine del risultato e' quello di
 * sempre, e le coppie "stessi-componenti" non dipendono dal testo), ma ogni
 * coppia costa poco: testo normalizzato e firma dei componenti si calcolano una
 * volta per step, e Levenshtein parte solo se la lunghezza non esclude gia' la
 * somiglianza.
 */
export function individuaCoppie(steps: readonly CatalogStep[]): CoppiaRiconciliazione[] {
  const coppie: CoppiaRiconciliazione[] = [];
  const normalizzati = steps.map((s) => normalizza(s.expression));
  const firme = steps.map((s) => firmaComponenti(s.components));
  const istogrammi = normalizzati.map(istogramma);

  for (let i = 0; i < steps.length; i++) {
    for (let j = i + 1; j < steps.length; j++) {
      const a = steps[i];
      const b = steps[j];
      if (a.expression === b.expression) continue;

      const normA = normalizzati[i]!;
      const normB = normalizzati[j]!;
      const testoSimile = normA === normB || testoMoltoSimile(normA, normB, istogrammi[i]!, istogrammi[j]!);

      if (!stessoAmbito(a.app, b.app)) {
        // Applicazioni diverse, nessuna delle due common/generated: mai
        // fusione ne' rinomina (vedi il commento in testa al file). Il
        // confronto per componente non si fa nemmeno — troppo rumoroso fra
        // prodotti diversi — ma il testo molto simile resta un'informazione
        // onesta da mostrare.
        if (testoSimile) {
          coppie.push({
            id: `${a.expression}||${b.expression}`,
            motivo: 'applicazioni-diverse',
            spiegazione: `il testo e' molto simile ma gli step appartengono ad applicazioni diverse (${a.app} e ${b.app}): puo' essere una coincidenza di formulazione (nomi comuni come "Sign in"), non un doppione — nessuna fusione ne' rinomina proposta`,
            a: vista(a),
            b: vista(b),
            stessoComponente: false,
          });
        }
        continue;
      }

      const uguali = firme[i] !== null && firme[i] === firme[j];

      if (!testoSimile && !uguali) continue;

      const entrambiAncorati = Boolean(a.components?.length) && Boolean(b.components?.length);

      if (testoSimile) {
        coppie.push({
          id: `${a.expression}||${b.expression}`,
          motivo: 'testo-quasi-uguale',
          spiegazione: uguali
            ? "il testo e' quasi identico e i componenti coincidono: probabile doppione, si puo' fondere"
            : entrambiAncorati
              ? "il testo e' quasi identico ma i componenti sono diversi: e' un equivoco di denominazione, non un doppione — non fondere, distingui le frasi"
              : "il testo e' quasi identico, ma almeno uno dei due step non ha ancora un componente dichiarato: non si puo' concludere se sia un doppione",
          a: vista(a),
          b: vista(b),
          stessoComponente: uguali,
        });
      } else {
        coppie.push({
          id: `${a.expression}||${b.expression}`,
          motivo: 'stessi-componenti',
          spiegazione: "due frasi diverse toccano esattamente lo stesso componente: puo' essere lo stesso gesto scritto due volte",
          a: vista(a),
          b: vista(b),
          stessoComponente: true,
        });
      }
    }
  }

  return coppie;
}
