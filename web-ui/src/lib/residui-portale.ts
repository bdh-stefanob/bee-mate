/**
 * Residui del vecchio portale nel profilo della finestra.
 *
 * Il portale salvava nel `localStorage` il token GitHub (dentro
 * `bdd-scaffold-settings`) e le bozze dell'editor. Un segreto che resta su disco
 * dopo la funzione che lo usava e' un guasto in attesa: il cruscotto, al primo
 * avvio dopo l'aggiornamento, li toglie. Va tenuto per due versioni, poi si
 * toglie anche questo modulo.
 *
 * Logica pura: l'archivio arriva dal chiamante (la pagina passa `window.localStorage`,
 * i test un finto), cosi' si prova in ambiente node.
 */

export const CHIAVI_RESIDUI_PORTALE = [
  'bdd-scaffold-settings',
  'gsd-editor-tabs',
  'gsd-editor-active-tab',
  'gsd-editor-incoming',
  'gsd-editor-draft',
  'gsd-editor-sidebar',
] as const;

export interface ArchivioPulizia {
  getItem(chiave: string): string | null;
  removeItem(chiave: string): void;
}

/**
 * Toglie le chiavi del portale. Archivio assente o bloccato non e' un errore:
 * la pulizia e' una comodita' di sicurezza, non deve mai rompere l'apertura.
 * Ritorna quante chiavi ha tolto.
 */
export function ripulisciResiduiPortale(archivio: ArchivioPulizia | null): number {
  if (!archivio) return 0;
  let tolte = 0;
  for (const chiave of CHIAVI_RESIDUI_PORTALE) {
    try {
      if (archivio.getItem(chiave) !== null) {
        archivio.removeItem(chiave);
        tolte += 1;
      }
    } catch {
      // Quella chiave resta: si prosegue con le altre.
    }
  }
  return tolte;
}
