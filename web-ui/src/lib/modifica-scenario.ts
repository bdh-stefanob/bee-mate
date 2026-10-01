import { MARCATORE } from './marcatore';
import { PREFISSO_VERIFICA, tokenizzaGherkin, type ParolaPasso } from './gherkin-lettura';

/**
 * Le trasformazioni di testo della modifica guidata di uno scenario
 * (docs/superpowers/specs/2026-10-01-modifica-scenari-e-dismissione-portale-design.md,
 * A2 e A5).
 *
 * La bozza di uno scenario e' SEMPRE UN TESTO — il contenuto del `.feature` — e
 * ogni gesto del tester (cambia il titolo, usa un altro passo, togli un passo,
 * aggiungi una verifica) e' una funzione da testo a testo. Un'unica fonte di
 * verita': il pannello non tiene una seconda struttura dati che possa
 * dissentire da quello che si scrive sul disco.
 *
 * Funzioni pure, senza `fs`: girano sia nel browser (la bozza) sia sul server
 * (il controllo). Ognuna conserva indentazione, parola chiave e fine riga
 * (CRLF compreso) di cio' che non tocca, e si rifiuta con `ErroreModifica` — con
 * un codice stabile, che la finestra traduce — invece di produrre un testo
 * plausibile ma sbagliato.
 */

export type CodiceModifica = 'titolo' | 'riga' | 'frase' | 'valore' | 'nessun-passo';

export class ErroreModifica extends Error {
  constructor(readonly codice: CodiceModifica, messaggio: string) {
    super(messaggio);
  }
}

export const MAX_TITOLO = 80;

/** La frase dello step comune che verifica un testo sulla pagina (`steps/common/verifica.steps.ts`). */
export const FRASE_VERIFICA = 'the page shows';

const PASSO = /^(\s*)(Given|When|Then|And|But)(\s+)(.*?)(\s*)$/;
const SCENARIO = /^(\s*)(Scenario|Example):(\s*)(.*)$/;
const FEATURE = /^\s*Feature:/;
const VERIFICA_A_META = new RegExp(`^\\s*#\\s*${PREFISSO_VERIFICA}`);
const FRASE_DEL_TESTER = /^\s*#\s*frase del tester:/;

interface Righe {
  righe: string[];
  eol: string;
}

function dividi(testo: string): Righe {
  return { righe: testo.split(/\r\n|\n/), eol: testo.includes('\r\n') ? '\r\n' : '\n' };
}

const unisci = ({ righe, eol }: Righe): string => righe.join(eol);

// ---------------------------------------------------------------------------
// Si puo' modificare con i gesti?
// ---------------------------------------------------------------------------

export type Semplicita =
  | { semplice: true }
  /**
   * `documento`: un caso documentato (`@non-automatizzato`), si legge e basta.
   * `complesso`: piu' scenari, Background, Rule, esempi, tabelle, DocString o
   * un'altra lingua: la modifica guidata non li copre.
   */
  | { semplice: false; ragione: 'documento' | 'complesso' };

/** Un solo `Scenario:`, nessun costrutto che i gesti non sanno trattare. */
export function valutaSemplicita(testo: string): Semplicita {
  const righe = tokenizzaGherkin(testo);
  const tag = righe.flatMap((r) => (r.tipo === 'tag' ? r.tag : []));
  if (tag.includes('@non-automatizzato')) return { semplice: false, ragione: 'documento' };

  let scenari = 0;
  for (const r of righe) {
    if (r.tipo === 'tabella') return { semplice: false, ragione: 'complesso' };
    if (r.tipo === 'semplice' && /^("""|```)/.test(r.testo)) return { semplice: false, ragione: 'complesso' };
    if (r.tipo !== 'intestazione') continue;
    if (r.parola === 'Scenario' || r.parola === 'Example') scenari++;
    else if (r.parola !== 'Feature') return { semplice: false, ragione: 'complesso' };
  }
  // Un file con un'altra lingua dichiarata non si interpreta (tutte righe "semplici"): niente scenari.
  return scenari === 1 ? { semplice: true } : { semplice: false, ragione: 'complesso' };
}

// ---------------------------------------------------------------------------
// Lettura
// ---------------------------------------------------------------------------

export interface PassoLetto {
  /** Numero di riga, da 1. */
  riga: number;
  parolaChiave: Exclude<ParolaPasso, '*'>;
  frase: string;
  /** Le verifiche scritte sotto il passo (`# durante questo passo si verifica: "X"`): si mostrano, non si modificano. */
  verifiche: string[];
}

const VERIFICA_VALORE = new RegExp(`^\\s*#\\s*${PREFISSO_VERIFICA}\\s*"(.*)"\\s*$`);

/** I passi dello scenario, nell'ordine in cui compaiono. */
export function leggiPassi(testo: string): PassoLetto[] {
  const { righe } = dividi(testo);
  const passi: PassoLetto[] = [];
  let inScenario = false;
  righe.forEach((r, i) => {
    if (SCENARIO.test(r)) {
      inScenario = true;
      return;
    }
    if (!inScenario) return;
    const m = PASSO.exec(r);
    if (m) {
      passi.push({ riga: i + 1, parolaChiave: m[2] as PassoLetto['parolaChiave'], frase: m[4], verifiche: [] });
      return;
    }
    const v = VERIFICA_VALORE.exec(r);
    if (v && passi.length > 0) passi[passi.length - 1].verifiche.push(v[1]);
  });
  return passi;
}

/** Il titolo dello scenario (non quello della Feature), o `''`. */
export function titoloDi(testo: string): string {
  for (const r of dividi(testo).righe) {
    const m = SCENARIO.exec(r);
    if (m) return m[4].trim();
  }
  return '';
}

// ---------------------------------------------------------------------------
// I gesti
// ---------------------------------------------------------------------------

/**
 * Cambia il titolo: la riga `Feature:` e, se portava lo stesso nome (la
 * generazione da' lo stesso titolo a entrambe), anche `Scenario:`. Uno scenario
 * rinominato a mano resta com'e'. Tag e commento di testa non si toccano.
 */
export function cambiaTitolo(testo: string, titolo: string): string {
  const nuovo = titolo.trim();
  if (!nuovo || /[\r\n]/.test(nuovo) || nuovo.length > MAX_TITOLO) {
    throw new ErroreModifica('titolo', 'titolo non valido: una riga sola, non vuota, al massimo 80 caratteri');
  }
  const d = dividi(testo);
  const iFeature = d.righe.findIndex((r) => FEATURE.test(r));
  if (iFeature < 0) throw new ErroreModifica('titolo', 'non trovo il titolo');

  const vecchio = d.righe[iFeature].replace(/^\s*Feature:\s*/, '').trim();
  if (vecchio !== nuovo) {
    d.righe[iFeature] = d.righe[iFeature].replace(/^(\s*Feature:\s*).*$/, `$1${nuovo}`);
  }
  for (let i = iFeature + 1; i < d.righe.length; i++) {
    const m = SCENARIO.exec(d.righe[i]);
    if (m && m[4].trim() === vecchio && vecchio !== nuovo) d.righe[i] = `${m[1]}${m[2]}:${m[3] || ' '}${nuovo}`;
  }
  return unisci(d);
}

function passoAllaRiga(righe: string[], riga: number): RegExpExecArray {
  const m = riga >= 1 && riga <= righe.length ? PASSO.exec(righe[riga - 1]) : null;
  if (!m) throw new ErroreModifica('riga', 'questa riga non e\' un passo');
  return m;
}

/** Quante righe di verifica a meta' passo seguono la riga `indice` (0-based), una dopo l'altra. */
function verificheSotto(righe: string[], indice: number): number {
  let n = 0;
  while (indice + 1 + n < righe.length && VERIFICA_A_META.test(righe[indice + 1 + n])) n++;
  return n;
}

/**
 * Cambia la frase di UN passo (la riga `riga`, da 1) con un'altra. Le verifiche
 * a meta' passo che gli stanno sotto vanno via: descrivevano cio' che il codice
 * del vecchio passo controllava, e sotto un altro passo sarebbero una bugia.
 */
export function sostituisciPasso(testo: string, riga: number, frase: string): string {
  const nuova = frase.trim();
  if (!nuova || /[\r\n]/.test(nuova)) throw new ErroreModifica('frase', 'frase non valida');
  const d = dividi(testo);
  const m = passoAllaRiga(d.righe, riga);
  if (m[4] === nuova) return testo;
  const i = riga - 1;
  const sotto = verificheSotto(d.righe, i);
  d.righe.splice(i, 1 + sotto, `${m[1]}${m[2]}${m[3]}${nuova}${m[5]}`);
  return unisci(d);
}

/**
 * Toglie un passo, con le sue verifiche a meta' passo e con il commento "frase
 * del tester" che gli sta sopra. Se era un `Given`/`When`/`Then` e il passo dopo
 * e' un `And`/`But`, quello prende la sua parola chiave: altrimenti il testo
 * comincerebbe con un `And`.
 */
export function rimuoviPasso(testo: string, riga: number): string {
  const d = dividi(testo);
  const m = passoAllaRiga(d.righe, riga);
  const i = riga - 1;
  const sotto = verificheSotto(d.righe, i);
  const sopra = i > 0 && FRASE_DEL_TESTER.test(d.righe[i - 1]) ? 1 : 0;
  d.righe.splice(i - sopra, 1 + sotto + sopra);

  if (m[2] !== 'And' && m[2] !== 'But') {
    for (let j = i - sopra; j < d.righe.length; j++) {
      const prossimo = PASSO.exec(d.righe[j]);
      if (!prossimo) {
        if (SCENARIO.test(d.righe[j])) break;
        continue;
      }
      if (prossimo[2] === 'And' || prossimo[2] === 'But') {
        d.righe[j] = `${prossimo[1]}${m[2]}${prossimo[3]}${prossimo[4]}${prossimo[5]}`;
      }
      break;
    }
  }
  return unisci(d);
}

/**
 * Accoda `Then the page shows "valore"` in fondo allo scenario (con `And` se
 * l'ultimo passo e' gia' una verifica, come fa il generatore), dopo le
 * eventuali verifiche a meta' passo dell'ultimo passo.
 */
export function aggiungiVerifica(testo: string, valore: string): string {
  const v = valore.trim();
  if (!v || /[\r\n]/.test(v)) throw new ErroreModifica('valore', 'il testo da verificare deve stare su una riga');
  // Come il generatore: una virgoletta doppia nel valore chiuderebbe il parametro.
  const pulito = v.replace(/"/g, "'");

  const d = dividi(testo);
  let ultimo = -1;
  let effettiva = '';
  let inScenario = false;
  d.righe.forEach((r, i) => {
    if (SCENARIO.test(r)) {
      inScenario = true;
      return;
    }
    const m = inScenario ? PASSO.exec(r) : null;
    if (!m) return;
    ultimo = i;
    if (m[2] !== 'And' && m[2] !== 'But') effettiva = m[2];
  });
  if (ultimo < 0) throw new ErroreModifica('nessun-passo', 'lo scenario non ha passi a cui accodare');

  const indentazione = PASSO.exec(d.righe[ultimo])![1];
  const parola = effettiva === 'Then' ? 'And' : 'Then';
  d.righe.splice(ultimo + 1 + verificheSotto(d.righe, ultimo), 0, `${indentazione}${parola} ${FRASE_VERIFICA} "${pulito}"`);
  return unisci(d);
}

/**
 * Chi modifica rende suo il file: via la riga del marcatore di generazione. I
 * tag (`@generato`, `@da-rivedere`) restano dove sono. Un testo senza
 * marcatore resta identico.
 */
export function togliMarcatore(testo: string): string {
  const d = dividi(testo);
  const rimaste = d.righe.filter((r) => !r.includes(MARCATORE));
  return rimaste.length === d.righe.length ? testo : unisci({ righe: rimaste, eol: d.eol });
}
