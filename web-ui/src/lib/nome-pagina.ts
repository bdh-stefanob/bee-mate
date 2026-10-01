/**
 * (F6) Il nome di una pagina come lo legge il tester, non come lo scrive il
 * codice: `CheckoutStepOnePage` -> "Checkout step one".
 *
 * Il catalogo porta il nome della classe della Page Object. Il tester non vede
 * codice (l'unica eccezione e' il confronto dei gestori nel flusso di fusione),
 * quindi la finestra mostra questo nome, e la classe resta dietro "Dettagli
 * tecnici" dove la scheda ne ha gia' uno.
 */

/** Dove una parola finisce e un'altra comincia: `aB`, `1B`, e `ABc` fra `A` e `Bc`. */
const CONFINE_PAROLA = /(?<=[a-z0-9])(?=[A-Z])|(?<=[A-Z])(?=[A-Z][a-z])/;

export function nomeLeggibilePagina(classe: string): string {
  const pulito = classe.trim();
  if (!pulito) return '';
  // Un nome che e' solo "Page" non ha altro da dire: si lascia com'e'.
  const senzaSuffisso = pulito.replace(/[_\-\s]?Page$/i, '') || pulito;
  const parole = senzaSuffisso
    .split(/[_\-\s]+/)
    .flatMap((pezzo) => pezzo.split(CONFINE_PAROLA))
    .filter(Boolean);
  if (parole.length === 0) return pulito;
  return parole
    .map((p, i) => {
      // Le sigle (SMS, FAQ) restano in maiuscolo; il resto in minuscolo, la prima parola con l'iniziale.
      const sigla = p.length > 1 && p === p.toUpperCase() && /[A-Z]/.test(p);
      if (sigla) return p;
      const minuscola = p.toLowerCase();
      return i === 0 ? minuscola.charAt(0).toUpperCase() + minuscola.slice(1) : minuscola;
    })
    .join(' ');
}

/** Piu' pagine in una frase: "Cart, Inventory". */
export function nomiLeggibiliPagine(classi: readonly string[]): string {
  return classi.map(nomeLeggibilePagina).join(', ');
}
