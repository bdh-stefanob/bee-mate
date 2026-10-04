/**
 * copione-difese.check.ts
 * ------------------------
 * Le cinque difese del collaudo da copione, una per una — ognuna vista
 * fallire nella direzione scomoda prima di fidarsi che regga. Vedi
 * lib/copione-difese.ts e la sezione 5(a) della spec.
 *
 * Uso:  npx ts-node scripts/lib/copione-difese.check.ts
 */
import type { Target } from "./targets";
import {
  verificaAmbienteDiCollaudo, richiedeConfermaUmana, verificaFuoriDaSrc, verificaSalvabile,
  improntaAmbiente, AmbienteNonAmmesso,
} from "./copione-difese";

let failures = 0;
const ok = (w: string): void => console.log(`OK   ${w}`);
const fail = (w: string, d: string): void => {
  failures++;
  console.log(`FAIL ${w}\n       ${d}`);
};

const target = (parziale: Partial<Target>): Target => ({
  name: "ambiente-di-prova",
  url: "https://esempio.invalid",
  session: "reports/sessions/non-usata-dal-check.json",
  ...parziale,
});

function lancia(f: () => void): Error | null {
  try {
    f();
    return null;
  } catch (err) {
    return err as Error;
  }
}

console.log("\n--- difesa 1 (provenienza): vive nel tipo Recording, verificata in copione.check.ts e app-finta.check.ts ---\n");
console.log("  (qui si verificano solo le difese espresse come funzioni pure: 2, 3, 4, 5)");

console.log("\n--- difesa 2: solo ambienti di collaudo, mai presunti ---\n");

{
  const errore = lancia(() => verificaAmbienteDiCollaudo(target({})));
  if (errore instanceof AmbienteNonAmmesso) ok("un ambiente senza nessun segno e' rifiutato (il silenzio non e' un si')");
  else fail("un ambiente senza nessun segno e' rifiutato", String(errore));
}
{
  const errore = lancia(() => verificaAmbienteDiCollaudo(target({ collaudo: true, produzione: true })));
  if (errore instanceof AmbienteNonAmmesso && /PRODUZIONE/.test(errore.message)) {
    ok("collaudo:true E produzione:true insieme: il rifiuto e' immediato (non si allenta mai)");
  } else fail("collaudo:true E produzione:true insieme: il rifiuto e' immediato", String(errore));
}
{
  const errore = lancia(() => verificaAmbienteDiCollaudo(target({ produzione: true })));
  if (errore instanceof AmbienteNonAmmesso) ok("un ambiente di sola produzione e' rifiutato");
  else fail("un ambiente di sola produzione e' rifiutato", String(errore));
}
{
  const errore = lancia(() => verificaAmbienteDiCollaudo(target({ collaudo: true })));
  if (errore === null) ok("un ambiente collaudo:true (senza produzione) e' ammesso");
  else fail("un ambiente collaudo:true (senza produzione) e' ammesso", errore.message);
}
{
  // Il nome o l'indirizzo non devono mai bastare: un ambiente che "suona" di
  // collaudo ma non lo dichiara resta rifiutato.
  const errore = lancia(() =>
    verificaAmbienteDiCollaudo(target({ name: "collaudo-aziendale", url: "https://collaudo.esempio.invalid" }))
  );
  if (errore instanceof AmbienteNonAmmesso) {
    ok('un nome/indirizzo che "suona" di collaudo non basta: serve il segno esplicito');
  } else fail('un nome/indirizzo che "suona" di collaudo non basta', String(errore));
}

console.log("\n--- difesa 5: conferma umana prima di un ambiente non pubblico ---\n");

{
  const r = richiedeConfermaUmana(target({ collaudo: true }));
  if (r === true) ok("un ambiente non marcato pubblico richiede conferma umana");
  else fail("un ambiente non marcato pubblico richiede conferma umana", String(r));
}
{
  const r = richiedeConfermaUmana(target({ collaudo: true, pubblico: true }));
  if (r === false) ok("l'ambiente pubblico (demo) non richiede conferma");
  else fail("l'ambiente pubblico (demo) non richiede conferma", String(r));
}

console.log("\n--- difesa 4: l'uscita di un copione sta fuori da src/ ---\n");

{
  const errore = lancia(() => verificaFuoriDaSrc("copione", "src"));
  if (errore instanceof AmbienteNonAmmesso) ok('copione + out="src" e\' rifiutato');
  else fail('copione + out="src" e\' rifiutato', String(errore));
}
{
  const errore = lancia(() => verificaFuoriDaSrc("copione", "src/sottocartella"));
  if (errore instanceof AmbienteNonAmmesso) ok("copione + un out dentro src/ e' rifiutato lo stesso");
  else fail("copione + un out dentro src/ e' rifiutato lo stesso", String(errore));
}
{
  const errore = lancia(() => verificaFuoriDaSrc("copione", "reports/collaudo/demo"));
  if (errore === null) ok("copione + out fuori da src/ e' ammesso");
  else fail("copione + out fuori da src/ e' ammesso", errore.message);
}
{
  const errore = lancia(() => verificaFuoriDaSrc("persona", "src"));
  if (errore === null) ok("una registrazione di persona puo' generare dentro src/ come sempre");
  else fail("una registrazione di persona puo' generare dentro src/ come sempre", errore.message);
}

console.log("\n--- difesa 3: il salvataggio rifiuta sempre un copione ---\n");

{
  const errore = lancia(() => verificaSalvabile("copione"));
  if (errore instanceof AmbienteNonAmmesso) ok("una registrazione da copione non si puo' salvare");
  else fail("una registrazione da copione non si puo' salvare", String(errore));
}
{
  const errore = lancia(() => verificaSalvabile("persona"));
  if (errore === null) ok("una registrazione di persona si puo' salvare come sempre");
  else fail("una registrazione di persona si puo' salvare come sempre", errore.message);
}
{
  const errore = lancia(() => verificaSalvabile(undefined));
  if (errore === null) ok("una registrazione senza origine (vecchio formato) si comporta come 'persona'");
  else fail("una registrazione senza origine si comporta come 'persona'", errore.message);
}

console.log("\n--- l'impronta dell'ambiente non porta mai l'indirizzo ---\n");

{
  const t = target({ collaudo: true, url: "https://non-deve-comparire.invalid" });
  const imp = improntaAmbiente(t);
  if (!imp.includes("non-deve-comparire") && /^[0-9a-f]{16}$/.test(imp)) {
    ok(`l'impronta e' una stringa corta che non contiene l'indirizzo (${imp})`);
  } else {
    fail("l'impronta non contiene l'indirizzo", imp);
  }
  const imp2 = improntaAmbiente({ ...t, url: "https://altro-indirizzo.invalid" });
  if (imp === imp2) ok("cambiare SOLO l'indirizzo non cambia l'impronta (la spec vieta di tracciarlo)");
  else fail("cambiare SOLO l'indirizzo non cambia l'impronta", `${imp} vs ${imp2}`);
  const imp3 = improntaAmbiente({ ...t, collaudo: false });
  if (imp !== imp3) ok("cambiare la dichiarazione (collaudo) CAMBIA l'impronta");
  else fail("cambiare la dichiarazione (collaudo) CAMBIA l'impronta", imp3);
}

console.log(failures === 0 ? "\nTutti i controlli OK.\n" : `\n${failures} controlli FALLITI\n`);
process.exit(failures === 0 ? 0 : 1);
