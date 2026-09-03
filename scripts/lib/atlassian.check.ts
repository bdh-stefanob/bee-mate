/**
 * atlassian.check.ts
 * ------------------
 * Controlli sull'estrazione del testo e sul riconoscimento Gherkin.
 *
 * Perche' esistono: `storageToText` e `scoreGherkin` sono il fondamento di TUTTE
 * le metriche di entropia. Una regressione silenziosa qui non fa fallire niente —
 * produce semplicemente numeri sbagliati, che e' molto peggio. E vengono eseguiti
 * su contenuto che non possiamo vedere in anticipo, quindi i casi qui sotto
 * coprono le forme in cui il Gherkin puo' realisticamente essere scritto dentro
 * una pagina wiki: macro di codice, paragrafi, tabelle, liste, con markup e
 * entita' HTML in mezzo.
 *
 * Uso:  npm run check:extract
 */

import { storageToText, scoreGherkin, looksLikeTestCase } from "./atlassian";

interface Case {
  name: string;
  html: string;
  /** Ci si aspetta che la pagina venga riconosciuta come caso di test? */
  candidate: boolean;
  /** Sottostringhe che DEVONO comparire nel testo estratto. */
  contains?: string[];
  /** Sottostringhe che NON devono comparire (markup o entita' non decodificate). */
  excludes?: string[];
}

const CASES: Case[] = [
  {
    name: "macro di codice (CDATA) — la forma piu' comune per il Gherkin",
    html:
      `<p>Test di login</p><ac:structured-macro ac:name="code">` +
      `<ac:parameter ac:name="language">gherkin</ac:parameter>` +
      `<ac:plain-text-body><![CDATA[Scenario: Login riuscito\n` +
      `Given the user is on the login page\n` +
      `When the user submits valid credentials\n` +
      `Then the dashboard is displayed]]></ac:plain-text-body></ac:structured-macro>`,
    candidate: true,
    contains: ["Scenario: Login riuscito", "Given the user is on the login page"],
    // Il nome del linguaggio e' un parametro di macro, non contenuto.
    excludes: ["ac:", "gherkin"],
  },
  {
    name: "paragrafi con <br/> e grassetto",
    html:
      `<p><strong>Scenario:</strong> Checkout<br/><strong>Given</strong> the cart contains 2 items<br/>` +
      `When the user confirms the order<br/>Then an order confirmation is shown</p>`,
    candidate: true,
    contains: ["Given the cart contains 2 items", "Then an order confirmation is shown"],
    excludes: ["<strong>", "<br"],
  },
  {
    name: "tabella, un passo per riga",
    html:
      `<table><tbody><tr><th>Step</th><th>Atteso</th></tr>` +
      `<tr><td>Given I am logged in</td><td>home</td></tr>` +
      `<tr><td>When I open the profile page</td><td>profilo</td></tr>` +
      `<tr><td>Then my name is displayed</td><td>ok</td></tr></tbody></table>`,
    candidate: true,
    // Le celle vanno separate: senza separatore "Given I am logged in" e "home"
    // si incollerebbero e il passo non verrebbe piu' riconosciuto.
    contains: ["Given I am logged in | home"],
  },
  {
    name: "lista numerata con keyword italiane ed entita' accentate",
    html:
      `<ol><li>Dato che l'utente &egrave; autenticato</li>` +
      `<li>Quando apre la pagina ordini</li>` +
      `<li>Allora vede l'elenco degli ordini gi&agrave; evasi</li></ol>`,
    candidate: true,
    contains: ["Dato che l'utente è autenticato", "già evasi"],
    excludes: ["&egrave;", "&agrave;"],
  },
  {
    name: "entita' HTML nel testo di un passo",
    html:
      `<p>Given the price is &lt; 10 &amp;&nbsp;the user is &quot;premium&quot;</p>` +
      `<p>When the discount applies</p><p>Then the total is updated</p>`,
    candidate: true,
    contains: ['Given the price is < 10 & the user is "premium"'],
    excludes: ["&lt;", "&amp;", "&quot;", "&nbsp;"],
  },
  {
    name: "entita' numeriche decimali ed esadecimali",
    html: `<p>Given l&#39;utente &#xE8; registrato</p><p>When conferma</p><p>Then vede l'esito</p>`,
    candidate: true,
    contains: ["Given l'utente è registrato"],
    excludes: ["&#39;", "&#xE8;"],
  },
  {
    name: "pagina di prosa senza Gherkin — deve essere scartata",
    html: `<p>Questa pagina descrive il processo di rilascio.</p><p>Contatti: team QA.</p>`,
    candidate: false,
  },
  {
    name: "falso positivo: prosa che inizia per 'E' o 'Ma' non e' un passo",
    html: `<p>Ma</p><p>E</p><p>Then</p>`,
    candidate: false,
  },
];

let failures = 0;

for (const c of CASES) {
  const text = storageToText(c.html);
  const score = scoreGherkin(text);
  const problems: string[] = [];

  if (looksLikeTestCase(score) !== c.candidate) {
    problems.push(`candidato atteso ${c.candidate}, ottenuto ${looksLikeTestCase(score)}`);
  }
  for (const needle of c.contains ?? []) {
    if (!text.includes(needle)) problems.push(`manca: ${JSON.stringify(needle)}`);
  }
  for (const needle of c.excludes ?? []) {
    if (text.includes(needle)) problems.push(`residuo non ripulito: ${JSON.stringify(needle)}`);
  }

  if (problems.length === 0) {
    console.log(`OK   ${c.name}`);
  } else {
    failures++;
    console.log(`FAIL ${c.name}`);
    for (const p of problems) console.log(`       ${p}`);
    console.log(text.split("\n").map((l) => "       | " + l).join("\n"));
  }
}

console.log(
  failures === 0
    ? `\n${CASES.length}/${CASES.length} casi OK`
    : `\n${failures}/${CASES.length} casi FALLITI`
);
process.exit(failures === 0 ? 0 : 1);
