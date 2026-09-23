/**
 * Scrive una variabile in .env conservando il resto del file.
 *
 * Perche' una funzione pura e non una scrittura diretta: cosi' si puo'
 * verificare che sostituisca invece di duplicare — un .env con la stessa chiave
 * due volte ha un comportamento che dipende da chi lo legge, e il sintomo
 * (credenziali che "a volte" non funzionano) non assomiglia alla causa.
 */
import { BERSAGLIO_VALIDO } from './esecuzione';
// Riusate cosi' come sono: e' la stessa regola che gia' legge `diagnosi.ts`
// per decidere se un ambiente e' pronto. Riscriverla qui — anche solo il
// filtro di `missingVars` — avrebbe creato due copie della stessa domanda
// ("quali variabili servono, quali mancano"): due copie divergono sempre, e
// la seconda e' sempre quella sbagliata.
import { requiredVars, missingVars } from '../../../scripts/lib/targets';
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
export function scriviBersaglio(contenutoJson: string, nome: string, url: string): string {
  if (!BERSAGLIO_VALIDO.test(nome) || nome.startsWith('_')) {
    throw new Error(`nome di ambiente non valido: ${JSON.stringify(nome)}`);
  }
  validaUrlBersaglio(url);

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

  const esistente = dati[nome];
  if (esistente && typeof esistente === 'object' && !Array.isArray(esistente)) {
    // Aggiornamento: si sostituisce solo `url` dentro l'oggetto esistente,
    // cosi' `login` (e ogni altro campo) resta quello che era.
    dati[nome] = { ...(esistente as Record<string, unknown>), url };
  } else {
    dati[nome] = { url };
  }

  // Il fine riga si conserva, come in scriviVariabile.
  const eol = contenutoJson.includes('\r\n') ? '\r\n' : '\n';
  const corpo = JSON.stringify(dati, null, 2).replace(/\n/g, eol);
  return corpo + eol;
}
