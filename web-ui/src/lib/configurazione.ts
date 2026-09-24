/**
 * Scrive una variabile in .env conservando il resto del file.
 *
 * Perche' una funzione pura e non una scrittura diretta: cosi' si puo'
 * verificare che sostituisca invece di duplicare — un .env con la stessa chiave
 * due volte ha un comportamento che dipende da chi lo legge, e il sintomo
 * (credenziali che "a volte" non funzionano) non assomiglia alla causa.
 */
import * as fs from 'fs';
import * as path from 'path';
import { BERSAGLIO_VALIDO } from './esecuzione';
// Riusate cosi' come sono: e' la stessa regola che gia' legge `diagnosi.ts`
// per decidere se un ambiente e' pronto. Riscriverla qui — anche solo il
// filtro di `missingVars` — avrebbe creato due copie della stessa domanda
// ("quali variabili servono, quali mancano"): due copie divergono sempre, e
// la seconda e' sempre quella sbagliata.
import { requiredVars, missingVars, type LoginRecipe } from '../../../scripts/lib/targets';
import { loadEnv } from '../../../scripts/lib/atlassian';

const CHIAVE_VALIDA = /^[A-Z][A-Z0-9_]{0,60}$/;

export function scriviVariabile(contenutoEnv: string, chiave: string, valore: string): string {
  if (!CHIAVE_VALIDA.test(chiave)) throw new Error(`chiave non valida: ${JSON.stringify(chiave)}`);
  if (/[\r\n]/.test(valore)) throw new Error('il valore non puo\' contenere un a capo');

  // Il fine riga si conserva: un .env in CRLF resta in CRLF (rilievo 2).
  const eol = contenutoEnv.includes('\r\n') ? '\r\n' : '\n';
  const righe = contenutoEnv.split(/\r\n|\n/);

  const indiciEsistenti: number[] = [];
  righe.forEach((r, idx) => {
    if (r.startsWith(`${chiave}=`)) indiciEsistenti.push(idx);
  });

  let risultato: string[];
  if (indiciEsistenti.length > 0) {
    // Si sostituisce solo la prima occorrenza; le altre si rimuovono, non
    // restano a fianco con un valore vecchio (rilievo 1).
    const [primo, ...duplicati] = indiciEsistenti;
    righe[primo] = `${chiave}=${valore}`;
    risultato = righe.filter((_, idx) => !duplicati.includes(idx));
  } else {
    const senzaCodaVuota = righe[righe.length - 1] === '' ? righe.slice(0, -1) : righe;
    risultato = [...senzaCodaVuota, `${chiave}=${valore}`];
  }

  // Il file termina sempre con un a capo (rilievo 3).
  if (risultato[risultato.length - 1] !== '') {
    risultato = [...risultato, ''];
  }

  return risultato.join(eol);
}

/**
 * I nomi dei bersagli, senza gli indirizzi: quelli non servono alla finestra.
 * Un file malformato o di forma inattesa (es. un array) non è un guasto del
 * server: si comporta come un file assente, elenco vuoto (rilievo 4).
 */
export function bersagliDaFile(json: string): string[] {
  let dati: unknown;
  try {
    dati = JSON.parse(json);
  } catch {
    return [];
  }
  if (typeof dati !== 'object' || dati === null || Array.isArray(dati)) {
    return [];
  }
  return Object.keys(dati as Record<string, unknown>).filter((k) => !k.startsWith('_'));
}

/** Un ambiente cosi' come lo vede la schermata Ambienti: nome e indirizzo, mai le credenziali. */
export interface AmbienteVisibile {
  nome: string;
  url: string;
  /** Ha gia' un blocco `login` (scritto a mano o derivato da una registrazione)? */
  haLogin: boolean;
}

/**
 * Gli ambienti con il loro indirizzo, per la sezione Ambienti della schermata
 * di controllo. Un indirizzo scritto come `${VARIABILE}` (non risolto) viene
 * restituito cosi' com'e': non e' una credenziale, e' un segnaposto che vive
 * in .env — mostrarlo non rivela nulla che il file stesso non dica gia'.
 * Stessa tolleranza di `bersagliDaFile` per un file assente o malformato.
 */
export function ambientiDaFile(json: string): AmbienteVisibile[] {
  let dati: unknown;
  try {
    dati = JSON.parse(json);
  } catch {
    return [];
  }
  if (typeof dati !== 'object' || dati === null || Array.isArray(dati)) {
    return [];
  }
  return Object.entries(dati as Record<string, unknown>)
    .filter(([nome]) => !nome.startsWith('_'))
    .map(([nome, valore]) => ({
      nome,
      url: valore && typeof valore === 'object' && typeof (valore as { url?: unknown }).url === 'string'
        ? (valore as { url: string }).url
        : '',
      haLogin: Boolean(
        valore && typeof valore === 'object' && (valore as { login?: unknown }).login
      ),
    }));
}

/**
 * Un ambiente con, in piu', le variabili che gli servono e quelle che
 * mancano ancora — mai i valori, solo i nomi. E' quello che la sezione
 * Ambienti mostra: le credenziali appartengono a un ambiente, non stanno in
 * un mucchio a parte che il tester deve abbinare a mano.
 */
export interface AmbienteConCredenziali extends AmbienteVisibile {
  /** I nomi ${VAR} che questo ambiente referenzia (url compreso), in ordine di prima comparsa. */
  variabiliRichieste: string[];
  /** Il sottoinsieme di sopra che non e' ancora impostato in .env. */
  variabiliMancanti: string[];
  /**
   * C'e' gia' un file di sessione salvato su disco per questo ambiente?
   * Serve solo alla conferma prima di eliminarlo — mai al resto della
   * schermata — cosi' il tester sa PRIMA di premere "Elimina" che sta per
   * perdere anche quella, non solo la voce in bdd-targets.json.
   */
  haSessione: boolean;
}

/**
 * Dove sta (o starebbe) il file di sessione di un ambiente: il campo
 * `session` dell'oggetto se presente in bdd-targets.json, altrimenti la
 * stessa convenzione di default usata da `loadTargets`
 * (`reports/sessions/<nome>.json`) — ma qui risolta contro la cartella del
 * file degli ambienti, non contro la cartella di lavoro del processo: nella
 * finestra quest'ultima e' `web-ui/`, non la radice del repository, e un
 * percorso relativo risolto li' punterebbe a un file che non esiste mai.
 */
function percorsoSessioneAmbiente(
  jsonAmbienti: string,
  targetsPath: string,
  nome: string
): string {
  const radiceRepo = path.dirname(targetsPath);
  let grezzo: unknown;
  try {
    const dati = JSON.parse(jsonAmbienti) as Record<string, unknown>;
    grezzo = dati[nome];
  } catch {
    grezzo = undefined;
  }
  const relativoOAssoluto =
    grezzo && typeof grezzo === 'object' && typeof (grezzo as { session?: unknown }).session === 'string'
      ? (grezzo as { session: string }).session
      : path.join('reports', 'sessions', `${nome}.json`);
  return path.isAbsolute(relativoOAssoluto) ? relativoOAssoluto : path.join(radiceRepo, relativoOAssoluto);
}

/**
 * Gli ambienti (nome, indirizzo) insieme a cio' che serve loro e cio' che
 * manca, per la sezione Ambienti della schermata di controllo.
 *
 * `targetsPath` e `envPath` sono percorsi assoluti sul disco: `requiredVars`
 * e `missingVars` li leggono da soli (non dalla stringa `jsonAmbienti` gia'
 * in mano, che serve solo a `ambientiDaFile` per nome+indirizzo). `missingVars`
 * guarda `process.env`: nel processo della finestra `.env` non e' mai stato
 * letto di suo — a differenza degli script, lanciati come comando a se' che
 * lo caricano all'avvio — quindi lo si carica qui. `loadEnv` non sovrascrive
 * le chiavi gia' presenti: appena il tester scrive una credenziale nuova
 * dalla finestra, la lettura successiva la trova comunque.
 */
export function ambientiConCredenziali(
  jsonAmbienti: string,
  targetsPath: string,
  envPath: string
): AmbienteConCredenziali[] {
  const ambienti = ambientiDaFile(jsonAmbienti);
  loadEnv(envPath);
  const richiesteTutte = requiredVars(targetsPath);
  return ambienti.map((a) => ({
    ...a,
    variabiliRichieste: richiesteTutte.get(a.nome) ?? [],
    variabiliMancanti: missingVars(a.nome, targetsPath),
    haSessione: fs.existsSync(percorsoSessioneAmbiente(jsonAmbienti, targetsPath, a.nome)),
  }));
}

/**
 * Gli schemi che un tester puo' digitare in un indirizzo web. Tutto il resto
 * — `javascript:`, `file:`, `data:` — o non è un indirizzo che il browser di
 * sessione possa aprire come pagina, o è un modo di far eseguire codice a chi
 * lo apre: nessuno dei due è cio' che questo campo deve accettare.
 */
function validaUrlBersaglio(url: string): void {
  let analizzato: URL;
  try {
    analizzato = new URL(url);
  } catch {
    throw new Error('l\'indirizzo non e\' valido');
  }
  if (analizzato.protocol !== 'http:' && analizzato.protocol !== 'https:') {
    throw new Error('l\'indirizzo deve iniziare con http:// o https://');
  }
  // Un indirizzo con `utente:segreto@host` porta la credenziale in chiaro
  // dentro un file JSON che si versiona: esattamente cio' che il progetto
  // evita scrivendole come ${VARIABILE} in .env. Il messaggio non ripete
  // l'indirizzo ricevuto: potrebbe contenere proprio quella credenziale.
  if (analizzato.username || analizzato.password) {
    throw new Error('l\'indirizzo non puo\' contenere credenziali');
  }
}

/**
 * Scrive (o aggiorna) un ambiente in bdd-targets.json, conservando tutto il
 * resto — funzione pura sullo stesso modello di `scriviVariabile`.
 *
 * - Il nome segue la stessa regola dei bersagli usata per lanciare i comandi
 *   (`BERSAGLIO_VALIDO`): un nome che la finestra scrive e uno che qualcuno
 *   scrive a mano nel file devono poter convivere senza sorprese. I nomi che
 *   iniziano con `_` sono riservati (il blocco `_commento` in testa al file):
 *   la regola dei bersagli da sola non li esclude, quindi si esclude qui.
 * - Aggiungere un ambiente nuovo lascia intatti tutti gli altri e il blocco
 *   `_commento`, perche' si riscrive solo la chiave che serve dentro
 *   l'oggetto già esistente, mai l'oggetto per intero.
 * - Aggiornare un ambiente esistente cambia solo `url`: ogni altro campo
 *   (`login`, `readyWhen`, `hint`, ...) viaggia intatto. E' il requisito che
 *   conta di piu' qui — un `login` preparato a mano non si perde perche'
 *   qualcuno ha corretto un indirizzo dalla finestra.
 * - Un file assente o vuoto si comporta come un oggetto vuoto: si crea un
 *   file nuovo con dentro il solo ambiente appena scritto, invece di esplodere.
 * - Un file presente ma illeggibile (JSON rotto, o non un oggetto) non si
 *   riscrive alla cieca: si rifiuta con un errore chiaro, perche' sovrascrivere
 *   un file che non si e' capito rischia di cancellare ambienti preparati a
 *   mano che non si sono nemmeno letti.
 */
/**
 * Legge `bdd-targets.json` in una forma su cui si puo' scrivere sopra: gli
 * stessi controlli per entrambe le funzioni che modificano il file, cosi' un
 * file assente, vuoto, malformato o non-oggetto si comporta allo stesso modo
 * per chiunque scriva li' dentro.
 */
function analizzaBersagli(contenutoJson: string): { dati: Record<string, unknown>; eol: string } {
  const testo = contenutoJson.trim();
  let dati: Record<string, unknown>;
  if (testo === '') {
    dati = {};
  } else {
    let analizzato: unknown;
    try {
      analizzato = JSON.parse(contenutoJson);
    } catch {
      throw new Error('il file degli ambienti non e\' un json leggibile');
    }
    if (typeof analizzato !== 'object' || analizzato === null || Array.isArray(analizzato)) {
      throw new Error('il file degli ambienti non ha la forma attesa');
    }
    dati = { ...(analizzato as Record<string, unknown>) };
  }
  const eol = contenutoJson.includes('\r\n') ? '\r\n' : '\n';
  return { dati, eol };
}

function scriviBersagli(dati: Record<string, unknown>, eol: string): string {
  const corpo = JSON.stringify(dati, null, 2).replace(/\n/g, eol);
  return corpo + eol;
}

export function scriviBersaglio(contenutoJson: string, nome: string, url: string): string {
  if (!BERSAGLIO_VALIDO.test(nome) || nome.startsWith('_')) {
    throw new Error(`nome di ambiente non valido: ${JSON.stringify(nome)}`);
  }
  validaUrlBersaglio(url);

  const { dati, eol } = analizzaBersagli(contenutoJson);

  const esistente = dati[nome];
  if (esistente && typeof esistente === 'object' && !Array.isArray(esistente)) {
    // Aggiornamento: si sostituisce solo `url` dentro l'oggetto esistente,
    // cosi' `login` (e ogni altro campo) resta quello che era.
    dati[nome] = { ...(esistente as Record<string, unknown>), url };
  } else {
    dati[nome] = { url };
  }

  return scriviBersagli(dati, eol);
}

/**
 * Scrive (o sostituisce) il blocco `login` di un ambiente gia' esistente in
 * bdd-targets.json — quello che «Registra l'accesso» deriva da una
 * registrazione vera. Stessa forma pura di `scriviBersaglio`: conserva tutto
 * il resto del file, compreso l'indirizzo dell'ambiente.
 *
 * A differenza di `scriviBersaglio`, l'ambiente deve gia' esistere: il blocco
 * di accesso non ha senso senza un indirizzo a cui appartiene, e quell'
 * indirizzo lo scrive solo il form "Aggiungi ambiente". Se il tester registra
 * l'accesso una seconda volta, il blocco esistente viene sostituito per
 * intero — e' la stessa registrazione a rimpiazzarlo, non ad accodarsi.
 *
 * `readyWhen` si scrive solo se la derivazione l'ha trovato: un ambiente che
 * ne aveva gia' uno preparato a mano, e per cui l'accesso registrato non ha
 * cambiato indirizzo, non lo perde.
 */
export function scriviLoginBersaglio(
  contenutoJson: string,
  nome: string,
  login: LoginRecipe,
  readyWhen?: string
): string {
  if (!BERSAGLIO_VALIDO.test(nome) || nome.startsWith('_')) {
    throw new Error(`nome di ambiente non valido: ${JSON.stringify(nome)}`);
  }

  const { dati, eol } = analizzaBersagli(contenutoJson);

  const esistente = dati[nome];
  if (!esistente || typeof esistente !== 'object' || Array.isArray(esistente)) {
    throw new Error(`ambiente sconosciuto: ${JSON.stringify(nome)}`);
  }

  dati[nome] = {
    ...(esistente as Record<string, unknown>),
    ...(readyWhen ? { readyWhen } : {}),
    login,
  };

  return scriviBersagli(dati, eol);
}

/**
 * Toglie un ambiente da bdd-targets.json — l'indirizzo e, se c'era, il
 * blocco `login` spariscono insieme, perche' sono lo stesso oggetto. Stessa
 * forma pura delle altre due: si rifiuta su un nome non valido o assente,
 * non tocca nessun altro ambiente ne' il blocco `_commento`.
 *
 * Quello che NON tocca, deliberatamente: le variabili in `.env` che
 * quell'ambiente usava. Potrebbero servire a un ambiente omonimo ricreato in
 * seguito, o a un altro bersaglio che le referenzia — cancellarle qui
 * sarebbe un effetto a distanza che chi elimina un ambiente non sta
 * chiedendo. La conferma mostrata prima di chiamare questa funzione lo dice
 * esplicitamente, cosi' il tester non se lo immagina al contrario.
 */
export function rimuoviBersaglio(contenutoJson: string, nome: string): string {
  if (!BERSAGLIO_VALIDO.test(nome) || nome.startsWith('_')) {
    throw new Error(`nome di ambiente non valido: ${JSON.stringify(nome)}`);
  }

  const { dati, eol } = analizzaBersagli(contenutoJson);

  if (!(nome in dati)) {
    throw new Error(`ambiente sconosciuto: ${JSON.stringify(nome)}`);
  }

  delete dati[nome];

  return scriviBersagli(dati, eol);
}

/**
 * Il file di sessione di un ambiente, se ne esiste uno — per cancellarlo
 * quando l'ambiente stesso viene eliminato. Riusa la stessa risoluzione del
 * percorso di `ambientiConCredenziali`/`haSessione`, cosi' cio' che la
 * conferma promette di rimuovere e' esattamente cio' che viene rimosso
 * davvero, non una convenzione diversa applicata alla cieca.
 */
export function percorsoSessionePerEliminazione(
  jsonAmbienti: string,
  targetsPath: string,
  nome: string
): string {
  return percorsoSessioneAmbiente(jsonAmbienti, targetsPath, nome);
}
