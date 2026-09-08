/**
 * benchmark-arena.ts
 * ------------------
 * Prepara il campo per l'esecuzione **senza regole**.
 *
 * PERCHE' NON SI PUO' MISURARE QUI DENTRO
 * Amazon Q carica da solo `.amazonq/rules/`. Lanciare il compito non guidato in
 * questo repository significherebbe misurare "con regole" due volte e chiamarne
 * una "senza": il modo piu' silenzioso di truccare un confronto, e quello a cui
 * nessuno in sala potrebbe obiettare perche' non si vede.
 *
 * COSA C'E' NELL'ARENA, E PERCHE' PROPRIO QUELLO
 * Un progetto Playwright + Cucumber che funziona, e niente altro: package.json,
 * tsconfig, la configurazione di Cucumber, un World minimo. Niente catalogo,
 * niente regole, niente dizionario dei componenti, niente modelli, niente
 * BasePage.
 *
 * E' generoso di proposito. Se l'arena non compilasse per motivi suoi,
 * l'esecuzione senza regole perderebbe per una ragione che non c'entra con la
 * domanda — e il confronto non varrebbe niente. La domanda e' "le regole
 * servono?", non "un progetto vuoto funziona?".
 *
 * Uso:
 *   npm run generate -- --no-rules          produce brief-naive.md
 *   npm run arena -- --brief reports/generate/<nome>/brief-naive.md
 *   cd reports/arena/senza-regole && q chat          (senza --agent: nessuna regola)
 *   npm run benchmark -- --label senza-regole --root reports/arena/senza-regole
 */

import * as fs from "fs";
import * as path from "path";

const ARENA = path.join("reports", "arena", "senza-regole");

function argValue(args: string[], flag: string): string | undefined {
  const eq = args.find((a) => a.startsWith(flag + "="));
  if (eq) return eq.slice(flag.length + 1);
  const i = args.indexOf(flag);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : undefined;
}

/**
 * Un World minimo: quello che avrebbe chiunque partisse da zero.
 *
 * Non e' il nostro: niente `BasePage`, niente `expectTextVisible`, niente
 * lettore di `.env`. Dargli i nostri comodi significherebbe dargli meta' del
 * metodo e poi dire che il metodo non serve.
 */
const WORLD = `import { setWorldConstructor, World, IWorldOptions } from "@cucumber/cucumber";
import { Browser, BrowserContext, Page, chromium } from "@playwright/test";

export class CustomWorld extends World {
  browser!: Browser;
  context!: BrowserContext;
  page!: Page;

  constructor(options: IWorldOptions) {
    super(options);
  }

  async init(): Promise<void> {
    this.browser = await chromium.launch();
    this.context = await this.browser.newContext(
      process.env["BASE_URL"] ? { baseURL: process.env["BASE_URL"] } : {}
    );
    this.page = await this.context.newPage();
  }

  async destroy(): Promise<void> {
    await this.page?.close();
    await this.context?.close();
    await this.browser?.close();
  }
}

setWorldConstructor(CustomWorld);
`;

const HOOKS = `import { Before, After } from "@cucumber/cucumber";
import { CustomWorld } from "./world";

Before(async function (this: CustomWorld) {
  await this.init();
});

After(async function (this: CustomWorld) {
  await this.destroy();
});
`;

const CUCUMBER = `module.exports = {
  default: {
    requireModule: ["ts-node/register"],
    require: ["src/steps/**/*.ts", "src/support/**/*.ts"],
    paths: ["src/features/**/*.feature"],
    format: ["summary"],
  },
};
`;

const TSCONFIG = JSON.stringify(
  {
    compilerOptions: {
      target: "ES2022",
      module: "CommonJS",
      moduleResolution: "node",
      esModuleInterop: true,
      strict: true,
      skipLibCheck: true,
      resolveJsonModule: true,
      types: ["node"],
    },
    include: ["src/**/*.ts"],
  },
  null,
  2
);

const PACKAGE = JSON.stringify(
  {
    name: "arena-senza-regole",
    private: true,
    description: "Campo neutro per il confronto: Playwright + Cucumber e nient'altro.",
    scripts: { "test:dry": "cucumber-js --dry-run" },
  },
  null,
  2
);

const LEGGIMI = `# Arena — esecuzione senza regole

Questo e' un progetto Playwright + Cucumber che funziona, e nient'altro.
**Non** c'e' il catalogo degli step, **non** ci sono le regole, **non** c'e' il
dizionario dei componenti, **non** ci sono i modelli.

E' il termine di paragone. Serve a rispondere con un numero alla domanda "ma
tutto quell'impianto serve, o basta chiedere all'assistente?".

## Cosa fare

1. \`q chat\` — **senza** \`--agent\`, e da dentro questa cartella. Se lo lanci
   dal repository vero, Amazon Q carica le regole da solo e il confronto non
   vale piu' niente.
2. Incolla il contenuto di \`COMPITO.md\`.
3. Lascia che scriva i file dove vuole, sotto \`src/\`.
4. Torna nel repository e misura:

\`\`\`bash
npm run benchmark -- --label senza-regole --root reports/arena/senza-regole
\`\`\`

Il catalogo e il dizionario restano quelli veri anche misurando qui: sono il
metro, e il metro non cambia fra una misura e l'altra.

## Cosa NON fare

Non copiare qui dentro niente dal repository. Se serve, il confronto non e' piu'
fra due modi di lavorare: e' fra lo stesso modo, misurato due volte.
`;

function write(rel: string, contents: string): void {
  const file = path.join(ARENA, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, contents, "utf-8");
  console.log(`   + ${file}`);
}

function main(): void {
  const args = process.argv.slice(2);
  const brief = argValue(args, "--brief");

  console.log(`\nARENA — campo neutro per il confronto\n`);

  // Si ricrea da zero ogni volta: un'arena riusata conserva i file
  // dell'esecuzione precedente, e la misura successiva li conterebbe.
  //
  // La giunzione a node_modules si toglie prima e a mano: su Windows una
  // cancellazione ricorsiva che la incontra puo' seguirla invece di sganciarla,
  // e a quel punto sta cancellando le dipendenze del progetto vero.
  const junction = path.join(ARENA, "node_modules");
  if (fs.existsSync(junction)) {
    try { fs.unlinkSync(junction); } catch { fs.rmSync(junction, { recursive: true, force: true }); }
  }
  fs.rmSync(ARENA, { recursive: true, force: true });
  fs.mkdirSync(ARENA, { recursive: true });

  write("package.json", PACKAGE);
  write("tsconfig.json", TSCONFIG);
  write("cucumber.js", CUCUMBER);
  write("src/support/world.ts", WORLD);
  write("src/support/hooks.ts", HOOKS);
  write("LEGGIMI.md", LEGGIMI);
  write("src/features/.gitkeep", "");
  write("src/steps/.gitkeep", "");
  write("src/pages/.gitkeep", "");

  if (brief && fs.existsSync(brief)) {
    write("COMPITO.md", fs.readFileSync(brief, "utf-8"));
  } else {
    console.log(
      `\n   Nessun compito copiato. Generalo con:\n` +
        `     npm run generate -- --no-rules\n` +
        `   e poi rilancia con --brief reports/generate/<nome>/brief-naive.md`
    );
  }

  // Giunzione invece di copia: node_modules pesa centinaia di megabyte, e
  // duplicarlo renderebbe l'arena una cosa che non si ricrea volentieri.
  const link = path.join(ARENA, "node_modules");
  try {
    fs.symlinkSync(path.resolve("node_modules"), link, "junction");
    console.log(`   + ${link}  (giunzione, non copia)`);
  } catch (err) {
    console.log(
      `\n   Non sono riuscito a collegare node_modules: ${(err as Error).message}\n` +
        `   Rimedio: lancia "npm install" dentro all'arena, oppure creala a mano.`
    );
  }

  console.log(`\n  POI\n`);
  console.log(`   cd ${ARENA}`);
  console.log(`   q chat            <- SENZA --agent, e da qui dentro`);
  console.log(`                        lanciarlo dal repository caricherebbe le regole`);
  console.log(`                        da solo, e il confronto non varrebbe piu' niente\n`);
  console.log(`   ...poi, tornato nel repository:`);
  console.log(`   npm run benchmark -- --label senza-regole --root ${ARENA}\n`);
}

main();
