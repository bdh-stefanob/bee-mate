import type { CatalogStep, StepComponentRef } from '@/lib/types';

/** Catalogo inventato e ripetibile (seme fisso), per i test di equivalenza e di tempo di `individuaCoppie`. */
/** Generatore pseudo-casuale con seme fisso: il catalogo finto e' sempre lo stesso. */
export function generatore(seme: number): () => number {
  let s = seme >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const VERBI = ['click on', 'open', 'select', 'fill in', 'verify', 'close', 'search for', 'confirm'];
const OGGETTI = [
  'the login button',
  'the recharge tab',
  'the user menu',
  'the order list',
  'the sms code',
  'the profile page',
  'the help link',
  'the search box',
];
const APP = ['human-recharge', 'human-recharge', 'human-recharge', 'portale', 'portale', 'common', 'generated'];
const RUOLI = ['button', 'link', 'textbox', 'tab'];
const NOMI = ['Sign in', 'Recharges', 'Orders', 'Help', 'Search', 'Profile'];

export function catalogoFinto(quanti: number, seme = 1): CatalogStep[] {
  const r = generatore(seme);
  const scegli = <T>(v: T[]): T => v[Math.floor(r() * v.length)]!;
  const steps: CatalogStep[] = [];
  for (let i = 0; i < quanti; i++) {
    let espressione = `the user ${scegli(VERBI)} ${scegli(OGGETTI)}`;
    const dado = r();
    if (dado < 0.15) espressione = espressione.replace('the', 'The'); // differisce per una maiuscola
    else if (dado < 0.25) espressione = espressione.replace('click', 'clcik'); // errore di battitura
    else if (dado < 0.35) espressione += ` number ${i % 7}`; // qualche parola in piu'
    else if (dado < 0.45) espressione = `  ${espressione}  `; // spazi attorno
    else if (dado < 0.7) espressione += ` for item ${i}`; // frasi diverse e piu' lunghe
    let components: StepComponentRef[] | undefined;
    const c = r();
    if (c < 0.3) components = undefined;
    else if (c < 0.4) components = [];
    else {
      const n = c < 0.9 ? 1 : 2;
      components = Array.from({ length: n }, () => ({
        page: r() < 0.5 ? 'home' : undefined,
        role: scegli(RUOLI),
        name: scegli(NOMI),
      }));
    }
    steps.push({
      expression: espressione,
      parameters: [],
      app: scegli(APP),
      area: 'x',
      domain: 'x/x',
      status: 'implemented',
      sourceRef: `x.ts:${i}`,
      documented: r() < 0.5,
      components,
    });
  }
  return steps;
}
