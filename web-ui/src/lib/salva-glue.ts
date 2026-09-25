import * as fs from 'fs';
import * as path from 'path';
import { ErroreSalvataggio, MARCATORE } from './salva-scenario';

/**
 * Step e Page Object seguono lo scenario che il tester ha salvato.
 *
 * Uno scenario versionato senza la sua glue su un'altra macchina e' "undefined":
 * sembra un test, e non parte. Quindi quando lo scenario lascia
 * `features/generated/`, lasciano la loro cartella anche gli step e le Page
 * Object che usa, e il framework di test UI cresce da solo a ogni
 * registrazione salvata:
 *
 *   steps/<app>/<flusso>/<nome>.steps.ts   uno per scenario, accanto al flusso
 *   pages/<app>/<pagina>.page.ts           uno per pagina, condiviso fra scenari
 *
 * La sorgente, in `pages/generated/`, e' invece divisa per HOST
 * (`pages/generated/<host>/<pagina>.page.ts`): due applicazioni diverse
 * possono registrare una pagina con lo stesso slug ("home", "accedi"), e senza
 * quella sottocartella la seconda registrazione sovrascriveva la Page Object
 * della prima in silenzio. Qui, a valle, quell'informazione non serve piu':
 * il tester ha gia' scelto l'applicazione (`app`), quindi la Page Object
 * salvata resta piatta sotto `pages/<app>/` come prima — l'host e' solo il
 * modo in cui la generazione tiene separati due sorgenti, non un livello che
 * il salvataggio deve propagare.
 *
 * Le regole, ciascuna con il suo caso in `salva-glue.test.ts`:
 *  - una Page Object gia' salvata si riusa se ha tutti i metodi che servono; se
 *    gliene mancano, **cresce**: si aggiungono i metodi e i locator mancanti, e
 *    niente si toglie, perche' altri scenari li chiamano;
 *  - una Page Object modificata a mano (senza marcatore) non si tocca: se le
 *    manca qualcosa ci si ferma e si dice cosa;
 *  - una frase gia' definita da un altro scenario salvato ferma tutto: Cucumber
 *    rifiuterebbe di partire con due definizioni della stessa frase. Oggi la
 *    risposta e' dirlo; riusare la definizione esistente richiede che le
 *    pagine vivano nel World e non nel modulo (vedi il modello degli step);
 *  - una Page Object copiata da `pages/generated/<host>/` sparisce da li' dopo
 *    il salvataggio: altrimenti resterebbe una copia orfana, identica a quella
 *    appena salvata, che la generazione successiva riscriverebbe. Resta solo
 *    se un altro scenario ancora da salvare (un altro file in
 *    `steps/generated/`) la sta ancora usando;
 *  - niente si scrive finche' tutto non e' stato controllato: `pianificaGlue`
 *    legge soltanto, `scriviGlue` scrive.
 */

const REGISTRATI = 'generated';

export interface PaginaSalvata {
  /** Percorso relativo a `src/`. */
  file: string;
  come: 'nuova' | 'riusata' | 'estesa';
}

export interface PianoGlue {
  /** Percorso relativo a `src/` degli step salvati. */
  steps: string;
  pagine: PaginaSalvata[];
  scritture: Array<{ assoluto: string; testo: string }>;
  /** File di `generated/` da rimuovere dopo la scrittura: gli step sempre, le Page Object copiate solo se orfane. */
  daCancellare: string[];
}

function rigeneribile(testo: string): boolean {
  return testo.includes(MARCATORE);
}

/** Le frasi definite in un file di step: il primo argomento di Given/When/Then. */
export function frasiDefinite(testo: string): string[] {
  const frasi: string[] = [];
  const re = /\b(?:Given|When|Then)\(\s*(["'`])((?:\\.|(?!\1).)*)\1/g;
  for (const m of testo.matchAll(re)) frasi.push(m[2].replace(/\\(.)/g, '$1'));
  return frasi;
}

function fileDiStep(dir: string, escludi: string[]): string[] {
  const trovati: string[] = [];
  let voci: fs.Dirent[];
  try {
    voci = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return trovati;
  }
  for (const v of voci) {
    const pieno = path.join(dir, v.name);
    if (v.isDirectory()) {
      if (!escludi.includes(pieno)) trovati.push(...fileDiStep(pieno, escludi));
    } else if (v.name.endsWith('.ts') && !escludi.includes(pieno)) {
      trovati.push(pieno);
    }
  }
  return trovati;
}

/**
 * Un altro scenario ancora da salvare importa la stessa Page Object generata?
 *
 * Si guarda solo `steps/generated/`: gli scenari gia' salvati non importano piu'
 * da li' (l'import e' stato riscritto verso `pages/<app>/...` proprio da questa
 * funzione), quindi non possono tenere in vita una sorgente che altrimenti
 * sarebbe orfana.
 */
function ancoraUsataAltrove(radiceSrc: string, modulo: string, escludiSteps: string): boolean {
  const cartellaRegistrati = path.join(radiceSrc, 'steps', REGISTRATI);
  for (const f of fileDiStep(cartellaRegistrati, [escludiSteps])) {
    if (!f.endsWith('.steps.ts')) continue;
    const testo = fs.readFileSync(f, 'utf-8');
    if (testo.includes(`from "../../pages/generated/${modulo}"`)) return true;
  }
  return false;
}

/** Il blocco di un metodo, con il commento che lo precede, fino alla sua graffa di chiusura. */
function bloccoMetodo(testo: string, metodo: string): string | null {
  const righe = testo.split('\n');
  const inizio = righe.findIndex((r) => r.startsWith(`  async ${metodo}(`));
  if (inizio < 0) return null;
  let da = inizio;
  if (righe[inizio - 1]?.trim() === '*/') {
    while (da > 0 && !righe[da - 1].trim().startsWith('/**')) da--;
    da--;
  }
  const fine = righe.findIndex((r, i) => i > inizio && r === '  }');
  if (fine < 0) return null;
  return righe.slice(da, fine + 1).join('\n');
}

/** I metodi che gli step chiamano su una pagina, fra quelli che quella pagina definisce. */
function metodiUsati(steps: string, classe: string, sorgentePagina: string): string[] {
  const variabili = [...steps.matchAll(new RegExp(`^let (\\w+): ${classe};`, 'gm'))].map((m) => m[1]);
  const usati = new Set<string>();
  for (const v of variabili) {
    for (const m of steps.matchAll(new RegExp(`\\b${v}\\.(\\w+)\\(`, 'g'))) usati.add(m[1]);
  }
  // `navigate` e gli altri metodi di BasePage non stanno nella pagina: non si copiano.
  return [...usati].filter((m) => sorgentePagina.includes(`  async ${m}(`)).sort();
}

/** Aggiunge a una pagina salvata i metodi (e i loro locator) che le mancano. */
function estendi(destinazione: string, sorgente: string, mancanti: string[]): string {
  const righe = destinazione.split('\n');
  const nuoviLocator: string[] = [];
  const nuoviMetodi: string[] = [];
  for (const m of mancanti) {
    const blocco = bloccoMetodo(sorgente, m);
    if (!blocco) continue;
    nuoviMetodi.push(blocco);
    for (const l of blocco.matchAll(/this\.(\w+)\./g)) {
      const nome = l[1];
      if (destinazione.includes(`private readonly ${nome}:`) || nuoviLocator.some((x) => x.includes(`readonly ${nome}:`))) continue;
      const riga = sorgente.split('\n').find((r) => r.includes(`private readonly ${nome}:`));
      if (riga) nuoviLocator.push(riga);
    }
  }
  const iRiconoscimento = righe.findIndex((r) => r.includes('// ─── Riconoscimento'));
  if (nuoviLocator.length) {
    // Prima della riga vuota che precede "Riconoscimento", in coda ai locator esistenti.
    const dove = iRiconoscimento > 0 && righe[iRiconoscimento - 1].trim() === '' ? iRiconoscimento - 1 : Math.max(iRiconoscimento, 0);
    righe.splice(dove, 0, ...nuoviLocator);
  }
  let chiusa = righe.length - 1;
  while (chiusa > 0 && righe[chiusa].trim() !== '}') chiusa--;
  righe.splice(chiusa, 0, '', ...nuoviMetodi.join('\n\n').split('\n'));
  return righe.join('\n');
}

export function pianificaGlue(
  radiceSrc: string,
  stepsRel: string,
  app: string,
  flusso: string,
  nome: string
): PianoGlue {
  const cartellaRegistrati = path.join(radiceSrc, 'steps', REGISTRATI);
  const stepsAssoluto = path.resolve(radiceSrc, stepsRel);
  if (
    stepsRel.includes('..') ||
    !stepsAssoluto.startsWith(cartellaRegistrati + path.sep) ||
    !stepsAssoluto.endsWith('.steps.ts')
  ) {
    throw new ErroreSalvataggio('non-registrato', "questi step non vengono da uno scenario registrato");
  }
  if (!fs.existsSync(stepsAssoluto)) throw new ErroreSalvataggio('non-trovato', 'non trovo gli step dello scenario generato');
  const steps = fs.readFileSync(stepsAssoluto, 'utf-8');
  if (!rigeneribile(steps)) throw new ErroreSalvataggio('non-registrato', "questi step non vengono da uno scenario registrato");

  // Dove vanno gli step: accanto al flusso, con lo stesso nome dello scenario.
  // Un file omonimo modificato a mano non si tocca: si scrive accanto.
  const cartellaSteps = path.join(radiceSrc, 'steps', app, flusso);
  let nomeSteps = nome;
  for (let n = 2; ; n++) {
    const candidato = path.join(cartellaSteps, `${nomeSteps}.steps.ts`);
    if (!fs.existsSync(candidato) || rigeneribile(fs.readFileSync(candidato, 'utf-8'))) break;
    if (n > 99) throw new ErroreSalvataggio('troppi', 'troppi file di step con questo nome');
    nomeSteps = `${nome}-${n}`;
  }
  const stepsDestinazione = path.join(cartellaSteps, `${nomeSteps}.steps.ts`);
  const stepsFile = `steps/${app}/${flusso}/${nomeSteps}.steps.ts`;

  // Nessuna frase definita due volte: si guardano gli step gia' salvati, non
  // quelli ancora in generated/ (non versionati, e ognuno col suo scenario) e
  // non il file che si sta per sovrascrivere.
  const nuove = new Set(frasiDefinite(steps));
  const doppie = new Set<string>();
  for (const f of fileDiStep(path.join(radiceSrc, 'steps'), [cartellaRegistrati, stepsDestinazione])) {
    for (const frase of frasiDefinite(fs.readFileSync(f, 'utf-8'))) if (nuove.has(frase)) doppie.add(frase);
  }
  if (doppie.size > 0) {
    throw new ErroreSalvataggio(
      'passo-duplicato',
      'queste frasi sono gia\' definite da un altro scenario salvato',
      [...doppie].sort()
    );
  }

  const scritture: PianoGlue['scritture'] = [];
  const pagine: PaginaSalvata[] = [];
  const aMano: string[] = [];
  const daCancellare: string[] = [stepsAssoluto];
  // Un segmento solo com'era sempre ("accesso.page"), o un host davanti
  // ("esempio.invalid/accesso.page"): la generazione ora divide le pagine per
  // host, ma una registrazione piu' vecchia — o un file scritto a mano nello
  // stesso posto — puo' ancora avere un solo segmento. Si accettano entrambi.
  const importazioni = [
    ...steps.matchAll(/^import \{ (\w+) \} from "\.\.\/\.\.\/pages\/generated\/([\w.-]+(?:\/[\w.-]+)?)";$/gm),
  ];
  // (modulo completo, con l'eventuale host) -> nome semplice, quello con cui la
  // pagina vive sotto `pages/<app>/`. Serve dopo, per riscrivere l'import negli
  // step senza lasciarci dentro l'host.
  const nomiSemplici = new Map<string, string>();

  for (const [, classe, modulo] of importazioni) {
    const nomeModulo = modulo.split('/').pop()!;
    nomiSemplici.set(modulo, nomeModulo);
    const sorgenteAssoluta = path.join(radiceSrc, 'pages', REGISTRATI, `${modulo}.ts`);
    if (!fs.existsSync(sorgenteAssoluta)) throw new ErroreSalvataggio('non-trovato', `non trovo la pagina ${classe}`);
    const sorgente = fs.readFileSync(sorgenteAssoluta, 'utf-8');
    const file = `pages/${app}/${nomeModulo}.ts`;
    const destinazioneAssoluta = path.join(radiceSrc, file);

    // La sorgente e' stata copiata: se nessun altro scenario ancora da salvare
    // la sta ancora usando, sparisce da `generated/` invece di restare li' come
    // copia orfana che la prossima generazione riscriverebbe.
    if (!ancoraUsataAltrove(radiceSrc, modulo, stepsAssoluto)) daCancellare.push(sorgenteAssoluta);

    if (!fs.existsSync(destinazioneAssoluta)) {
      scritture.push({
        assoluto: destinazioneAssoluta,
        // La sorgente, sotto un host, e' un livello piu' in fondo di dove va a
        // finire: la sua import di BasePage lo riflette ("../../../...") e va
        // riportata al livello piatto di `pages/<app>/` ("../../..."). Se la
        // sorgente non aveva host (un file di prima, o scritto a mano), la
        // sostituzione non trova niente e non cambia nulla.
        testo: sorgente
          .replace(/^\/\/ src\/pages\/generated\/\S+$/m, `// src/pages/${app}/${nomeModulo}.ts`)
          .replace('from "../../../support/base.page"', 'from "../../support/base.page"'),
      });
      pagine.push({ file, come: 'nuova' });
      continue;
    }

    const esistente = fs.readFileSync(destinazioneAssoluta, 'utf-8');
    const mancanti = metodiUsati(steps, classe, sorgente).filter((m) => !esistente.includes(`  async ${m}(`));
    if (mancanti.length === 0) {
      pagine.push({ file, come: 'riusata' });
    } else if (!rigeneribile(esistente)) {
      aMano.push(...mancanti.map((m) => `${classe}.${m}`));
    } else {
      scritture.push({ assoluto: destinazioneAssoluta, testo: estendi(esistente, sorgente, mancanti) });
      pagine.push({ file, come: 'estesa' });
    }
  }
  if (aMano.length > 0) {
    throw new ErroreSalvataggio(
      'pagina-a-mano',
      'una pagina salvata e modificata a mano non ha i metodi che servono a questo scenario',
      aMano
    );
  }

  let stepsTesto = steps
    .replace(/^\/\/ src\/steps\/generated\/\S+$/m, `// src/${stepsFile}`)
    .replaceAll('from "../../support/world"', 'from "../../../support/world"');
  for (const [modulo, nomeModulo] of nomiSemplici) {
    stepsTesto = stepsTesto.replaceAll(
      `from "../../pages/generated/${modulo}"`,
      `from "../../../pages/${app}/${nomeModulo}"`
    );
  }
  scritture.push({ assoluto: stepsDestinazione, testo: stepsTesto });

  return { steps: stepsFile, pagine, scritture, daCancellare };
}

export function scriviGlue(piano: PianoGlue): void {
  for (const s of piano.scritture) {
    fs.mkdirSync(path.dirname(s.assoluto), { recursive: true });
    fs.writeFileSync(s.assoluto, s.testo);
  }
  // Gli step lasciati in generated/ definirebbero le stesse frasi una seconda
  // volta. Le Page Object copiate lascerebbero invece una copia orfana,
  // identica a quella appena salvata, che la prossima generazione riscriverebbe:
  // `pianificaGlue` le ha gia' aggiunte qui solo se nessun altro scenario ancora
  // da salvare le sta ancora usando.
  for (const f of piano.daCancellare) fs.unlinkSync(f);
}
