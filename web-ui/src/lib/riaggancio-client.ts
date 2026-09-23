/**
 * Il posto dove una schermata ricorda "sto aspettando questa esecuzione",
 * cosi' cambiare pagina e tornare indietro non la fa ripartire da zero.
 *
 * `sessionStorage`, non `localStorage`: deve sopravvivere a un cambio di
 * schermata dentro la stessa finestra, non a settimane di distanza. Chiuso il
 * programma, dimenticato — ed e' quello che vogliamo: un'operazione lunga
 * appartiene a quella sessione di lavoro, non a "sempre".
 *
 * Ogni lettura e scrittura e' protetta: `sessionStorage` puo' non esserci
 * (rendering lato server, finestra privata, spazio pieno), e non deve mai
 * essere lui a far cadere la schermata.
 */
export function leggiRiaggancio<T>(chiave: string): T | null {
  try {
    const grezzo = sessionStorage.getItem(chiave);
    return grezzo ? (JSON.parse(grezzo) as T) : null;
  } catch {
    return null;
  }
}

export function scriviRiaggancio<T>(chiave: string, valore: T): void {
  try {
    sessionStorage.setItem(chiave, JSON.stringify(valore));
  } catch {
    // Non e' un requisito: se non si scrive, si perde solo il riaggancio.
  }
}

export function cancellaRiaggancio(chiave: string): void {
  try {
    sessionStorage.removeItem(chiave);
  } catch {
    // Idem.
  }
}
