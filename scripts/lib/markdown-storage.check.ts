/**
 * markdown-storage.check.ts
 * -------------------------
 * Controlli sulla conversione verso il formato Confluence.
 *
 * Perche' esistono: la pagina pubblicata e' il volto pubblico dell'iniziativa.
 * Una tabella che non si rende o un blocco di codice che esplode non fanno
 * fallire niente — rendono semplicemente illeggibile la cosa che si voleva far
 * leggere, ed e' il modo piu' stupido di perdere credibilita'.
 *
 * Il caso peggiore e' il ciclo: leggiamo Confluence, scriviamo Confluence. Se
 * la scrittura producesse markup che poi rileggiamo come contenuto, l'entropia
 * la creeremmo noi.
 *
 * Uso:  npm run check:storage
 */

import { markdownToStorage } from "./markdown-storage";
import { storageToText } from "./atlassian";

interface Case {
  name: string;
  md: string;
  contains?: string[];
  excludes?: string[];
}

const CASES: Case[] = [
  {
    name: "titoli",
    md: "# Titolo\n\n## Sotto",
    contains: ["<h1>Titolo</h1>", "<h2>Sotto</h2>"],
    excludes: ["#"],
  },
  {
    name: "tabella con intestazione",
    md: "| Area | Occorrenze |\n|---|---|\n| qa | 569 |\n| mobile | 279 |",
    contains: ["<th>Area</th>", "<td>qa</td>", "<td>569</td>"],
    excludes: ["|---|"],
  },
  {
    name: "blocco di codice: il contenuto non viene toccato",
    md: "```gherkin\nGiven the user logs in as {string}\nWhen **not bold**\n```",
    contains: [
      'ac:name="code"',
      "Given the user logs in as {string}",
      "When **not bold**",
    ],
  },
  {
    name: "codice inline: i marcatori dentro non vengono interpretati",
    md: "usa `the user **logs** in` come forma canonica",
    contains: ["<code>the user **logs** in</code>"],
    excludes: ["<strong>logs</strong>"],
  },
  {
    name: "grassetto e corsivo",
    md: "**forte** e *lieve*",
    contains: ["<strong>forte</strong>", "<em>lieve</em>"],
  },
  {
    name: "elenchi",
    md: "- primo\n- secondo\n\n1. uno\n2. due",
    contains: ["<ul><li>primo</li><li>secondo</li></ul>", "<ol><li>uno</li>"],
  },
  {
    name: "citazione: diventa un pannello, non testo indistinguibile",
    md: "> Attenzione: contiene dati reali.",
    contains: ['ac:name="info"', "contiene dati reali"],
    excludes: ["&gt; Attenzione"],
  },
  {
    name: "details: diventa una macro espandibile, non un tag ignoto",
    md: "<details><summary>le altre formulazioni</summary>\n\n- `uno`\n- `due`\n\n</details>",
    contains: ['ac:name="expand"', 'ac:parameter ac:name="title"', "<code>uno</code>"],
    excludes: ["<details>", "<summary>"],
  },
  {
    name: "caratteri XML nel testo vengono protetti",
    md: "Given the price is < 10 & the flag is \"on\"",
    contains: ["&lt; 10 &amp; the flag"],
  },
  {
    name: "link",
    md: "vedi [il catalogo](https://example.com/x)",
    contains: ['<a href="https://example.com/x">il catalogo</a>'],
  },
];

let failures = 0;

for (const c of CASES) {
  const html = markdownToStorage(c.md);
  const problems: string[] = [];

  for (const needle of c.contains ?? []) {
    if (!html.includes(needle)) problems.push(`manca: ${JSON.stringify(needle)}`);
  }
  for (const needle of c.excludes ?? []) {
    if (html.includes(needle)) problems.push(`non doveva esserci: ${JSON.stringify(needle)}`);
  }

  if (problems.length === 0) {
    console.log(`OK   ${c.name}`);
  } else {
    failures++;
    console.log(`FAIL ${c.name}`);
    for (const p of problems) console.log(`       ${p}`);
    console.log(`       prodotto: ${html.slice(0, 300)}`);
  }
}

// ---------------------------------------------------------------------------
// Andata e ritorno
// ---------------------------------------------------------------------------
//
// Il ciclo legge Confluence e ci scrive. Se una pagina che pubblichiamo, riletta
// dal nostro stesso estrattore, restituisse markup invece di testo, l'entropia
// la produrremmo noi — misurando come "passi" delle stringhe che sono tag.

{
  const md = "## Login\n\n| Step | Esito |\n|---|---|\n| Given the user logs in | ok |\n";
  const text = storageToText(markdownToStorage(md));
  const clean = !/<[a-z/]/i.test(text) && !text.includes("ac:");
  if (!clean) failures++;
  console.log(
    `${clean ? "OK  " : "FAIL"} andata e ritorno: cio' che pubblichiamo si rilegge come testo` +
      `  — ${JSON.stringify(text.slice(0, 80))}`
  );
}

console.log(failures === 0 ? "\nTUTTO OK" : `\n${failures} CONTROLLI FALLITI`);
process.exit(failures === 0 ? 0 : 1);
