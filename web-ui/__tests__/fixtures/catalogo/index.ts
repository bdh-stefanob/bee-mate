/**
 * index.ts — catalogo delle situazioni finte
 * -------------------------------------------
 * Un solo posto da cui importare le situazioni usate per calibrare le regole
 * che leggono `step-catalog.json` (doppione, equivoco, fusione, pagine
 * ambigue...). Vedi il commento in cima a ciascun file per cosa rappresenta
 * la situazione — il nome del file dice il "cosa", non il "come".
 *
 * Attenzione (vedi `.superpowers/sdd/2026-09-22-cruscotto-tester/task-fixture-catalogo-report.md`):
 * questi dati sono buoni per calibrare le REGOLE, non sostituiscono una prova
 * sul campo. Nessuna registrazione ne' esecuzione finta: solo la forma dei
 * dati che le regole leggono.
 *
 * La forma di ogni voce e' verificata contro `step-catalog.json` vero da
 * `__tests__/lib/catalogo-fixtures.contratto.test.ts`.
 */
export { catalogoVuoto } from './catalogo-vuoto';
export { stepSenzaComponenti } from './step-non-ancorati';
export { doppione } from './doppione';
export { equivocoDiDenominazione } from './equivoco-di-denominazione';
export { paginaCompatibile } from './pagina-compatibile';
export { pagineDiverseNote } from './pagine-diverse-e-note';
export { paginaAmbigua } from './pagina-ambigua';
export { stepSottoinsieme } from './step-sottoinsieme';
export { treStepStessoComponente } from './fusione-ripetuta';
