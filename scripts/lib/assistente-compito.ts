/**
 * lib/assistente-compito.ts
 * -------------------------
 * Il **compito** per chi propone frasi del catalogo (le regole oggi, un assistente
 * domani): per ogni passo di uno scenario appena generato, la frase del tester e i
 * candidati di catalogo gia' calcolati dal generatore. Funzione pura: si scrive su
 * disco altrove (il manifesto della generazione).
 *
 * COSA ENTRA, E COSA NON PUO' ENTRARE PER COSTRUZIONE
 * Entrano: il numero d'ordine, la parola chiave, l'etichetta del tester, i
 * candidati (testo del catalogo, classe, stato, se hanno parametri). Questa
 * funzione non riceve le registrazioni, e nemmeno legge `intent.steps`,
 * `assertions` o `notes`: i valori digitati, gli indirizzi, le note, i testi delle
 * verifiche e i nomi dei componenti non possono finire nel compito perche'
 * il codice non li tocca. E' una difesa piu' forte di un filtro. (Spec
 * dell'assistente nel cruscotto, sezione 1: "Il perimetro dei dati".)
 *
 * Due compiti costruiti dallo stesso scenario e dallo stesso catalogo sono uguali
 * byte per byte: l'id viene dal momento della generazione e dall'impronta, non da
 * un orologio o da un caso.
 */

import { createHash } from "crypto";
import { phraseOf } from "./generate-emit";
import type { CatalogStep, ResolvedIntent } from "./generation-contract";

export type ClasseCandidato = "stessi-componenti" | "formulazione-simile";

export interface CandidatoCompito {
  voce: string;
  classe: ClasseCandidato;
  stato: "wanted" | "implemented" | "deprecated";
  parametri: boolean;
  somiglianza?: number;
}

export interface PassoCompito {
  n: number;
  parola: "Given" | "When" | "Then" | "And" | "But";
  etichetta: string;
  anche: number[];
  candidati: CandidatoCompito[];
}

/** Stessa forma di `Compito` in `web-ui/src/lib/suggerimenti-contratto.ts`, che la valida a runtime. */
export interface CompitoGrezzo {
  schema: 1;
  id: string;
  funzione: "frasi";
  sorgente: "registrazione";
  variante: "A";
  catalogo: { impronta: string; voci: number };
  passi: PassoCompito[];
}

export interface IngressoCompito {
  intents: readonly ResolvedIntent[];
  catalog: readonly CatalogStep[];
  /** Quando e' stata fatta la generazione (ISO): da qui l'id, perche' sia ripetibile. */
  generatedAt: string;
  /** Lo scenario comincia con "Given the user is logged in": il primo passo e' un `And`. */
  accessoInTesta?: boolean;
}

function statoDi(c: CatalogStep): CandidatoCompito["stato"] {
  // Uno stato che non conosciamo non si presenta come applicabile.
  return c.status === "wanted" || c.status === "implemented" ? c.status : "deprecated";
}

function conParametri(c: CatalogStep): boolean {
  return (c.parameters?.length ?? 0) > 0 || /\{[a-zA-Z]+\}/.test(c.expression);
}

/** AAAAMMGG-HHMMSS in UTC, dal momento della generazione. */
function marcaTempo(iso: string): string {
  const d = new Date(iso);
  const t = Number.isNaN(d.getTime()) ? new Date(0) : d;
  return t.toISOString().replace(/[-:]/g, "").replace("T", "-").slice(0, 15);
}

export function costruisciCompito(ingresso: IngressoCompito): CompitoGrezzo {
  const passi: PassoCompito[] = [];
  const perFrase = new Map<string, PassoCompito>();

  ingresso.intents.forEach((intent, i) => {
    const etichetta = phraseOf(intent);
    const n = i + 1;
    const gia = perFrase.get(etichetta);
    if (gia) {
      gia.anche.push(n);
      return;
    }
    const parola = i === 0 ? (ingresso.accessoInTesta ? "And" : "Given") : "When";
    const candidati: CandidatoCompito[] = intent.candidates.map((c, k) => {
      const prova = intent.candidateEvidence?.[k];
      const classe: ClasseCandidato = prova?.classe ?? "formulazione-simile";
      return {
        voce: c.expression,
        classe,
        stato: statoDi(c),
        parametri: conParametri(c),
        ...(classe === "formulazione-simile" && prova ? { somiglianza: Math.round(prova.similarity * 100) } : {}),
      };
    });
    const passo: PassoCompito = { n, parola, etichetta, anche: [], candidati };
    perFrase.set(etichetta, passo);
    passi.push(passo);
  });

  const voci = ingresso.catalog.map((c) => [c.expression, c.status ?? null]).sort((a, b) => (String(a[0]) < String(b[0]) ? -1 : String(a[0]) > String(b[0]) ? 1 : 0));
  const impronta =
    "sha256:" + createHash("sha256").update(JSON.stringify({ voci, passi })).digest("hex");

  return {
    schema: 1,
    id: `${marcaTempo(ingresso.generatedAt)}-${impronta.slice("sha256:".length, "sha256:".length + 4)}`,
    funzione: "frasi",
    sorgente: "registrazione",
    variante: "A",
    catalogo: { impronta, voci: ingresso.catalog.length },
    passi,
  };
}
