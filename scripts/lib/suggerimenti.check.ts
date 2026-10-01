/**
 * suggerimenti.check.ts
 * ---------------------
 * Il controllo dal lato degli script sui suggerimenti. Tre cose, tutte sugli stessi
 * esempi condivisi (`test-fixtures/assistente/`) che leggono anche i test della
 * finestra: una sola sorgente.
 *
 *  1. Il compito costruito da una registrazione e da un catalogo rispetta lo schema
 *     condiviso, e un catalogo cambiato cambia l'impronta.
 *  2. L'insieme avversario (voci inventate, campi sconosciuti, risposte vecchie, testo
 *     che imita istruzioni) e' rifiutato al 100% dal validatore, a prescindere dal
 *     modello: e' un caso di verifica, non una misura.
 *  3. Il calcolo della misura, su un insieme d'oro finto di cui i numeri sono stati
 *     fatti a mano.
 *
 * Uso:  npm run check:suggerimenti
 */

import * as fs from "fs";
import * as path from "path";
import { costruisciCompito } from "./assistente-compito";
import { indexDictionaries, resolveRecording } from "./generate-core";
import type { CatalogStep, Recording, ScoutResult } from "./generation-contract";
import { validaCompito, validaPropostaOggetto } from "../../web-ui/src/lib/suggerimenti-contratto";
import { validaInsiemeOro, braccioRegole, misura } from "../../web-ui/src/lib/suggerimenti-misura";

const ROOT = path.join(__dirname, "..", "..");
const ASSISTENTE = path.join(ROOT, "test-fixtures", "assistente");
const GENERATE = path.join(ROOT, "test-fixtures", "generate");

let failures = 0;
const ok = (w: string): void => console.log(`OK   ${w}`);
const fail = (w: string, d: string): void => {
  failures++;
  console.log(`FAIL ${w}\n       ${d}`);
};
const eq = (w: string, a: unknown, b: unknown): void =>
  JSON.stringify(a) === JSON.stringify(b) ? ok(w) : fail(w, `ottenuto ${JSON.stringify(a)}, atteso ${JSON.stringify(b)}`);
const json = <T>(f: string): T => JSON.parse(fs.readFileSync(f, "utf-8")) as T;

// ---------------------------------------------------------------------------
// 1. Il compito
// ---------------------------------------------------------------------------

console.log("\n--- il compito ---\n");
{
  const rec = json<Recording>(path.join(GENERATE, "recording.json"));
  const catalogo = json<{ steps: CatalogStep[] }>(path.join(GENERATE, "catalog.json")).steps;
  const dizionari = ["accesso.json", "ordini.json"].map((f) => json<ScoutResult>(path.join(GENERATE, "scout", f)));
  const risolvi = (cat: CatalogStep[]) =>
    resolveRecording(rec, indexDictionaries(dizionari), { catalog: cat }).intents;
  const costruisci = (cat: CatalogStep[]) =>
    costruisciCompito({ intents: risolvi(cat), catalog: cat, generatedAt: "2026-10-01T10:30:00.000Z" });

  const a = costruisci(catalogo);
  eq("lo stesso ingresso da' lo stesso compito, byte per byte", JSON.stringify(costruisci(catalogo)), JSON.stringify(a));
  const v = validaCompito(a);
  if (v.ok) ok("il compito rispetta lo schema condiviso");
  else fail("il compito rispetta lo schema condiviso", v.motivo);

  const piu: CatalogStep[] = [...catalogo, { expression: "the customer returns an order", keyword: "When" }];
  if (costruisci(piu).catalogo.impronta !== a.catalogo.impronta) ok("un catalogo cambiato cambia l'impronta");
  else fail("un catalogo cambiato cambia l'impronta", "l'impronta e' rimasta uguale");

  const testo = JSON.stringify(a);
  const trapelati = ["mario@esempio.invalid", "esempio.invalid", "/ordini/4821", "il pulsante resta attivo", "I tuoi ordini", "Annulla ordine"].filter((x) =>
    testo.includes(x)
  );
  if (trapelati.length === 0) ok("nel compito non entra nessun valore, indirizzo, nota o nome di componente");
  else fail("nel compito non entra nessun valore, indirizzo, nota o nome di componente", trapelati.join(" | "));
}

// ---------------------------------------------------------------------------
// 2. L'insieme avversario
// ---------------------------------------------------------------------------

console.log("\n--- l'insieme avversario ---\n");
{
  const c = validaCompito(json(path.join(ASSISTENTE, "compito.json")));
  if (!c.ok) {
    fail("il compito di esempio e' valido", c.motivo);
  } else {
    const av = json<{
      base: Record<string, unknown>;
      casi: Array<{ nome: string; atteso: string; extra?: Record<string, unknown>; override?: Record<string, unknown>; proposte: unknown }>;
    }>(path.join(ASSISTENTE, "avversarie.json"));
    let respinti = 0;
    for (const caso of av.casi) {
      const e = validaPropostaOggetto({ ...av.base, ...(caso.extra ?? {}), proposte: caso.proposte, ...(caso.override ?? {}) }, c.compito);
      const come = e.tipo === "valida" ? (e.righe.length === 0 && e.scartate.length > 0 ? "righe-scartate" : "accettata") : e.tipo;
      if (come === caso.atteso) respinti++;
      else fail(`avversario: ${caso.nome}`, `esito ${come}, atteso ${caso.atteso}`);
    }
    if (respinti === av.casi.length) ok(`tutti i ${av.casi.length} casi avversari sono respinti come previsto`);
  }
}

// ---------------------------------------------------------------------------
// 3. La misura
// ---------------------------------------------------------------------------

console.log("\n--- la misura (insieme d'oro finto, numeri fatti a mano) ---\n");
{
  const v = validaInsiemeOro(json(path.join(ASSISTENTE, "insieme-d-oro.esempio.json")));
  if (!v.ok) {
    fail("l'insieme d'oro di esempio e' valido", v.motivo);
  } else {
    const m = misura(v.insieme, braccioRegole(v.insieme));
    eq("precisione 4/9", [m.giuste, m.proposte], [4, 9]);
    eq("copertura 4/7", [m.giuste, m.conVoceGiusta], [4, 7]);
    eq("astensione 2/5", [m.astenuti, m.senzaVoceGiusta], [2, 5]);
    eq("richiamo della rosa 6/7", m.richiamoRosa === null ? null : Math.round(m.richiamoRosa * 7), 6);
  }
}

if (failures > 0) {
  console.log(`\n${failures} controlli falliti.\n`);
  process.exit(1);
}
console.log("\nTutti i controlli OK.\n");
