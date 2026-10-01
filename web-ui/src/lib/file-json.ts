/**
 * Lettura dei file che una persona puo' aver salvato a mano (catalogo, enums,
 * bersagli): tollera il BOM e, se il file non si legge, lo nomina. La funzione
 * vive in `scripts/lib/leggi-json.ts`: qui la si rende raggiungibile come
 * `@/lib/file-json`, una copia sola.
 */
export { leggiJson, leggiTesto, senzaBom, FileNonLeggibile } from '../../../scripts/lib/leggi-json';
