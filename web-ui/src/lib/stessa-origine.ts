/**
 * Una richiesta che avvia un comando deve venire dalla finestra, non da una
 * pagina qualunque aperta nello stesso browser.
 *
 * Il cruscotto ascolta su un indirizzo locale, e un indirizzo locale e'
 * raggiungibile da qualsiasi sito che il tester abbia aperto in un'altra
 * scheda: un modulo che si invia da solo verso 127.0.0.1 non chiede permesso a
 * nessuno, perche' con `text/plain` il browser non fa la domanda preventiva.
 *
 * Il rimedio e' leggere da dove arriva. Quando la richiesta parte da un'altra
 * origine il browser lo dichiara, e a quel punto basta dire di no. Se
 * l'intestazione non c'e' — succede con le richieste che non nascono da una
 * pagina — non si puo' concludere niente, e si lascia passare: questa e' una
 * difesa in piu', non l'unica.
 */
export function daAltraOrigine(request: Request): boolean {
  const origine = request.headers.get('origin');
  if (!origine) return false;
  try {
    return new URL(origine).host !== new URL(request.url).host;
  } catch {
    return true;
  }
}
