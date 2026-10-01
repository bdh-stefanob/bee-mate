/**
 * Il testo Gherkin, letto per essere MOSTRATO (sola lettura), non modificato.
 *
 * E' una funzione pura che trasforma il testo in righe tipizzate; la disegna
 * `GherkinLeggibile`. Non si usa CodeMirror perche' qui non serve un editor:
 * porterebbe dietro autocompletamento, linter e sottolineature "step non nel
 * catalogo" su uno scenario che per il tester e' giusto (vedi la spec della
 * pagina Scenari). Il passaggio a `GherkinEditor` e' del momento in cui si
 * modifica.
 *
 * Il progetto scrive Gherkin inglese. Un file che dichiara un'altra lingua
 * (`# language: it`) NON si interpreta: meglio non colorare che colorare male.
 */

/**
 * Il prefisso con cui il generatore (`scripts/lib/generate-emit.ts`) scrive le
 * verifiche dichiarate durante un passo. Un caso di contratto legge quel file e
 * fallisce se il prefisso cambia da una parte sola.
 */
export const PREFISSO_VERIFICA = 'durante questo passo si verifica:';

export interface ParteDiPasso {
  /** `true` = il testo fra virgolette: un valore, che si vede anche senza colori. */
  valore: boolean;
  /** Per un valore comprende le virgolette: il testo si copia com'e'. */
  testo: string;
}

interface Base {
  /** Numero di riga, da 1. */
  numero: number;
  /** La riga com'era, senza il fine riga. */
  originale: string;
  /** Spazi iniziali (una tabulazione conta 2). */
  rientro: number;
}

export type RigaGherkin =
  | (Base & { tipo: 'tag'; tag: string[] })
  | (Base & { tipo: 'intestazione'; parola: ParolaIntestazione; titolo: string })
  | (Base & { tipo: 'passo'; parola: ParolaPasso; parti: ParteDiPasso[] })
  | (Base & { tipo: 'verifica'; testo: string })
  | (Base & { tipo: 'commento'; testo: string })
  | (Base & { tipo: 'tabella'; celle: string[] })
  | (Base & { tipo: 'descrizione'; testo: string })
  | (Base & { tipo: 'semplice'; testo: string })
  | (Base & { tipo: 'vuota' });

export type ParolaIntestazione =
  | 'Feature' | 'Background' | 'Scenario' | 'Scenario Outline' | 'Scenario Template'
  | 'Rule' | 'Examples' | 'Scenarios' | 'Example';
export type ParolaPasso = 'Given' | 'When' | 'Then' | 'And' | 'But' | '*';

const INTESTAZIONE = /^(Feature|Background|Scenario Outline|Scenario Template|Scenario|Scenarios|Example|Examples|Rule):\s*(.*)$/;
const PASSO = /^(Given|When|Then|And|But|\*)\s+(.*)$/;
const LINGUA = /^#\s*language\s*:\s*([A-Za-z-]+)/;
const VERIFICA = new RegExp(`^#\\s*${PREFISSO_VERIFICA.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*"(.*)"\\s*$`);

function rientroDi(riga: string): number {
  let n = 0;
  for (const c of riga) {
    if (c === ' ') n += 1;
    else if (c === '\t') n += 2;
    else break;
  }
  return n;
}

function partiDiPasso(testo: string): ParteDiPasso[] {
  const parti: ParteDiPasso[] = [];
  const valori = /"[^"]*"/g;
  let ultimo = 0;
  for (let m = valori.exec(testo); m; m = valori.exec(testo)) {
    if (m.index > ultimo) parti.push({ valore: false, testo: testo.slice(ultimo, m.index) });
    parti.push({ valore: true, testo: m[0] });
    ultimo = m.index + m[0].length;
  }
  if (ultimo < testo.length || parti.length === 0) parti.push({ valore: false, testo: testo.slice(ultimo) });
  return parti;
}

function celleDi(riga: string): string[] {
  const interno = riga.trim().replace(/^\|/, '').replace(/\|$/, '');
  return interno.split('|').map((c) => c.trim());
}

export function tokenizzaGherkin(testo: string): RigaGherkin[] {
  if (testo === '') return [];
  const righe = testo.split(/\r?\n/);
  if (righe[righe.length - 1] === '') righe.pop();

  // Una lingua diversa dall'inglese: niente si interpreta.
  const dichiarata = righe.map((r) => LINGUA.exec(r.trim())).find((m) => m !== null);
  const nonInglese = dichiarata !== undefined && dichiarata !== null && dichiarata[1].toLowerCase() !== 'en';

  const out: RigaGherkin[] = [];
  let inDocstring = false;
  // Fra `Feature:` e il primo scenario le righe libere sono la descrizione.
  let inDescrizione = false;

  righe.forEach((originale, i) => {
    const base: Base = { numero: i + 1, originale, rientro: rientroDi(originale) };
    const riga = originale.trim();

    if (nonInglese) {
      out.push(riga === '' ? { ...base, tipo: 'vuota' } : { ...base, tipo: 'semplice', testo: riga });
      return;
    }
    if (riga === '') {
      out.push({ ...base, tipo: 'vuota' });
      return;
    }
    if (riga.startsWith('"""') || riga.startsWith('```')) {
      inDocstring = !inDocstring;
      out.push({ ...base, tipo: 'semplice', testo: riga });
      return;
    }
    if (inDocstring) {
      out.push({ ...base, tipo: 'semplice', testo: riga });
      return;
    }
    if (riga.startsWith('@')) {
      inDescrizione = false;
      out.push({ ...base, tipo: 'tag', tag: riga.split(/\s+/).filter((t) => t.startsWith('@')) });
      return;
    }
    if (riga.startsWith('#')) {
      const verifica = VERIFICA.exec(riga);
      out.push(verifica ? { ...base, tipo: 'verifica', testo: verifica[1] } : { ...base, tipo: 'commento', testo: riga });
      return;
    }
    if (riga.startsWith('|')) {
      out.push({ ...base, tipo: 'tabella', celle: celleDi(riga) });
      return;
    }
    const intestazione = INTESTAZIONE.exec(riga);
    if (intestazione) {
      inDescrizione = intestazione[1] === 'Feature';
      out.push({
        ...base,
        tipo: 'intestazione',
        parola: intestazione[1] as ParolaIntestazione,
        titolo: intestazione[2].trim(),
      });
      return;
    }
    const passo = PASSO.exec(riga);
    if (passo) {
      inDescrizione = false;
      out.push({ ...base, tipo: 'passo', parola: passo[1] as ParolaPasso, parti: partiDiPasso(passo[2]) });
      return;
    }
    out.push(inDescrizione ? { ...base, tipo: 'descrizione', testo: riga } : { ...base, tipo: 'semplice', testo: riga });
  });

  return out;
}
