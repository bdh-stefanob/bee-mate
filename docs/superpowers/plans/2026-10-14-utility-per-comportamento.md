# Utility per comportamento — piano di implementazione

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** le parti difficili del flusso `clinic` (questionario, farmacia, pagamento, foto, esito) diventano utility condivise; il generatore le riconosce nei passi registrati e le chiama, lasciando la frase del tester com'e'.

**Architecture:** ogni utility e' una funzione in `src/actions/` che usa una Page Object scritta a mano in `src/pages/clinic/` (i selettori stanno solo li'). Un registro puro in `src/support/utility.ts` dice, per ogni utility, come si riconosce un passo registrato e quali valori ne diventano parametri. Il generatore interroga il registro: riconoscimento completo, il corpo dello step chiama la utility; parziale, la propone nel commento come fa oggi con i candidati.

**Tech Stack:** TypeScript, Playwright 1.60, Cucumber.js 10, controlli `ts-node` (`scripts/lib/*.check.ts`), Vitest per il cruscotto (`web-ui`).

**Spec:** `docs/superpowers/specs/2026-10-14-utility-per-comportamento-design.md` (approvata il 14/10). Base pratica: `scripts/esplora-flusso.ts`, che completa il flusso su QA due volte di fila: il codice delle utility viene da li'.

## Global Constraints

- Quattro livelli: `features/` → `steps/` → `actions/` → `pages/`. **Mai selettori in uno step o in una utility**: solo nelle Page Object.
- La frase del `.feature` resta quella scritta dal tester (decisione U3).
- Riconoscimento per componenti (ruolo + nome) o per pagina, mai per somiglianza di parole (U4). Completo: si usa. Parziale: si propone e basta.
- I valori registrati diventano parametri dello step (U5); le risposte del questionario sono una tabella Gherkin sotto lo step (Q1).
- Page Object delle utility per applicazione: `src/pages/clinic/` (Q2).
- Niente credenziali nel codice ne' nei commit: la password viene da `.env` (`CLINIC_PASS` per lo spike, il blocco `login` dell'ambiente per gli scenari).
- `reports/` resta fuori da git; il diario e le foto dell'esplorazione non si versionano.
- Commit in italiano, Conventional Commits, **nessuna riga `Co-Authored-By`**.
- Prima di chiudere ogni task: `npx tsc --noEmit` e il controllo del task; prima di chiudere il piano: `npm run check:all`, `npm run test:dry`, `cd web-ui && npx vitest run`.

## Review Focus

1. **Coincidenza parziale scambiata per completa** — un passo che tocca «Select Pharmacy» ma anche un pulsante estraneo non deve diventare la utility: la deve solo proporre. Test in Task 2.
2. **Domanda senza risposta in tabella e senza «No»** — il questionario deve fermarsi dicendo la domanda, non cliccare a caso. Test in Task 3 (sentinella) e messaggio d'errore esplicito nel codice.
3. **Utente senza carta salvata** — `paga()` senza carta e senza dati carta deve fallire dicendo «nessuna carta salvata», non aspettare 30 secondi. Codice in Task 5.
4. **Scenario con utility salvato dal cruscotto** — l'import di `actions/` deve seguire lo step nella sua nuova cartella, o lo scenario non compila. Test in Task 7.
5. **Generazione fuori da `src`** (`out=reports/...`) — l'import delle utility deve puntare a `src/actions`, non a `<out>/actions`. Test in Task 7.

---

### Task 1: Avvisi mancanti del POC e velo dichiarato dall'ambiente

**Files:**
- Modify: `src/support/avvisi.ts` (voci di `AVVISI`, `registraAvvisi`)
- Modify: `scripts/lib/targets.ts` (`Target`: campo `velo`)
- Modify: `src/support/world.ts` (passa `velo` a `registraAvvisi`)
- Test: `scripts/lib/accesso.check.ts`

**Interfaces:**
- Produces: `registraAvvisi(page: Page, avvisi?: readonly Avviso[], velo?: string): Promise<void>`; `Target.velo?: string`.

- [ ] **Step 1: Nuovo avviso «You have a new message» e «Start over» con `dispatchEvent`**

In `AVVISI`, dopo «visita incompleta»:

```ts
  {
    nome: "nuovo messaggio",
    // POC, BasePage.dismissNewMessageModalIfPresent: compare a meta' sessione
    // quando un clinico risponde; il suo velo blocca Next e Place Order.
    riconoscimento: { role: "heading", name: /you have a new message/i },
    chiudi: async (page) => {
      await page.locator("button.close").first().dispatchEvent("click");
    },
  },
```

Nella voce «riprendi l'ordine aperto», sostituire `await ricomincia.click({ timeout: 5000 });` con:

```ts
        // dispatchEvent come nel POC (ResumeOrderPage.clickStartOver): il velo del
        // dialog intercetta anche un clic forzato.
        await ricomincia.dispatchEvent("click");
```

- [ ] **Step 2: Il velo lo dichiara l'ambiente**

In `scripts/lib/targets.ts`, dentro `interface Target`, dopo `hint?`:

```ts
  /**
   * Selettore CSS del velo di caricamento dell'applicazione (es. ".loading-dialog").
   * Gli scenari lo aspettano prima di ogni azione: vedi `registraAvvisi`.
   */
  velo?: string;
```

e nel punto in cui `resolveTarget` costruisce il `Target` da `bdd-targets.json`, copiare `velo` se e' una stringa non vuota (stessa forma di `hint`).

In `src/support/avvisi.ts` cambiare la firma e la riga del selettore:

```ts
export async function registraAvvisi(
  page: Page,
  avvisi: readonly Avviso[] = AVVISI,
  veloDichiarato?: string
): Promise<void> {
  if (process.env["BDD_NO_AVVISI"] === "1") return;
  const velo = process.env["BDD_VELO"] || veloDichiarato;
```

In `src/support/world.ts` sostituire `await registraAvvisi(this.page);` con:

```ts
    await registraAvvisi(this.page, undefined, AMBIENTE.target?.velo);
```

(`AMBIENTE` e' gia' costruito da `resolveTarget` nello stesso file: se il campo del target ha un altro nome, usare quello.)

In `bdd-targets.json` (locale, gitignorato) aggiungere a `clinic` e `qa-brochure`: `"velo": ".loading-dialog"`. In `bdd-targets.example.json` aggiungere lo stesso campo, commentato in `_commento`.

- [ ] **Step 3: Controllo**

In `scripts/lib/accesso.check.ts`, nel blocco che costruisce la pagina finta con l'avviso «Resume order», aggiungere un caso: una pagina con un `<div class="loading-dialog">` visibile che sparisce dopo 1500 ms e un pulsante «Vai» sotto; con `registraAvvisi(page, undefined, ".loading-dialog")` il clic su «Vai» deve riuscire entro 5 s:

```ts
  await page.setContent(`
    <div class="loading-dialog" style="position:fixed;inset:0;background:#0003"></div>
    <button onclick="document.body.dataset.ok='1'">Vai</button>
    <script>setTimeout(() => document.querySelector('.loading-dialog').remove(), 1500)</script>`);
  await registraAvvisi(page, [], ".loading-dialog");
  await page.getByRole("button", { name: "Vai" }).click({ timeout: 5000 });
  eq("il velo si aspetta, poi il clic arriva", await page.evaluate(() => document.body.dataset.ok), "1");
```

Run: `npm run check:accesso` — Expected: `Tutti i controlli OK.`

- [ ] **Step 4: Commit**

```bash
git add src/support/avvisi.ts src/support/world.ts scripts/lib/targets.ts scripts/lib/accesso.check.ts bdd-targets.example.json
git commit -m "feat(avvisi): nuovo messaggio, Start over con dispatchEvent, velo dichiarato dall'ambiente"
```

---

### Task 2: Il registro delle utility

**Files:**
- Create: `src/support/utility.ts`
- Create: `scripts/lib/utility.check.ts`
- Modify: `package.json` (script `check:utility`, aggiunto a `check:all`)

**Interfaces:**
- Produces (usati dai task 3–7):

```ts
export interface GestoPerUtility {
  action: "click" | "fill" | "set";
  role: string;
  name: string;
  value?: string;
  secret?: boolean;
  url?: string;
  intestazione?: string;
  senzaAncoraggio?: boolean;
}
export interface UtilityRiconosciuta {
  nome: string;
  /** Percorso del modulo sotto src/, senza estensione: "actions/farmacia.actions". */
  modulo: string;
  funzione: string;
  /** true: il passo e' fatto solo di gesti della utility. false: solo da proporre. */
  completa: boolean;
  /** Valori che diventano {string} nella frase, nell'ordine degli argomenti. */
  parametri: string[];
  /** Righe della tabella Gherkin sotto lo step, intestazione compresa. */
  tabella?: string[][];
}
export interface Utility {
  nome: string;
  modulo: string;
  funzione: string;
  riconosci(gesti: readonly GestoPerUtility[]): UtilityRiconosciuta | null;
}
export const UTILITY: readonly Utility[];
export function utilityDelPasso(gesti: readonly GestoPerUtility[], utility?: readonly Utility[]): UtilityRiconosciuta | null;
```

- [ ] **Step 1: Scrivere il controllo che fallisce**

`scripts/lib/utility.check.ts` (stesso stile di `normalize.check.ts`: funzioni `eq`, conteggio fallimenti, `process.exit`). I gesti sono quelli veri della registrazione del 14/10 (ordine successivo), con email finta:

```ts
import { utilityDelPasso, type GestoPerUtility } from "../../src/support/utility";

let failures = 0;
const eq = (what: string, got: unknown, want: unknown): void => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  console.log(`${ok ? "OK  " : "FAIL"} ${what}${ok ? "" : `\n      got:  ${JSON.stringify(got)}\n      want: ${JSON.stringify(want)}`}`);
  if (!ok) failures++;
};
const Q = "https://qa-clinic.invalid/questions/1";
const MAPPA = "https://qa-clinic.invalid/pharmacy-map-selection";

console.log("\n--- farmacia ---\n");
const farmacia: GestoPerUtility[] = [
  { action: "fill", role: "textbox", name: "zip", value: "NW1", url: MAPPA },
  { action: "click", role: "button", name: "Select Pharmacy", url: MAPPA },
];
const f = utilityDelPasso(farmacia);
eq("CAP + Select Pharmacy: la utility della farmacia, completa", [f?.nome, f?.completa], ["farmacia", true]);
eq("e il CAP diventa il parametro", f?.parametri, ["NW1"]);
eq("con il pin registrato (pulsante senza nome) e' la stessa cosa",
  utilityDelPasso([farmacia[0]!, { action: "click", role: "button", name: "", url: MAPPA }, farmacia[1]!])?.completa, true);
eq("con un gesto estraneo e' solo una proposta",
  utilityDelPasso([...farmacia, { action: "click", role: "button", name: "Edit address", url: MAPPA }])?.completa, false);

console.log("\n--- questionario ---\n");
const domande: GestoPerUtility[] = [
  { action: "click", role: "button", name: "Stay on the same dose", url: Q, intestazione: "How do you wish to proceed?" },
  { action: "fill", role: "spinbutton", name: "0", value: "190", url: Q, intestazione: "1. What is your current weight?" },
  { action: "fill", role: "spinbutton", name: "0", value: "80", url: Q, intestazione: "1. What is your current weight?" },
  { action: "click", role: "button", name: "Next", url: Q, intestazione: "1. What is your current weight?" },
  { action: "click", role: "button", name: "No", url: Q, intestazione: "3. Has there been any change in your medication?" },
];
const q = utilityDelPasso(domande);
eq("gesti su /questions/: il questionario, completo", [q?.nome, q?.completa], ["questionario", true]);
eq("la tabella: una riga per domanda, i numeri uniti nell'ordine, Next ignorato", q?.tabella, [
  ["domanda", "risposta"],
  ["How do you wish to proceed?", "Stay on the same dose"],
  ["1. What is your current weight?", "190 / 80"],
  ["3. Has there been any change in your medication?", "No"],
]);

console.log("\n--- foto e pagamento ---\n");
const CAM = "https://qa-clinic.invalid/camera/id";
eq("solo gesti della fotocamera: foto, completa",
  utilityDelPasso(["Open camera", "Take Picture", "Save", "That's me", "Submit"].map((name) => ({ action: "click" as const, role: "button", name, url: CAM })))?.nome,
  "foto");
const SUM = "https://qa-clinic.invalid/summary";
const p = utilityDelPasso([
  { action: "click", role: "button", name: "....0000 Expiry 12/29", url: SUM },
  { action: "click", role: "button", name: "Place Order", url: SUM },
]);
eq("carta salvata + Place Order: pagamento, senza parametri", [p?.nome, p?.completa, p?.parametri], ["pagamento", true, []]);

console.log("\n--- nessuna utility ---\n");
eq("un passo qualunque non e' una utility",
  utilityDelPasso([{ action: "click", role: "link", name: "Weight Loss", url: "https://qa-brochure.invalid/" }]), null);

console.log(failures === 0 ? "\nTutti i controlli OK." : `\n${failures} controlli FALLITI`);
process.exit(failures === 0 ? 0 : 1);
```

In `package.json`: `"check:utility": "ts-node scripts/lib/utility.check.ts"`, e ` && npm run check:utility` in coda a `check:all`.

- [ ] **Step 2: Verificare che fallisca**

Run: `npm run check:utility` — Expected: errore di compilazione, `src/support/utility` non esiste.

- [ ] **Step 3: Scrivere il registro**

`src/support/utility.ts`:

```ts
// src/support/utility.ts
// Il registro delle utility: per ognuna, come si riconosce un passo registrato
// che la fa, e quali valori di quel passo ne diventano i parametri.
//
// Puro come avvisi.ts e ricette.ts: lo legge il generatore senza aprire un
// browser. Il riconoscimento e' per identita' (ruolo + nome, o la pagina), mai
// per somiglianza di parole. Spec: docs/superpowers/specs/2026-10-14-utility-per-comportamento-design.md

export interface GestoPerUtility {
  action: "click" | "fill" | "set";
  role: string;
  name: string;
  value?: string;
  secret?: boolean;
  url?: string;
  intestazione?: string;
  senzaAncoraggio?: boolean;
}

export interface UtilityRiconosciuta {
  nome: string;
  modulo: string;
  funzione: string;
  completa: boolean;
  parametri: string[];
  tabella?: string[][];
}

export interface Utility {
  nome: string;
  modulo: string;
  funzione: string;
  riconosci(gesti: readonly GestoPerUtility[]): UtilityRiconosciuta | null;
}

const percorso = (g: GestoPerUtility): string => {
  try {
    return new URL(g.url ?? "").pathname;
  } catch {
    return "";
  }
};

/**
 * Riconoscimento per insieme di componenti: `obbligatori` devono esserci tutti,
 * `ammessi` possono esserci. Qualunque altro gesto rende la coincidenza parziale.
 */
function perComponenti(
  u: Omit<Utility, "riconosci">,
  obbligatori: ReadonlyArray<(g: GestoPerUtility) => boolean>,
  ammessi: ReadonlyArray<(g: GestoPerUtility) => boolean>,
  parametri: (gesti: readonly GestoPerUtility[]) => string[]
): Utility {
  return {
    ...u,
    riconosci(gesti) {
      if (gesti.length === 0 || !obbligatori.every((o) => gesti.some(o))) return null;
      const tutti = [...obbligatori, ...ammessi];
      const completa = gesti.every((g) => tutti.some((t) => t(g)));
      return { ...u, completa, parametri: completa ? parametri(gesti) : [] };
    },
  };
}

const pulsante = (nome: RegExp) => (g: GestoPerUtility): boolean => g.role === "button" && nome.test(g.name);

const FARMACIA = perComponenti(
  { nome: "farmacia", modulo: "actions/farmacia.actions", funzione: "scegliFarmacia" },
  [(g) => g.role === "textbox" && g.name === "zip" && g.action === "fill", pulsante(/^select pharmacy$/i)],
  // Il pin, quando il registratore lo prende: un pulsante senza nome o un gesto senza ancoraggio.
  [(g) => g.action === "click" && (g.name === "" || Boolean(g.senzaAncoraggio))],
  (gesti) => [gesti.find((g) => g.name === "zip")?.value ?? ""]
);

const PAGAMENTO = perComponenti(
  { nome: "pagamento", modulo: "actions/pagamento.actions", funzione: "paga" },
  [pulsante(/^place order$/i)],
  [pulsante(/expiry/i)],
  () => []
);

const NOMI_FOTO = /^(open camera|take picture|save|that's me|submit)$/i;
const FOTO: Utility = {
  nome: "foto",
  modulo: "actions/foto.actions",
  funzione: "scattaFoto",
  riconosci(gesti) {
    if (gesti.length === 0 || !gesti.some((g) => /\/camera\//.test(percorso(g)))) return null;
    const completa = gesti.every((g) => /\/camera\//.test(percorso(g)) && pulsante(NOMI_FOTO)(g));
    return { nome: this.nome, modulo: this.modulo, funzione: this.funzione, completa, parametri: [] };
  },
};

const QUESTIONARIO: Utility = {
  nome: "questionario",
  modulo: "actions/questionario.actions",
  funzione: "rispondiQuestionario",
  riconosci(gesti) {
    if (gesti.length === 0 || !gesti.some((g) => percorso(g).startsWith("/questions/"))) return null;
    const completa = gesti.every((g) => percorso(g).startsWith("/questions/") && g.intestazione);
    if (!completa) return { nome: this.nome, modulo: this.modulo, funzione: this.funzione, completa, parametri: [] };
    // Una riga per domanda, nell'ordine; i numeri della stessa domanda uniti con " / ".
    // Next e Open calendar non sono risposte.
    const righe = new Map<string, string[]>();
    for (const g of gesti) {
      if (/^(next|open calendar)$/i.test(g.name) || g.senzaAncoraggio) {
        if (g.senzaAncoraggio && !righe.has(g.intestazione!)) righe.set(g.intestazione!, ["oggi"]);
        continue;
      }
      const risposta = g.action === "fill" ? (g.value ?? "") : g.name;
      const gia = righe.get(g.intestazione!) ?? [];
      if (g.action === "fill") gia.push(risposta);
      else gia.splice(0, gia.length, risposta);
      righe.set(g.intestazione!, gia);
    }
    const tabella = [["domanda", "risposta"], ...[...righe].map(([d, r]) => [d, r.join(" / ")])];
    return { nome: this.nome, modulo: this.modulo, funzione: this.funzione, completa, parametri: [], tabella };
  },
};

export const UTILITY: readonly Utility[] = [QUESTIONARIO, FARMACIA, PAGAMENTO, FOTO];

/** La prima utility che riconosce il passo; completa prima di parziale. */
export function utilityDelPasso(
  gesti: readonly GestoPerUtility[],
  utility: readonly Utility[] = UTILITY
): UtilityRiconosciuta | null {
  const esiti = utility.map((u) => u.riconosci(gesti)).filter((e): e is UtilityRiconosciuta => e !== null);
  return esiti.find((e) => e.completa) ?? esiti[0] ?? null;
}
```

- [ ] **Step 4: Verificare che passi**

Run: `npm run check:utility` — Expected: `Tutti i controlli OK.` (Se la riga della domanda sulla data non c'e' nel caso di prova, va bene: la data e' coperta in Task 3.)

- [ ] **Step 5: Commit**

```bash
git add src/support/utility.ts scripts/lib/utility.check.ts package.json
git commit -m "feat(utility): registro delle utility e riconoscimento dei passi registrati"
```

---

### Task 3: Utility questionario

**Files:**
- Create: `src/pages/clinic/questionario.page.ts`
- Create: `src/actions/questionario.actions.ts`

**Interfaces:**
- Consumes: `BasePage` (`src/support/base.page.ts`).
- Produces: `rispondiQuestionario(page: Page, tabella: string[][]): Promise<void>` — `tabella` e' `dataTable.raw()`, prima riga `["domanda","risposta"]`.

- [ ] **Step 1: La Page Object (solo selettori e gesti atomici)**

`src/pages/clinic/questionario.page.ts` — scritta a mano, **senza** il marcatore di generazione:

```ts
// src/pages/clinic/questionario.page.ts
// Il questionario di clinic: stessa pagina (/questions/N) per domande diverse.
// Selettori dallo script di esplorazione del 14/10 e dal POC (JetLagWizardPage).
import { type Locator, type Page } from "@playwright/test";
import { BasePage } from "../../support/base.page";

const DATA = /^\d{2}\/\d{2}\/\d{4}$/;

export class QuestionarioPage extends BasePage {
  readonly path = "/questions/";
  constructor(page: Page) {
    super(page);
  }
  async assertLoaded(): Promise<void> {
    await this.expectVisible(this.titolo());
  }
  sulQuestionario(): boolean {
    return this.page.url().includes("/questions/");
  }
  private titolo(): Locator {
    return this.page.locator("h3").filter({ visible: true }).first();
  }
  async domanda(): Promise<string> {
    const t = await this.titolo().textContent({ timeout: 1500 }).catch(() => "");
    return (t ?? "").replace(/\s+/g, " ").trim();
  }
  async aspettaDomanda(ms = 30_000): Promise<void> {
    await this.titolo().waitFor({ state: "visible", timeout: ms }).catch(() => undefined);
  }
  campiNumerici(): Locator {
    return this.page.getByRole("spinbutton").filter({ visible: true });
  }
  private campoData(): Locator {
    return this.page.getByRole("textbox", { name: DATA }).filter({ visible: true }).first();
  }
  async haData(ms = 3000): Promise<boolean> {
    return this.campoData().waitFor({ state: "visible", timeout: ms }).then(() => true, () => false);
  }
  /** Il campo e' spesso in sola lettura: allora si sceglie oggi dal calendario. */
  async scegliData(valore: string): Promise<void> {
    if (valore !== "oggi" && (await this.campoData().fill(valore, { timeout: 3000 }).then(() => true, () => false))) {
      await this.campoData().press("Tab");
      return;
    }
    await this.page.getByRole("button", { name: "Open calendar" }).click();
    const oggi = this.page.locator(".md-calendar-date-today .md-calendar-date-selection-indicator").filter({ visible: true }).first();
    const qualunque = this.page
      .locator(".md-calendar-date:not(.md-calendar-date-disabled) .md-calendar-date-selection-indicator")
      .filter({ visible: true })
      .last();
    await oggi.or(qualunque).first().click({ timeout: 10_000 });
  }
  /** Una risposta: l'etichetta esatta, poi un elemento con ng-click che la contiene (POC). */
  async rispondi(risposta: string): Promise<boolean> {
    const etichetta = this.page.getByText(risposta, { exact: true }).filter({ visible: true }).first();
    if (await etichetta.waitFor({ state: "visible", timeout: 3000 }).then(() => true, () => false)) {
      await etichetta.click();
      return true;
    }
    const ngClick = this.page.locator("[ng-click]").filter({ hasText: risposta }).filter({ visible: true }).first();
    if (!(await ngClick.isVisible().catch(() => false))) return false;
    await ngClick.click();
    return true;
  }
  next(): Locator {
    return this.page.getByRole("button", { name: "Next", exact: true });
  }
}
```

- [ ] **Step 2: L'azione (nessun selettore)**

`src/actions/questionario.actions.ts`:

```ts
// src/actions/questionario.actions.ts
// Risponde al questionario leggendo la domanda a schermo (POC, JetLagWizardPage).
// Le risposte vengono dalla tabella sotto lo step; una domanda che non c'e'
// riceve "No". Una domanda senza "No" e senza risposta in tabella ferma lo
// scenario dicendo quale domanda era.
import type { Page } from "@playwright/test";
import { QuestionarioPage } from "../pages/clinic/questionario.page";

const MAX_DOMANDE = 15;

function rispostaPer(domanda: string, tabella: readonly string[][]): string {
  const norm = (s: string): string => s.toLowerCase().replace(/^\d+\.\s*/, "").replace(/\s+/g, " ").trim();
  return tabella.slice(1).find(([d]) => norm(d ?? "") === norm(domanda))?.[1] ?? "No";
}

async function avanza(q: QuestionarioPage, page: Page, domanda: string): Promise<void> {
  const limite = Date.now() + 20_000;
  while (Date.now() < limite) {
    if (!q.sulQuestionario() || (await q.domanda()) !== domanda) return;
    if (await q.next().isEnabled().catch(() => false)) {
      await q.next().click({ timeout: 5000 }).catch(() => undefined);
      const fine = Date.now() + 15_000;
      while (Date.now() < fine && q.sulQuestionario() && (await q.domanda()) === domanda) await page.waitForTimeout(250);
      return;
    }
    await page.waitForTimeout(250);
  }
}

export async function rispondiQuestionario(page: Page, tabella: string[][]): Promise<void> {
  const q = new QuestionarioPage(page);
  for (let i = 0; i < MAX_DOMANDE; i++) {
    if (!q.sulQuestionario()) return;
    await q.aspettaDomanda();
    const domanda = await q.domanda();
    if (!domanda) return;
    const risposta = rispostaPer(domanda, tabella);
    const numeri = risposta.split(" / ");
    if ((await q.campiNumerici().count()) > 0 && numeri.every((n) => /^\d+([.,]\d+)?$/.test(n))) {
      for (const [k, n] of numeri.entries()) await q.campiNumerici().nth(k).fill(n);
      await q.campiNumerici().nth(numeri.length - 1).press("Tab");
    } else if (await q.haData()) {
      await q.scegliData(risposta === "No" ? "oggi" : risposta);
    } else if (!(await q.rispondi(risposta))) {
      throw new Error(
        `Questionario: alla domanda «${domanda}» non c'e' la risposta «${risposta}».\n` +
          `  Aggiungi la domanda alla tabella sotto lo step, con una delle risposte che la pagina offre.`
      );
    }
    await avanza(q, page, domanda);
  }
  throw new Error(`Questionario: non e' finito dopo ${MAX_DOMANDE} domande.`);
}
```

- [ ] **Step 3: Compila**

Run: `npx tsc --noEmit` — Expected: nessun errore. (La prova vera e' la sentinella del Task 8.)

- [ ] **Step 4: Commit**

```bash
git add src/pages/clinic/questionario.page.ts src/actions/questionario.actions.ts
git commit -m "feat(utility): questionario guidato dalla domanda a schermo"
```

---

### Task 4: Utility farmacia

**Files:**
- Create: `src/pages/clinic/farmacia.page.ts`
- Create: `src/actions/farmacia.actions.ts`

**Interfaces:**
- Consumes: `sceltaSuMappa(page, opzioni?)` da `src/actions/mappa.actions.ts`.
- Produces: `scegliFarmacia(page: Page, cap: string): Promise<void>`.

- [ ] **Step 1: Page Object**

```ts
// src/pages/clinic/farmacia.page.ts
import { type Locator, type Page } from "@playwright/test";
import { BasePage } from "../../support/base.page";

export class FarmaciaPage extends BasePage {
  readonly path = "/pharmacy-map-selection";
  private readonly cap: Locator = this.page.getByRole("textbox", { name: "zip", exact: true });
  private readonly conferma: Locator = this.page.getByRole("button", { name: "Select Pharmacy", exact: true });
  constructor(page: Page) {
    super(page);
  }
  async assertLoaded(): Promise<void> {
    await this.expectVisible(this.cap);
  }
  async cerca(cap: string): Promise<void> {
    await this.cap.fill(cap);
    await this.cap.press("Enter");
  }
  async confermaFarmacia(): Promise<void> {
    await this.conferma.click();
  }
}
```

- [ ] **Step 2: Azione**

```ts
// src/actions/farmacia.actions.ts
// Cerca un CAP e sceglie la prima farmacia sulla mappa (POC, JetLagDeliveryPage).
import type { Page } from "@playwright/test";
import { FarmaciaPage } from "../pages/clinic/farmacia.page";
import { sceltaSuMappa } from "./mappa.actions";

export async function scegliFarmacia(page: Page, cap: string): Promise<void> {
  const farmacia = new FarmaciaPage(page);
  await farmacia.assertLoaded();
  await farmacia.cerca(cap);
  await sceltaSuMappa(page);
  await farmacia.confermaFarmacia();
}
```

- [ ] **Step 3: Compila e commit**

Run: `npx tsc --noEmit`, poi `npm run check:app-finta` (la ricetta della mappa non deve regredire) — Expected: `Tutti i controlli OK.`

```bash
git add src/pages/clinic/farmacia.page.ts src/actions/farmacia.actions.ts
git commit -m "feat(utility): scelta della farmacia dal CAP"
```

---

### Task 5: Utility pagamento e foto

**Files:**
- Create: `src/pages/clinic/pagamento.page.ts`, `src/actions/pagamento.actions.ts`
- Create: `src/pages/clinic/foto.page.ts`, `src/actions/foto.actions.ts`

**Interfaces:**
- Produces: `paga(page: Page, numero?: string, scadenza?: string, cvc?: string): Promise<void>`; `scattaFoto(page: Page): Promise<void>`.

- [ ] **Step 1: Pagamento**

```ts
// src/pages/clinic/pagamento.page.ts
import { type Locator, type Page } from "@playwright/test";
import { BasePage } from "../../support/base.page";

export class PagamentoPage extends BasePage {
  readonly path = "/summary";
  constructor(page: Page) {
    super(page);
  }
  async assertLoaded(): Promise<void> {
    await this.expectVisible(this.page.getByRole("heading", { name: /your order/i }));
  }
  cartaSalvata(): Locator {
    return this.page.getByRole("button", { name: /Expiry/ }).filter({ visible: true }).first();
  }
  /** Stripe: un iframe per campo (POC, PaymentPage). */
  async scriviCarta(numero: string, scadenza: string, cvc: string): Promise<void> {
    const frame = (n: number) => this.page.frameLocator('iframe[name^="__privateStripeFrame"]').nth(n);
    await frame(0).getByRole("textbox", { name: "Credit or debit card number" }).fill(numero);
    await frame(1).getByRole("textbox", { name: "Credit or debit card expiration date" }).fill(scadenza);
    await frame(2).getByRole("textbox", { name: "Credit or debit card CVC/CVV" }).fill(cvc);
  }
  async confermaOrdine(): Promise<void> {
    await this.page.getByRole("button", { name: /place order/i }).click();
  }
}
```

```ts
// src/actions/pagamento.actions.ts
// Carta salvata se c'e'; altrimenti la carta passata dallo step. Senza ne'
// l'una ne' l'altra si ferma subito, dicendolo.
import type { Page } from "@playwright/test";
import { PagamentoPage } from "../pages/clinic/pagamento.page";

export async function paga(page: Page, numero?: string, scadenza?: string, cvc?: string): Promise<void> {
  const p = new PagamentoPage(page);
  await p.assertLoaded();
  if (numero && scadenza && cvc) {
    await p.scriviCarta(numero, scadenza, cvc);
  } else if (await p.cartaSalvata().waitFor({ state: "visible", timeout: 10_000 }).then(() => true, () => false)) {
    await p.cartaSalvata().click();
  } else {
    throw new Error("Pagamento: nessuna carta salvata per questa utenza, e lo step non passa i dati di una carta.");
  }
  await p.confermaOrdine();
}
```

- [ ] **Step 2: Foto**

```ts
// src/pages/clinic/foto.page.ts
import { type Locator, type Page } from "@playwright/test";
import { BasePage } from "../../support/base.page";

export class FotoPage extends BasePage {
  readonly path = "/camera/";
  constructor(page: Page) {
    super(page);
  }
  async assertLoaded(): Promise<void> {
    await this.page.waitForURL(/\/camera\//, { timeout: 90_000 });
  }
  sullaFotocamera(): boolean {
    return this.page.url().includes("/camera/");
  }
  pulsante(nome: "Open camera" | "Take Picture" | "Save" | "That's me" | "Submit"): Locator {
    return this.page.getByRole("button", { name: nome, exact: true }).filter({ visible: true }).first();
  }
}
```

```ts
// src/actions/foto.actions.ts
// Selfie, documento, fronte, lato: quante foto chiede la pagina, in qualunque
// ordine. "That's me" e' facoltativo (POC, completeIdVerification).
import type { Page } from "@playwright/test";
import { FotoPage } from "../pages/clinic/foto.page";

export async function scattaFoto(page: Page): Promise<void> {
  const f = new FotoPage(page);
  await f.assertLoaded();
  for (let i = 0; i < 12; i++) {
    const quale = await Promise.any([
      f.pulsante("Open camera").waitFor({ state: "visible", timeout: 30_000 }).then(() => "apri" as const),
      f.pulsante("Take Picture").waitFor({ state: "visible", timeout: 30_000 }).then(() => "scatta" as const),
      f.pulsante("Submit").waitFor({ state: "visible", timeout: 30_000 }).then(() => "invia" as const),
    ]).catch(() => null);
    if (!quale) return;
    if (quale === "invia") {
      await f.pulsante("Submit").click();
      await page.waitForTimeout(2000);
      if (!f.sullaFotocamera()) return;
      continue;
    }
    if (quale === "apri") await f.pulsante("Open camera").click();
    await f.pulsante("Take Picture").click();
    await f.pulsante("Save").click();
    const sonoIo = f.pulsante("That's me");
    if (await sonoIo.waitFor({ state: "visible", timeout: 5000 }).then(() => true, () => false)) await sonoIo.click();
  }
}
```

- [ ] **Step 3: Compila e commit**

Run: `npx tsc --noEmit` — Expected: nessun errore.

```bash
git add src/pages/clinic/pagamento.page.ts src/actions/pagamento.actions.ts src/pages/clinic/foto.page.ts src/actions/foto.actions.ts
git commit -m "feat(utility): pagamento con carta salvata o nuova, foto"
```

---

### Task 6: Lo script di esplorazione usa le utility

**Files:**
- Modify: `scripts/esplora-flusso.ts` (tolte le funzioni `rispondi`, `avanza`, `questionario`, `foto`; le fasi chiamano le utility)

**Interfaces:**
- Consumes: `rispondiQuestionario`, `scegliFarmacia`, `paga`, `scattaFoto`.

- [ ] **Step 1: Sostituire le fasi**

Nelle fasi di `main()`:

```ts
    fase = "questionario";
    await page.waitForURL(/\/questions\//, { timeout: 60_000 });
    await fotografa(page, "questionario");
    await rispondiQuestionario(page, [
      ["domanda", "risposta"],
      ["How do you wish to proceed?", "Stay on the same dose"],
      ["1. What is your current weight?", `${argValue(ARGS, "altezza") ?? "190"} / ${argValue(ARGS, "peso") ?? "80"}`],
    ]);

    fase = "consegna";
    await page.getByRole("button", { name: "Yes, pick up in store" }).click({ timeout: 60_000 });

    fase = "farmacia";
    await scegliFarmacia(page, argValue(ARGS, "cap") ?? "NW1");
    await fotografa(page, "farmacia scelta");

    fase = "riepilogo e pagamento";
    await paga(page);

    fase = "foto";
    await scattaFoto(page);
```

e gli import corrispondenti da `../src/actions/*.actions`. Cancellare le funzioni locali `rispondi`, `avanza`, `questionario`, `foto` e la costante `RISPOSTE`.

- [ ] **Step 2: Prova sul QA, due volte di fila**

Run (due volte): `npx ts-node -T scripts/esplora-flusso.ts email=<utenza +22>`
Expected: entrambe le volte `arrivato in fondo`, e in `reports/esplora/<ultima>/diario.md` l'ultima riga con «That's everything we need».

- [ ] **Step 3: Commit**

```bash
git add scripts/esplora-flusso.ts
git commit -m "refactor(esplorazione): il percorso usa le utility"
```

---

### Task 7: Il generatore chiama le utility

**Files:**
- Modify: `scripts/lib/generation-contract.ts` (`ResolvedIntent.utility?`)
- Modify: `scripts/lib/generate-core.ts` (riconoscimento in `resolveRecording`; gap `utility-proposta`)
- Modify: `scripts/lib/generate-emit.ts` (`emitSteps`, `emitFeature`, `frasiDiIntento`)
- Modify: `web-ui/src/lib/salva-glue.ts` (riscrittura dell'import di `actions/`)
- Test: `scripts/lib/generate-core.check.ts`, `web-ui/__tests__/lib/salva-glue.test.ts`

**Interfaces:**
- Consumes: `utilityDelPasso`, `GestoPerUtility`, `UtilityRiconosciuta` (Task 2).
- Produces: `ResolvedIntent.utility?: UtilityRiconosciuta`.

- [ ] **Step 1: Il controllo che fallisce**

In `generate-core.check.ts`, nuova sezione prima di «generazione e compilazione»:

```ts
console.log("\n--- un passo riconosciuto chiama la utility (spec del 14/10) ---\n");
{
  const MAPPA = "https://qa-clinic.invalid/pharmacy-map-selection";
  const registrazione: Recording = {
    startUrl: MAPPA, recordedAt: "", durationSeconds: 0,
    intents: [{
      label: "The user sleect the store", assertions: [], notes: [], pageUrl: MAPPA,
      steps: [
        { action: "fill", role: "textbox", name: "zip", value: "NW1", url: MAPPA },
        { action: "click", role: "button", name: "Select Pharmacy", url: MAPPA },
      ],
    }],
  } as never;
  const risolta = resolveRecording(registrazione, indexDictionaries([]), { catalog: [] });
  eq("il passo porta la utility della farmacia, completa", [risolta.intents[0]?.utility?.nome, risolta.intents[0]?.utility?.completa], ["farmacia", true]);
  const ctx = {
    intents: risolta.intents, pages: risolta.pages, recordingPath: "x.json", dictionaryPaths: [], recordedAt: "",
    durationSeconds: 0, generatedAt: "", slug: "farmacia", outRoot: "src",
  };
  const glue = emitSteps(ctx, risolta.pages, new Map() as never).contents;
  eq("la frase resta quella del tester", glue.includes('When("The user sleect the store with {string}"') || glue.includes('Given("The user sleect the store with {string}"'), true);
  eq("il corpo chiama la utility con il CAP", glue.includes("await scegliFarmacia(this.page, valore1);"), true);
  eq("e la importa da src/actions", glue.includes('import { scegliFarmacia } from "../../actions/farmacia.actions";'), true);
  const fuori = emitSteps({ ...ctx, outRoot: "reports/prova" }, risolta.pages, new Map() as never).contents;
  eq("generando fuori da src l'import punta comunque a src/actions",
    fuori.includes('from "../../../../src/actions/farmacia.actions"'), true);
}
```

Nel test del cruscotto `salva-glue.test.ts`, nuovo caso: uno `STEPS` con la riga `import { scegliFarmacia } from "../../actions/farmacia.actions";` salvato in `shop/orders` deve diventare `from "../../../actions/farmacia.actions"`.

Run: `npm run check:generate` e `cd web-ui && npx vitest run __tests__/lib/salva-glue.test.ts` — Expected: FAIL (proprieta' `utility` assente; import non riscritto).

- [ ] **Step 2: Contratto e riconoscimento**

`generation-contract.ts`, in `ResolvedIntent` dopo `candidateEvidence?`:

```ts
  /** Una utility riconosciuta nei gesti del passo (src/support/utility.ts). */
  utility?: import("../../src/support/utility").UtilityRiconosciuta;
```

`generate-core.ts`, in `resolveRecording`, subito prima del `return { label: intent.label, ...`:

```ts
    const utility = utilityDelPasso(
      gesti.map((g) => ({
        action: g.action, role: g.role, name: g.name, value: g.value, secret: g.secret, url: g.url,
        intestazione: g.contesto?.intestazione, senzaAncoraggio: Boolean(g.ancoraggioAssente),
      }))
    );
    if (utility && !utility.completa) {
      gaps.push({
        kind: "utility-proposta",
        where: intent.label,
        detail: `Questo passo assomiglia alla utility "${utility.nome}" (src/${utility.modulo}.ts), ma contiene anche altri gesti: resta generato com'e'. Se i gesti in piu' sono rumore, toglili e rigenera.`,
      });
    }
```

e nell'oggetto restituito: `...(utility?.completa ? { utility } : {}),`. Aggiungere `"utility-proposta"` all'unione di `Gap["kind"]` in `generation-contract.ts`, e l'import `import { utilityDelPasso } from "../../src/support/utility";`.

- [ ] **Step 3: Frase e corpo dello step**

In `generate-emit.ts`, all'inizio di `frasiDiIntento`:

```ts
  if (intent.utility) {
    const base = phraseOf(intent);
    const valori = intent.utility.parametri;
    const parametri = valori.map((_, i) => `valore${i + 1}`);
    const espressione = valori.length === 0 ? base : `${base} with ${valori.map(() => "{string}").join(" and ")}`;
    const frase = valori.length === 0 ? base : `${base} with ${valori.map((v) => `"${v.replace(/"/g, "'")}"`).join(" and ")}`;
    return { espressione, frase, parametri, valori: [], ripetizione: null, parametroVolte: null };
  }
```

In `emitSteps`, dentro `ctx.intents.forEach`, prima di costruire `lines` dei gesti:

```ts
    if (intent.utility) {
      const u = intent.utility;
      const daSteps = path.posix.relative(`${ctx.outRoot}/steps/generated`, `src/${u.modulo}`);
      importUtility.add(`import { ${u.funzione} } from "${daSteps.startsWith(".") ? daSteps : `./${daSteps}`}";`);
      const argomenti = [...frasi.parametri, ...(u.tabella ? ["tabella.raw()"] : [])];
      const firma = frasi.parametri.map((p) => `, ${p}: string`).join("") + (u.tabella ? ", tabella: DataTable" : "");
      if (!seenPhrases.has(frasi.espressione)) {
        seenPhrases.add(frasi.espressione);
        blocks.push(
          `/**\n * @intent  ${frasi.espressione}\n * @utility ${u.nome} (src/${u.modulo}.ts)\n * @wanted\n */\n` +
            `${keywordOf(i)}(${ts(frasi.espressione)}, async function (this: CustomWorld${firma}) {\n` +
            `  await ${u.funzione}(this.page${argomenti.map((a) => `, ${a}`).join("")});\n});`
        );
      }
      return;
    }
```

con, prima del `forEach`, `const importUtility = new Set<string>();` e l'import `import * as path from "path";` in testa al file. Nel `render("steps.ts.tmpl", ...)` passare `PAGE_IMPORTS: [imports, ...importUtility].filter(Boolean).join("\n")`, e aggiungere `DataTable` all'import di Cucumber nel template `templates/steps.ts.tmpl` (`import { Given, When, Then, DataTable } from "@cucumber/cucumber";`).

In `emitFeature`, dopo `lines.push(`${keyword} ${frasiDiIntento(intent).frase}`);`:

```ts
    for (const riga of intent.utility?.tabella ?? []) {
      lines.push(`  | ${riga.map((c) => c.replace(/\|/g, "\\|")).join(" | ")} |`);
    }
```

- [ ] **Step 4: Il salvataggio segue l'import delle utility**

In `web-ui/src/lib/salva-glue.ts`, dove `stepsTesto` riscrive `../../support/world`:

```ts
    .replaceAll('from "../../actions/', 'from "../../../actions/')
```

- [ ] **Step 5: Verificare**

Run: `npx tsc --noEmit && npm run check:generate && npm run check:templates && npm run check:app-finta && (cd web-ui && npx vitest run)` — Expected: tutto OK. `check:app-finta` puo' ora usare le utility da solo: se l'app finta non ha uno dei comportamenti (per esempio il questionario a domande), il passo resta proposto e il controllo resta verde; se fallisce, il dossier dice dove.

- [ ] **Step 6: Commit**

```bash
git add scripts/lib/generation-contract.ts scripts/lib/generate-core.ts scripts/lib/generate-emit.ts scripts/lib/generate-core.check.ts templates/steps.ts.tmpl web-ui/src/lib/salva-glue.ts web-ui/__tests__/lib/salva-glue.test.ts
git commit -m "feat(generazione): un passo riconosciuto chiama la utility, la frase resta del tester"
```

---

### Task 8: Niente verifiche su numeri e date; sentinella

**Files:**
- Modify: `scripts/lib/generate-core.ts` (verifiche instabili scartate e dichiarate)
- Modify: `scripts/lib/generate-emit.ts` (`locatorEmesso`: cifre nel nome → `\d+`)
- Create: `src/features/clinic/sentinelle/ordine-successivo.feature`
- Create: `src/steps/clinic/sentinelle/sentinelle.steps.ts`
- Create: `src/pages/clinic/accesso-clinic.page.ts`, `src/pages/clinic/servizio-weight-loss.page.ts`, `src/actions/servizio-weight-loss.actions.ts`
- Test: `scripts/lib/generate-core.check.ts`

**Interfaces:**
- Consumes: tutte le utility.

- [ ] **Step 1: Controllo che fallisce**

```ts
console.log("\n--- verifiche su numeri e date non diventano verifiche ---\n");
{
  const intento = { label: "the user check", steps: [], assertions: [{ role: "text", name: "1" }, { role: "text", name: "14/10/2026 11:21 AM" }, { role: "heading", name: "That's everything we need" }], notes: [] };
  const r = resolveRecording({ startUrl: "https://x.invalid/", recordedAt: "", durationSeconds: 0, intents: [intento] } as never, indexDictionaries([]), { catalog: [] });
  eq("resta solo la verifica stabile", r.intents[0]?.assertions.map((a) => a.name), ["That's everything we need"]);
  eq("e le altre sono dichiarate", r.gaps.filter((g) => g.kind === "asserzione-non-verificabile").length, 2);
  eq("un nome con un numero si cerca per la parte fissa",
    locatorEmesso(toComponent({ role: "button", name: "10 Secure messages" }, 1)).includes("\\d+ Secure messages"), true);
}
```

Run: `npm run check:generate` — Expected: FAIL.

- [ ] **Step 2: Implementare**

In `generate-core.ts`, dove oggi si emette il gap `asserzione-non-verificabile` per una verifica con nome instabile (cerca `asserzione-non-verificabile`), dopo il `gaps.push(...)` togliere la verifica dall'intento: costruire `const verificheStabili = intent.assertions.filter((a) => judge(a.name, 1).stability !== "unstable");` e usare `assertions: verificheStabili` nell'oggetto restituito.

In `locatorEmesso`, prima di costruire `escaped`: se `judge(c.name, 1).stability === "unstable"` e il nome contiene cifre, sostituire ogni sequenza di cifre con `\d+` dopo l'escape:

```ts
  const instabile = judge(c.name, 1).stability === "unstable" && /\d/.test(c.name);
  const escaped = c.name.trim().replace(/[.*+?^${}()|[\]\\/]/g, "\\$&").replace(instabile ? /\d+/g : /$^/, "\\d+");
```

(`judge` e' gia' importato in `generate-emit.ts` da `./stability`.)

- [ ] **Step 3: La sentinella**

`src/features/clinic/sentinelle/ordine-successivo.feature`:

```gherkin
@clinic @sentinella
Feature: Sentinella delle utility di clinic

  Una volta al giorno: se si accende, il dossier nomina la utility rotta.

  Scenario: ordine successivo di Weight Loss, da inizio a fine
    Given the patient is logged into clinic as "stefano.bertaccini+22@bootsdigitalhealth.co.uk"
    When the patient starts the weight loss service as a returning patient
    And the patient answers the questionnaire
      | domanda                          | risposta              |
      | How do you wish to proceed?      | Stay on the same dose |
      | 1. What is your current weight?  | 190 / 80              |
    And the patient picks up in store near "NW1"
    And the patient pays with the saved card
    And the patient takes the photos
    Then the order is pending clinical assessment
```

Accesso e avvio del servizio servono alla sentinella e non sono ancora utility: si aggiungono qui, con la stessa forma (Page Object scritta a mano, azione senza selettori). Il codice viene da `scripts/esplora-flusso.ts`, fasi «accesso», «servizio», «nuovo o ritorno», «prodotto», «informazioni importanti».

`src/pages/clinic/accesso-clinic.page.ts`:

```ts
// src/pages/clinic/accesso-clinic.page.ts
import { type Page } from "@playwright/test";
import { BasePage } from "../../support/base.page";

export const BROCHURE = "https://qa-brochure.lemonaidhealth.co.uk";

export class AccessoClinicPage extends BasePage {
  readonly path = "/login";
  constructor(page: Page) {
    super(page);
  }
  async assertLoaded(): Promise<void> {
    await this.expectVisible(this.page.getByRole("textbox", { name: "Email" }));
  }
  async apriDallaBrochure(): Promise<void> {
    await this.page.goto(`${BROCHURE}/`);
    await this.page.getByRole("button", { name: "Log in", exact: true }).click();
  }
  async entra(email: string, password: string): Promise<void> {
    await this.page.getByRole("textbox", { name: "Email" }).fill(email);
    await this.page.locator('input[type="password"]').fill(password);
    await this.page.getByRole("button", { name: "Log In", exact: true }).click();
    await this.page.getByRole("button", { name: /My account/ }).waitFor({ state: "visible", timeout: 45_000 });
  }
}
```

`src/pages/clinic/servizio-weight-loss.page.ts`:

```ts
// src/pages/clinic/servizio-weight-loss.page.ts
import { type Page } from "@playwright/test";
import { BasePage } from "../../support/base.page";
import { BROCHURE } from "./accesso-clinic.page";

export class ServizioWeightLossPage extends BasePage {
  readonly path = "/weight-loss/treatment";
  constructor(page: Page) {
    super(page);
  }
  async assertLoaded(): Promise<void> {
    await this.expectVisible(this.page.getByRole("link", { name: /^Get started/ }).filter({ visible: true }).first());
  }
  async apri(): Promise<void> {
    await this.page.goto(`${BROCHURE}/weight-loss/treatment`);
    await this.page.getByRole("link", { name: /^Get started/ }).filter({ visible: true }).first().click();
  }
  async comePazienteDiRitorno(): Promise<void> {
    const ritorno = this.page.getByText(/I haven't been here for over 3 months/).filter({ visible: true }).first();
    await ritorno.waitFor({ state: "visible", timeout: 60_000 });
    await ritorno.click();
  }
  async scegliProdotto(dose: string, coaching: "With Coaching" | "Without Coaching"): Promise<void> {
    await this.page.getByRole("heading", { name: /which medicine/i }).waitFor({ state: "visible", timeout: 60_000 });
    await this.page.getByRole("button", { name: dose, exact: true }).first().click();
    await this.page.getByRole("button", { name: new RegExp(`^\\W*${coaching}\\b`) }).filter({ visible: true }).first().click();
    await this.page.getByRole("button", { name: "Select", exact: true }).and(this.page.locator(":enabled")).first().click();
    await this.page.getByRole("button", { name: /^continue$/i }).filter({ visible: true }).first().click();
  }
  async accettaInformazioniImportanti(): Promise<void> {
    await this.page.getByText("I understand the important information above.").filter({ visible: true }).first().click();
    await this.page.getByRole("button", { name: "Continue", exact: true }).click();
    await this.page.waitForURL(/\/questions\//, { timeout: 60_000 });
  }
  async ritiroInFarmacia(): Promise<void> {
    await this.page.getByRole("button", { name: "Yes, pick up in store" }).click({ timeout: 60_000 });
  }
}
```

`src/actions/servizio-weight-loss.actions.ts`:

```ts
// src/actions/servizio-weight-loss.actions.ts
// Accesso e avvio del servizio Weight Loss per un paziente di ritorno.
import type { Page } from "@playwright/test";
import { AccessoClinicPage } from "../pages/clinic/accesso-clinic.page";
import { ServizioWeightLossPage } from "../pages/clinic/servizio-weight-loss.page";

export async function accediAClinic(page: Page, email: string, password: string): Promise<void> {
  const accesso = new AccessoClinicPage(page);
  await accesso.apriDallaBrochure();
  await accesso.assertLoaded();
  await accesso.entra(email, password);
}

export async function avviaWeightLossDiRitorno(page: Page, dose = "7.2mg"): Promise<void> {
  const servizio = new ServizioWeightLossPage(page);
  await servizio.apri();
  await servizio.comePazienteDiRitorno();
  await servizio.scegliProdotto(dose, "Without Coaching");
  await servizio.accettaInformazioniImportanti();
}

export async function sceglieRitiroInFarmacia(page: Page): Promise<void> {
  await new ServizioWeightLossPage(page).ritiroInFarmacia();
}
```

`src/steps/clinic/sentinelle/sentinelle.steps.ts` (glue sottile, nessun selettore):

```ts
// src/steps/clinic/sentinelle/sentinelle.steps.ts
import { Given, When, Then, DataTable } from "@cucumber/cucumber";
import { CustomWorld } from "../../../support/world";
import { accediAClinic, avviaWeightLossDiRitorno, sceglieRitiroInFarmacia } from "../../../actions/servizio-weight-loss.actions";
import { rispondiQuestionario } from "../../../actions/questionario.actions";
import { scegliFarmacia } from "../../../actions/farmacia.actions";
import { paga } from "../../../actions/pagamento.actions";
import { scattaFoto } from "../../../actions/foto.actions";

/** @intent the patient is logged into clinic as {string} */
Given("the patient is logged into clinic as {string}", async function (this: CustomWorld, email: string) {
  await accediAClinic(this.page, email, this.passwordAmbiente());
});

/** @intent the patient starts the weight loss service as a returning patient */
When("the patient starts the weight loss service as a returning patient", async function (this: CustomWorld) {
  await avviaWeightLossDiRitorno(this.page);
});

/** @intent the patient answers the questionnaire */
When("the patient answers the questionnaire", async function (this: CustomWorld, tabella: DataTable) {
  await rispondiQuestionario(this.page, tabella.raw());
});

/** @intent the patient picks up in store near {string} */
When("the patient picks up in store near {string}", async function (this: CustomWorld, cap: string) {
  await sceglieRitiroInFarmacia(this.page);
  await scegliFarmacia(this.page, cap);
});

/** @intent the patient pays with the saved card */
When("the patient pays with the saved card", async function (this: CustomWorld) {
  await paga(this.page);
});

/** @intent the patient takes the photos */
When("the patient takes the photos", async function (this: CustomWorld) {
  await scattaFoto(this.page);
});

/** @intent the order is pending clinical assessment */
Then("the order is pending clinical assessment", async function (this: CustomWorld) {
  await this.expectTextVisible("Clinical assessment Pending");
});
```

`passwordAmbiente()` legge la password dal blocco `login` dell'ambiente `clinic`: in `bdd-targets.json` (locale) aggiungere a `clinic` un blocco `login` con il campo password `"value": "${CLINIC_PASS}"` (stessa forma di `app-a` in `bdd-targets.example.json`), cosi' la password resta in `.env`.

- [ ] **Step 4: Verificare**

Run: `npm run check:generate && npm run test:dry` — Expected: OK, e la sentinella definita (nessuno step `undefined`).
Run: `npm run test:bersaglio clinic src/features/clinic/sentinelle/ordine-successivo.feature` — Expected: `1 scenario (1 passed)`.

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/generate-core.ts scripts/lib/generate-emit.ts scripts/lib/generate-core.check.ts src/features/clinic/sentinelle src/steps/clinic/sentinelle src/pages/clinic/accesso-clinic.page.ts src/pages/clinic/servizio-weight-loss.page.ts src/actions/servizio-weight-loss.actions.ts
git commit -m "feat(utility): sentinella dell'ordine successivo; niente verifiche su numeri e date"
```

---

### Task 9: Il criterio di fatto

**Files:**
- Modify: `src/features/clinic/weight-loss/the-complete-the-second-order.feature`, `src/steps/clinic/weight-loss/the-complete-the-second-order.steps.ts` (rigenerati)
- Modify: `docs/superpowers/specs/2026-10-14-utility-per-comportamento-design.md` (sezione «Prova di fattibilita'»: esito)

- [ ] **Step 1: Rigenerare lo scenario salvato**

Run:
```bash
npx ts-node scripts/generate.ts reports/recordings/qa-clinic.lemonaidhealth.co.uk-2026-10-14T09-14-05-713Z.json name=the-complete-the-second-order
```
poi salvarlo dal cruscotto in `clinic` / `weight-loss` con lo stesso titolo (sovrascrive: il file porta ancora il marcatore). Expected nel `.feature`: le frasi del tester invariate; sotto il passo del questionario la tabella; i passi della farmacia, del pagamento e delle foto con corpo `await <utility>(...)`; niente verifica sulla data.

- [ ] **Step 2: Due esecuzioni di fila su QA**

Run (due volte): `npm run test:bersaglio clinic src/features/clinic/weight-loss/the-complete-the-second-order.feature`
Expected: entrambe `1 scenario (1 passed)`. Se una fallisce, il dossier in `reports/failures/` dice il passo: correggere nella utility o nella sua Page Object, mai nello step, e rifare le due esecuzioni.

- [ ] **Step 3: Verifiche finali e commit**

Run: `npx tsc --noEmit && npm run check:all && npm run test:dry && (cd web-ui && npx vitest run)` — Expected: tutto verde.

Aggiornare la sezione «Prova di fattibilita'» della spec con: data, due esecuzioni verdi, durata.

```bash
git add src/features/clinic/weight-loss src/steps/clinic/weight-loss step-catalog.json STEP_CATALOG.md docs/superpowers/specs/2026-10-14-utility-per-comportamento-design.md
git commit -m "test(clinic): l'ordine successivo gira da inizio a fine con le utility, due volte di fila"
```

---

## Fuori da questo piano

- **Utility 7 della spec, «utente nuovo a ogni giro»** (registrazione con email unica): serve prima un'esplorazione del flusso di registrazione attuale, che oggi non abbiamo. Sara' il primo task di un piano successivo, insieme alle varianti (`2026-10-14-varianti-da-una-registrazione-design.md`).
- **Sostituire `ricette.ts`**: il registro del Task 2 lo rende superfluo, ma il generatore lo usa ancora per il gap `ricetta-disponibile`. Si toglie quando la utility farmacia ha girato in produzione per un po'.
