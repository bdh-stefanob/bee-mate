/**
 * Una richiesta che avvia un comando, o che scrive le credenziali, deve venire
 * dalla finestra — non da una pagina qualunque aperta nello stesso browser.
 *
 * Il cruscotto ascolta su un indirizzo locale, e un indirizzo locale e'
 * raggiungibile da qualsiasi sito che il tester abbia aperto in un'altra
 * scheda: un modulo che si invia da solo verso 127.0.0.1 non chiede permesso a
 * nessuno, perche' con `text/plain` il browser non fa la domanda preventiva.
 *
 * PERCHE' NON SI CONFRONTA CON L'INDIRIZZO DELLA RICHIESTA
 * La prima versione confrontava l'origine con l'host di `request.url`. Sembra
 * ovvio e non funziona: quell'indirizzo non arriva dall'intestazione Host, il
 * framework lo normalizza a `localhost`. La finestra vera vive su `127.0.0.1`,
 * quindi i due non coincidevano mai e ogni pulsante rispondeva di no. Il caso
 * di prova non se n'era accorto perche' costruiva la richiesta a mano, e in
 * una richiesta costruita a mano i due host coincidono per forza: verificava
 * la propria finzione, non il prodotto.
 *
 * Quindi si guarda cio' che il browser dichiara, e lo si confronta con un
 * elenco chiuso di nomi locali — gli unici da cui la finestra puo' essere
 * servita.
 */

/** I nomi con cui ci si riferisce a questa stessa macchina. */
const NOMI_LOCALI = new Set(['127.0.0.1', 'localhost', '::1', '[::1]']);

export function daAltraOrigine(request: Request): boolean {
  // Il browser dice da dove nasce la richiesta: `same-origin` e' la finestra,
  // `none` e' un indirizzo digitato. E' l'intestazione fatta apposta per
  // questa domanda, e non dipende da come il framework ricostruisce l'URL.
  const provenienza = request.headers.get('sec-fetch-site');
  if (provenienza === 'same-origin' || provenienza === 'none') return false;
  if (provenienza) return true;

  // Nessuna intestazione moderna: si ricade sull'origine dichiarata. Se manca
  // anche quella non si puo' concludere niente — succede con le richieste che
  // non nascono da una pagina — e si lascia passare: questa e' una difesa in
  // piu', non l'unica.
  const origine = request.headers.get('origin');
  if (!origine) return false;
  try {
    return !NOMI_LOCALI.has(new URL(origine).hostname);
  } catch {
    return true;
  }
}
