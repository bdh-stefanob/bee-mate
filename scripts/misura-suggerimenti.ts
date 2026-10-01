/**
 * misura-suggerimenti.ts
 * ----------------------
 * Misura quanto valgono i suggerimenti su un insieme d'oro: precisione, copertura,
 * astensione e richiamo della rosa del braccio "regole" (nessun modello). Il
 * referto e' di soli numeri: le frasi dei passi non escono.
 *
 * L'insieme d'oro lo etichettano le persone (vedi `lib/suggerimenti-misura.ts` per il
 * formato e `test-fixtures/assistente/insieme-d-oro.esempio.json` per un esempio
 * finto). Sotto la composizione minima il risultato e' aneddotico, e il referto lo
 * dice in testa.
 *
 * Uso:
 *   npm run misura:suggerimenti test-fixtures/assistente/insieme-d-oro.esempio.json
 *   npm run misura:suggerimenti reports/assistente/insieme-d-oro.json accettate=p01,p04
 *
 * `accettate=` e' l'elenco dei passi la cui proposta una persona ha accettato nella
 * prova d'uso: serve a contare i falsi accetti.
 */

import * as fs from "fs";
import {
  validaInsiemeOro, braccioRegole, misura, accordoFraGiudici, giudizioComposizione, formattaMisura,
} from "../web-ui/src/lib/suggerimenti-misura";

function main(): void {
  const args = process.argv.slice(2);
  const file = args.find((a) => a.endsWith(".json"));
  if (!file || !fs.existsSync(file)) {
    console.error("\nUso: npm run misura:suggerimenti <insieme-d-oro.json> [accettate=p01,p02]\n");
    process.exit(1);
  }
  const valido = validaInsiemeOro(JSON.parse(fs.readFileSync(file, "utf-8")));
  if (!valido.ok) {
    console.error(`\nInsieme d'oro non valido (${valido.motivo}).\n`);
    process.exit(1);
  }
  const { insieme } = valido;

  const accettate = new Set(
    (args.find((a) => a.startsWith("accettate="))?.slice("accettate=".length) ?? "").split(",").filter(Boolean)
  );
  const m = misura(insieme, braccioRegole(insieme), { accettate });
  const composizione = giudizioComposizione(insieme);
  const accordo = accordoFraGiudici(insieme);

  console.log(`\nMISURA — braccio R (regole del catalogo)\n`);
  if (!composizione.sufficiente) {
    console.log(`  ANEDDOTICO: ${composizione.motivi.join("; ")}\n`);
  }
  console.log(formattaMisura(m).split("\n").map((r) => `  ${r}`).join("\n"));
  console.log(
    `  accordo fra i giudici   ${accordo.accordo === null ? "n/d" : `${accordo.accordo.toFixed(3)} (${accordo.concordi}/${accordo.confrontati})`}\n`
  );
}

main();
