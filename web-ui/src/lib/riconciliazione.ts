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

/** Distanza di Levenshtein, programmazione dinamica iterativa: nessuna dipendenza esterna. */
function distanza(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const riga = new Array(n + 1);
  for (let j = 0; j <= n; j++) riga[j] = j;
  for (let i = 1; i <= m; i++) {
    let precedenteDiagonale = riga[0];
    riga[0] = i;
    for (let j = 1; j <= n; j++) {
      const temp = riga[j];
      const costo = a[i - 1] === b[j - 1] ? 0 : 1;
      riga[j] = Math.min(riga[j] + 1, riga[j - 1] + 1, precedenteDiagonale + costo);
      precedenteDiagonale = temp;
    }
  }
  return riga[n];
}

/** 1 = identiche, 0 = nulla in comune. */
function somiglianza(a: string, b: string): number {
  const lunghezzaMax = Math.max(a.length, b.length);
  if (lunghezzaMax === 0) return 1;
  return 1 - distanza(a, b) / lunghezzaMax;
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

/**
 * Stesso insieme di componenti? `false` anche quando uno dei due (o entrambi)
 * non ha ancora un componente dichiarato: l'assenza non e' un'uguaglianza, e'
 * uno stato onesto diverso (vedi `component-impact.ts`) che non si deve
 * confondere con "coincidono".
 */
function stessiComponenti(a: StepComponentRef[] | undefined, b: StepComponentRef[] | undefined): boolean {
  if (!a || !b || a.length === 0 || b.length === 0) return false;
  if (a.length !== b.length) return false;
  const insiemeA = new Set(a.map(chiaveComponente));
  const insiemeB = new Set(b.map(chiaveComponente));
  if (insiemeA.size !== insiemeB.size) return false;
  for (const k of insiemeA) {
    if (!insiemeB.has(k)) return false;
  }
  return true;
}

function vista(s: CatalogStep): StepPerConfronto {
  return { espressione: s.expression, componenti: s.components ?? [], documentato: s.documented, app: s.app };
}

/**
 * Le coppie sospette del catalogo, ciascuna gia' giudicata.
 *
 * Non confronta uno step con se stesso e non produce coppie duplicate
 * (a,b)/(b,a): ogni coppia non ordinata compare una sola volta.
 */
export function individuaCoppie(steps: readonly CatalogStep[]): CoppiaRiconciliazione[] {
  const coppie: CoppiaRiconciliazione[] = [];

  for (let i = 0; i < steps.length; i++) {
    for (let j = i + 1; j < steps.length; j++) {
      const a = steps[i];
      const b = steps[j];
      if (a.expression === b.expression) continue;

      const normA = normalizza(a.expression);
      const normB = normalizza(b.expression);
      const testoIdentico = normA === normB;
      const testoMoltoSimile = !testoIdentico && somiglianza(normA, normB) >= SOGLIA_SOMIGLIANZA;

      if (!stessoAmbito(a.app, b.app)) {
        // Applicazioni diverse, nessuna delle due common/generated: mai
        // fusione ne' rinomina (vedi il commento in testa al file). Il
        // confronto per componente non si fa nemmeno — troppo rumoroso fra
        // prodotti diversi — ma il testo molto simile resta un'informazione
        // onesta da mostrare.
        if (testoIdentico || testoMoltoSimile) {
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

      const uguali = stessiComponenti(a.components, b.components);

      if (!testoIdentico && !testoMoltoSimile && !uguali) continue;

      const entrambiAncorati = Boolean(a.components?.length) && Boolean(b.components?.length);

      if (testoIdentico || testoMoltoSimile) {
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
