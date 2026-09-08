/**
 * lib/generate-brief.ts
 * ---------------------
 * Il **compito** per l'assistente: cosa deve fare, su cosa, scegliendo fra cosa.
 *
 * PERCHE' UN FILE E NON UN PROMPT SCRITTO A MANO OGNI VOLTA
 * Perche' un prompt scritto a mano non e' riproducibile, non e' confrontabile e
 * non e' rivedibile da nessuno. Questo e' un artefatto: sta su disco, si legge,
 * si versiona se serve, e soprattutto **e' l'unita' di misura del confronto**.
 * Cambiare le regole e rimisurare significa rigenerarlo, non ricordarsi cosa si
 * era scritto la volta prima.
 *
 * LA FORMA DEL COMPITO E' LA DECISIONE PIU' IMPORTANTE
 * Non "scrivimi un test": la struttura esiste gia' ed e' verificata. Il compito
 * e' *scegliere*, fra opzioni elencate, e le opzioni sono poche di proposito.
 * Un modello che sceglie fra cinque candidati sbaglia in modi che un compilatore
 * o un validatore prendono; un modello che compone da zero sbaglia in modi che
 * si scoprono in produzione.
 *
 * `writeNaiveBrief` produce il termine di paragone: lo stesso ingresso senza
 * nessun vincolo. Senza il paragone, "l'AI funziona bene" e' un'impressione.
 */

import * as fs from "fs";
import * as path from "path";
import { VERIFY_STEP, phraseOf, type EmitContext } from "./generate-emit";
import type { Component, GeneratedFile, Gap, Recording } from "./generation-contract";

function bullet(items: readonly string[]): string {
  return items.length ? items.map((i) => `- ${i}`).join("\n") : "_(nessuno)_";
}

/**
 * Il compito vincolato.
 *
 * Ogni sezione risponde a una domanda che, senza risposta, il modello
 * riempirebbe inventando: cosa esiste gia', cosa posso chiamare, fra cosa
 * scelgo, come si verifica quello che ho fatto.
 */
export function writeBrief(
  file: string,
  ctx: EmitContext,
  methodsByPage: Map<string, Map<Component, string>>,
  gaps: readonly Gap[],
  files: readonly GeneratedFile[]
): void {
  const byKey = new Map(ctx.pages.map((p) => [p.key, p]));
  const out: string[] = [];

  out.push(`# Compito: portare uno scenario generato nel vocabolario del catalogo`);
  out.push("");
  out.push(
    `Una tester ha eseguito a mano una sessione (${ctx.durationSeconds}s, ` +
      `${ctx.intents.length} intenti dichiarati da lei). Da quella sessione sono gia' stati ` +
      `generati **feature, Page Object e step definition, in modo deterministico**. ` +
      `Il test gira. Nessun modello ha scritto niente di quel codice.`
  );
  out.push("");
  out.push(`## Cosa NON devi fare`);
  out.push("");
  out.push(
    bullet([
      "Non riscrivere le Page Object. Esistono, sono generate dal dizionario dei componenti, e alla prossima rigenerazione le tue modifiche sparirebbero.",
      "Non inventare metodi. Sotto c'e' l'elenco esatto di quelli disponibili: chiamarne uno che non c'e' fa fallire `tsc`.",
      "Non scrivere selettori. Un selettore in una step definition e' un errore di layer, sempre.",
      "Non proporre una struttura diversa. Se una convenzione non va, si cambia il modello in `templates/`, non il file generato.",
    ])
  );
  out.push("");
  out.push(`## Cosa devi fare`);
  out.push("");
  out.push(
    `Due cose, e solo due:\n\n` +
      `1. **La frase Gherkin** di ogni passo. Adesso e' l'etichetta che ha scritto la tester: ` +
      `vera, ma non nel vocabolario condiviso.\n` +
      `2. **Quali metodi chiamare**, dove la sequenza generata non rende l'intento.`
  );
  out.push("");
  out.push(
    `Per ogni passo, in quest'ordine:\n\n` +
      `1. Un candidato esprime gia' l'intento → usalo **con la stessa identica formulazione**. ` +
      `Non "quasi": identica. Una quasi-duplicazione e' peggio di uno step mancante.\n` +
      `2. Ci va vicino ma cambia un valore → parametrizzalo (\`{string}\`, \`{int}\`) ` +
      `**modificando lo step esistente**, non aggiungendone uno accanto.\n` +
      `3. Nessuno regge → proponi **una** formulazione nuova, taggata \`@wanted\`, e dillo. ` +
      `Non scegliere il meno peggio per far quadrare il conto.`
  );
  out.push("");

  // ── I passi ─────────────────────────────────────────────────────────────
  out.push(`## I passi, uno per uno`);
  out.push("");

  ctx.intents.forEach((intent, i) => {
    const page = byKey.get(intent.page ?? "");
    out.push(`### ${i + 1}. ${phraseOf(intent)}`);
    out.push("");
    out.push(`- Pagina: \`${page?.className ?? "?"}\` (\`${page?.path ?? "?"}\`)`);
    if (intent.navigatesTo) {
      const next = byKey.get(intent.navigatesTo);
      out.push(`- **Cambia pagina**: finisce su \`${next?.className ?? intent.navigatesTo}\``);
    }
    out.push("");

    out.push(`**Cosa ha fatto la tester**`);
    out.push("");
    out.push(
      bullet(
        intent.steps.map((r) => {
          const method = methodsByPage.get(r.fromPage ?? intent.page ?? "")?.get(r.component);
          const value = r.step.secret
            ? " (password: mai registrata)"
            : r.step.value
            ? ` con "${r.step.value}"`
            : "";
          const warn = r.synthesised ? " ⚠ non nel dizionario" : "";
          return `\`${method ?? "?"}\` — ${r.step.action} su ${r.step.role} "${r.step.name}"${value}${warn}`;
        })
      )
    );
    out.push("");

    if (intent.assertions.length) {
      out.push(`**Cosa ha verificato**`);
      out.push("");
      out.push(bullet(intent.assertions.map((a) => `${a.role} "${a.name}"`)));
      out.push("");
    }
    if (intent.notes.length) {
      out.push(`**Note lasciate mentre registrava**`);
      out.push("");
      out.push(bullet(intent.notes));
      out.push("");
    }

    out.push(`**Candidati dal catalogo**`);
    out.push("");
    if (intent.candidates.length === 0) {
      out.push(
        `_Nessuno._ Serve una formulazione nuova, da taggare \`@wanted\`. ` +
          `Non ripiegare su uno step lontano.`
      );
    } else {
      out.push(
        intent.candidates
          .map((c) => `- \`${c.keyword ?? "When"} ${c.expression}\`${c.page ? ` — pagina ${c.page}` : ""}`)
          .join("\n")
      );
    }
    out.push("");
  });

  // ── I metodi disponibili ────────────────────────────────────────────────
  out.push(`## I metodi che puoi chiamare`);
  out.push("");
  out.push(
    `Questo e' l'elenco completo. Non ce ne sono altri, e chiamarne uno che non c'e' ` +
      `fa fallire la compilazione.`
  );
  out.push("");
  for (const [key, methods] of methodsByPage) {
    const page = byKey.get(key);
    out.push(`### \`${page?.className ?? key}\``);
    out.push("");
    out.push(
      bullet(
        [...methods.entries()].map(([component, name]) => {
          const arg = component.kind === "input" ? "(value: string)" : "()";
          const warn = component.stability === "stable" ? "" : ` ⚠ ${component.stability}`;
          return `\`${name}${arg}\` — ${component.role} "${component.name}"${warn}`;
        })
      )
    );
    out.push("");
    out.push(`Piu' \`navigate()\` e \`assertLoaded()\`, che vengono da \`BasePage\`.`);
    out.push("");
  }

  // ── La verifica ─────────────────────────────────────────────────────────
  out.push(`## Il passo di verifica`);
  out.push("");
  out.push(
    `Tutte le verifiche di presenza usano un solo step parametrizzato:\n\n` +
      `    Then ${VERIFY_STEP}\n\n` +
      `E' uno solo di proposito: uno per elemento sarebbe uno step nuovo a ogni ` +
      `registrazione, cioe' esattamente l'entropia da togliere. Specializzalo solo dove ` +
      `l'intento lo merita davvero — e in quel caso dillo.`
  );
  out.push("");

  // ── I file ──────────────────────────────────────────────────────────────
  out.push(`## I file su cui lavorare`);
  out.push("");
  out.push(
    bullet(
      files.map(
        (f) => `\`${f.path}\`${f.path.includes("/pages/") ? " — **non toccare**, si rigenera" : ""}`
      )
    )
  );
  out.push("");

  // ── I buchi ─────────────────────────────────────────────────────────────
  out.push(`## Cosa il generatore non ha saputo fare da solo`);
  out.push("");
  if (gaps.length === 0) {
    out.push(`_Niente._`);
  } else {
    out.push(
      `Non sono errori da correggere in silenzio: sono cose da **riportare**. ` +
        `Riempirle indovinando produce un file che sembra completo e non lo e'.`
    );
    out.push("");
    for (const g of gaps) out.push(`- **${g.kind}** — ${g.where}: ${g.detail}`);
  }
  out.push("");

  // ── I giudici ───────────────────────────────────────────────────────────
  out.push(`## Come si verifica il tuo lavoro`);
  out.push("");
  out.push(
    `Nessuno di questi e' un parere. Se falliscono, il lavoro non e' finito — non e' ` +
      `"da sistemare poi".`
  );
  out.push("");
  out.push(
    "```bash\n" +
      "npx tsc --noEmit -p tsconfig.json   # hai inventato un metodo?\n" +
      "npm run test:dry                    # ogni frase Gherkin ha la sua glue?\n" +
      "npm run validate:steps              # la frase e' nel catalogo, o e' una variante?\n" +
      "```"
  );
  out.push("");

  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, out.join("\n"), "utf-8");
}

/**
 * Il termine di paragone: lo stesso ingresso, nessun vincolo.
 *
 * Serve a rispondere alla domanda che verra' fatta in sala — "ma tutto questo
 * impianto serve, o basta chiedere all'AI?" — con un numero invece che con
 * un'opinione. Ed e' scritto per essere un confronto **onesto**: la
 * registrazione e' la stessa, completa, e la richiesta e' quella che chiunque
 * farebbe. Non e' un fantoccio costruito per perdere.
 */
export function writeNaiveBrief(file: string, recording: Recording, recordingPath: string): void {
  const out: string[] = [];

  out.push(`# Compito (senza vincoli) — termine di paragone`);
  out.push("");
  out.push(
    `Questo e' il compito **non guidato**: la stessa registrazione, nessun catalogo, ` +
      `nessun dizionario dei componenti, nessuno scheletro, nessuna regola. ` +
      `Serve a misurare quanto valgono le regole, non a farle vincere: la richiesta qui ` +
      `sotto e' quella che chiunque scriverebbe.`
  );
  out.push("");
  out.push(`## La richiesta`);
  out.push("");
  out.push(
    `Ho registrato questa sessione di test manuale. Scrivimi il test automatico ` +
      `corrispondente con Playwright e Cucumber.js in TypeScript: lo scenario Gherkin, ` +
      `le Page Object e le step definition.`
  );
  out.push("");
  out.push(`## La registrazione`);
  out.push("");
  out.push("```json");
  out.push(JSON.stringify(recording, null, 2));
  out.push("```");
  out.push("");
  out.push(`_Origine: ${recordingPath}_`);
  out.push("");
  out.push(`## Come si confrontano i due risultati`);
  out.push("");
  out.push(
    bullet([
      "**Compila?** `npx tsc --noEmit` — metodi e tipi inventati si vedono qui.",
      "**Gira?** `npm run test:dry` — ogni frase Gherkin ha la sua step definition?",
      "**Quanti step nuovi ha introdotto?** Meno e' meglio: e' la misura dell'entropia aggiunta.",
      "**Le frasi sono dichiarative?** `conformity()` in `lib/gold.ts` da' un punteggio, non un parere.",
      "**I locator esistono davvero sulla pagina?** Confronta con il dizionario dello scout.",
    ])
  );
  out.push("");

  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, out.join("\n"), "utf-8");
}
