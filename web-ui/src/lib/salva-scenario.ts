import * as fs from 'fs';
import * as path from 'path';
import { dentroLaCartella } from './percorsi';

/**
 * Dare una casa a uno scenario registrato.
 *
 * La generazione scrive in `src/features/generated/<registrazione>.feature`:
 * un nome che dice quando e' stato registrato, non cosa verifica, e una
 * cartella dove tutto sta insieme. Qui il tester dice a quale applicazione e
 * flusso appartiene e come si chiama, e il file va in
 * `src/features/<app>/<flusso>/<nome>.feature` — lo stesso albero degli
 * scenari scritti a mano, che il portale gia' mostra per applicazione e flusso.
 *
 * Tre regole, ciascuna con il suo caso:
 *  - si sposta solo cio' che e' uscito da una registrazione (cartella
 *    `generated/` e marcatore di generazione): questa non e' una funzione per
 *    spostare file qualunque;
 *  - applicazione e flusso sono nomi di cartella, mai percorsi;
 *  - un file di destinazione modificato a mano non si sovrascrive mai: se ha
 *    perso il marcatore qualcuno ci ha lavorato, e perdere il suo lavoro senza
 *    un errore e' il guasto che si scopre giorni dopo. Si scrive accanto.
 */

/**
 * La stessa stringa di `GENERATED_MARKER` in `scripts/lib/render-template.ts`.
 * Copiata e non importata: questo modulo vive nell'app, che non compila gli
 * script. Se cambia la', va cambiata qui.
 */
const MARCATORE = 'generato-da: bdd-generate';

const CARTELLA_REGISTRATI = 'generated';
const NOME_CARTELLA = /^[a-z0-9][a-z0-9-]{0,39}$/;
const MAX_TITOLO = 80;
const MAX_COPIE = 99;

/** Perche' non si e' salvato: la finestra lo traduce, il messaggio resta per i log e i test. */
export type CodiceErrore =
  | 'non-registrato' | 'non-trovato' | 'app' | 'flusso' | 'titolo' | 'troppi'
  | 'passo-duplicato' | 'pagina-a-mano';

export class ErroreSalvataggio extends Error {
  /** Cio' che la persona deve vedere per rimediare: le frasi in conflitto, le pagine toccate a mano. */
  readonly dettagli: string[];
  constructor(readonly codice: CodiceErrore, messaggio: string, dettagli: string[] = []) {
    super(messaggio);
    this.dettagli = dettagli;
  }
}

/** Il marcatore dei file generati: esportato per chi sposta anche step e Page Object. */
export { MARCATORE };

export interface SceltaScenario {
  app: string;
  flusso: string;
  titolo: string;
}

export interface EsitoSalvataggio {
  /** Percorso relativo a `src/features/`, con separatori `/`. */
  file: string;
  /** Ha preso il posto di un file generato in precedenza. */
  sovrascritto: boolean;
  /** Il nome era occupato da un file modificato a mano: si e' scritto accanto. */
  rinominato: boolean;
}

/** Dal titolo al nome del file: minuscole, niente accenti, trattini. */
export function nomeFile(titolo: string): string {
  return titolo
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/, '');
}

function nomeCartella(valore: string, codice: 'app' | 'flusso'): string {
  if (!NOME_CARTELLA.test(valore) || valore === CARTELLA_REGISTRATI) {
    const etichetta = codice === 'app' ? 'applicazione' : 'flusso';
    throw new ErroreSalvataggio(codice, `${etichetta} non valida: usa lettere minuscole, cifre e trattini`);
  }
  return valore;
}

function rigeneribile(file: string): boolean {
  return fs.readFileSync(file, 'utf-8').includes(MARCATORE);
}

/** Il testo del file nella sua nuova casa: intestazione, tag e titolo. I passi non si toccano. */
function trasforma(testo: string, scelta: SceltaScenario, destinazione: string): string {
  const righe = testo.split('\n');
  const iFeature = righe.findIndex((r) => /^\s*Feature:/.test(r));
  const tagVoluti = [`@${scelta.app}`, `@${scelta.flusso}`];

  // La riga che dichiara dove sta il file: nata con il vecchio percorso.
  const iPercorso = righe.findIndex((r, i) => i < iFeature && /^#\s+\S*features\/\S+\.feature\s*$/.test(r));
  if (iPercorso >= 0) righe[iPercorso] = `# src/features/${destinazione}`;

  // I tag stanno sulla riga subito sopra "Feature:", se c'e'.
  const iTag = iFeature > 0 && righe[iFeature - 1].trim().startsWith('@') ? iFeature - 1 : -1;
  if (iTag >= 0) {
    const presenti = righe[iTag].trim().split(/\s+/);
    const mancanti = tagVoluti.filter((t) => !presenti.includes(t));
    righe[iTag] = [...mancanti, ...presenti].join(' ');
  } else if (iFeature >= 0) {
    righe.splice(iFeature, 0, tagVoluti.join(' '));
  }

  const iTitolo = righe.findIndex((r) => /^\s*Feature:/.test(r));
  if (iTitolo >= 0) {
    // La generazione da' lo stesso titolo alla Feature e al suo scenario: se
    // lo scenario porta ancora quel titolo, prende anche lui il nome scelto.
    // Uno scenario rinominato a mano resta com'e'.
    const vecchio = righe[iTitolo].replace(/^\s*Feature:\s*/, '').trim();
    righe[iTitolo] = `Feature: ${scelta.titolo}`;
    for (let i = iTitolo + 1; i < righe.length; i++) {
      const m = righe[i].match(/^(\s*Scenario:\s*)(.*)$/);
      if (m && m[2].trim() === vecchio) righe[i] = `${m[1]}${scelta.titolo}`;
    }
  }
  return righe.join('\n');
}

/** Cosa si scriverebbe, senza scrivere niente: serve a controllare tutto prima di toccare il disco. */
export interface PianoScenario extends EsitoSalvataggio {
  origineAssoluta: string;
  destinazioneAssoluta: string;
  testo: string;
}

export function salvaScenario(
  radiceFeatures: string,
  origine: string,
  scelta: SceltaScenario
): EsitoSalvataggio {
  const piano = pianificaScenario(radiceFeatures, origine, scelta);
  scriviScenario(piano);
  return { file: piano.file, sovrascritto: piano.sovrascritto, rinominato: piano.rinominato };
}

export function scriviScenario(piano: PianoScenario): void {
  fs.mkdirSync(path.dirname(piano.destinazioneAssoluta), { recursive: true });
  fs.writeFileSync(piano.destinazioneAssoluta, piano.testo);
  fs.unlinkSync(piano.origineAssoluta);
}

export function pianificaScenario(
  radiceFeatures: string,
  origine: string,
  scelta: SceltaScenario
): PianoScenario {
  const registrati = path.join(radiceFeatures, CARTELLA_REGISTRATI);
  const assoluto = dentroLaCartella(registrati, path.relative(registrati, path.join(radiceFeatures, origine)), '.feature');
  if (!assoluto || !origine.startsWith(`${CARTELLA_REGISTRATI}/`) || origine.includes('..')) {
    throw new ErroreSalvataggio('non-registrato', "questo file non e' uno scenario registrato");
  }
  if (!fs.existsSync(assoluto)) throw new ErroreSalvataggio('non-trovato', 'non trovo lo scenario appena generato');
  if (!rigeneribile(assoluto)) throw new ErroreSalvataggio('non-registrato', "questo file non e' uno scenario registrato");

  const app = nomeCartella(scelta.app, 'app');
  const flusso = nomeCartella(scelta.flusso, 'flusso');
  const titolo = scelta.titolo.trim();
  const nome = nomeFile(titolo);
  if (!titolo || titolo.length > MAX_TITOLO || /[\r\n]/.test(titolo) || !nome) {
    throw new ErroreSalvataggio('titolo', 'titolo non valido: una riga sola, con almeno una lettera o una cifra');
  }

  let file = `${app}/${flusso}/${nome}.feature`;
  let sovrascritto = false;
  let rinominato = false;
  const occupato = (rel: string) => fs.existsSync(path.join(radiceFeatures, rel));

  if (occupato(file)) {
    if (rigeneribile(path.join(radiceFeatures, file))) {
      sovrascritto = true;
    } else {
      rinominato = true;
      let n = 2;
      while (occupato(`${app}/${flusso}/${nome}-${n}.feature`)) {
        if (++n > MAX_COPIE) throw new ErroreSalvataggio('troppi', 'troppi file con questo nome: scegline un altro');
      }
      file = `${app}/${flusso}/${nome}-${n}.feature`;
    }
  }

  return {
    file,
    sovrascritto,
    rinominato,
    origineAssoluta: assoluto,
    destinazioneAssoluta: path.join(radiceFeatures, file),
    testo: trasforma(fs.readFileSync(assoluto, 'utf-8'), { app, flusso, titolo }, file),
  };
}

/** Applicazioni e aree dichiarate nel catalogo: i valori da proporre al tester. */
export function cartelleDalCatalogo(
  voci: ReadonlyArray<{ app?: string; area?: string }>
): Array<{ app: string; flussi: string[] }> {
  const mappa = new Map<string, Set<string>>();
  for (const v of voci) {
    if (!v.app || !v.area || v.app === CARTELLA_REGISTRATI) continue;
    if (!NOME_CARTELLA.test(v.app) || !NOME_CARTELLA.test(v.area)) continue;
    if (!mappa.has(v.app)) mappa.set(v.app, new Set());
    mappa.get(v.app)!.add(v.area);
  }
  return [...mappa.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([app, flussi]) => ({ app, flussi: [...flussi].sort() }));
}
