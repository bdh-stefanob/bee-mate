/**
 * ambiente-corrente.ts
 * --------------------
 * Il nome del cookie che porta l'ambiente scelto per l'intera finestra, e la
 * regola che un valore deve rispettare per essere accettato.
 *
 * PERCHE' UN COOKIE, E PERCHE' QUESTO NOME
 * Stesso meccanismo della lingua (`src/i18n/request.ts` + `/api/lingua`):
 * un cookie che il guscio Electron conserva da un'apertura all'altra come
 * farebbe un browser, letto lato server nel layout del cruscotto e passato
 * giu' come valore iniziale a un contesto React.
 *
 * PERCHE' NON UN CONCETTO NUOVO ("applicazione")
 * L'ambiente (vedi `scripts/lib/targets.ts`, `bdd-targets.json`) e' gia' "su
 * cosa sto lavorando": un nome, un indirizzo, un login, una sessione. Il
 * campo "app" del catalogo step (`step-catalog.json`) e' un'altra cosa — un
 * dominio di step (auth, orders, weight-loss...), non legato uno a uno agli
 * ambienti. Introdurre "applicazione" accanto ad "ambiente" avrebbe dato due
 * nomi alla stessa domanda in un caso e una fusione sbagliata nell'altro:
 * si rende esplicita la scelta che c'e' gia', non se ne inventa una nuova.
 */

export const NOME_COOKIE_AMBIENTE = 'ambiente-corrente';

/** Stessa regola di `BERSAGLIO_VALIDO` in `lib/esecuzione.ts`: un nome, non una riga di comando. */
export const AMBIENTE_VALIDO = /^[A-Za-z0-9._-]{1,40}$/;

export function ambienteValido(valore: unknown): valore is string {
  return typeof valore === 'string' && AMBIENTE_VALIDO.test(valore);
}
