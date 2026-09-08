/**
 * lib/component-naming.ts
 * -----------------------
 * Da un elemento osservato al **componente**: che tipo e', come si raggiunge,
 * come si chiamera' il metodo di Page Object.
 *
 * PERCHE' STA QUI E NON DENTRO ALLO SCOUT
 * Perche' lo usano in due. Lo scout, che inventaria una pagina intera; e il
 * generatore, quando incontra nella registrazione un elemento che nel dizionario
 * non c'e'. In quel caso il gesto non si butta: si sintetizza il componente
 * dalla registrazione, che role e name ce li ha, e si dichiara che il dizionario
 * andrebbe rifatto.
 *
 * Se le due strade producessero nomi di metodo diversi per lo stesso elemento,
 * un dizionario aggiornato romperebbe il codice generato prima — e il sintomo
 * (metodo inesistente) non assomiglierebbe per niente alla causa. E' la stessa
 * ragione per cui `dom-probe.ts` e' condiviso fra scout e recorder.
 */

import { judge } from "./stability";
import type { Component, Kind } from "./generation-contract";

/** Elemento grezzo: quel poco che serve per decidere nome e locator. */
export interface RawElement {
  role: string;
  name: string;
  href?: string;
  disabled?: boolean;
}

export function kindOf(role: string, href = ""): Kind {
  if (role === "textbox" || role === "searchbox" || role === "spinbutton") return "input";
  if (role === "checkbox" || role === "radio" || role === "switch" || role === "option") return "choice";
  if (role === "link" && href) return "navigation";
  return "action";
}

export function toPascalCase(s: string): string {
  return s
    .replace(/[^a-zA-Z0-9 ]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 5) // nomi lunghi producono metodi illeggibili
    .map((w) => w[0]!.toUpperCase() + w.slice(1).toLowerCase())
    .join("");
}

/**
 * Prima lettera minuscola: serve ai nomi di campo, non ai nomi di metodo.
 *
 * Il prefisso davanti alle cifre non e' pedanteria. Un badge di carrello si
 * chiama "1", e `1Button` non e' un identificatore TypeScript valido: il file
 * generato non compilerebbe. Sui nomi di metodo il problema non si pone, perche'
 * li' la cifra non e' mai la prima lettera (`click1`).
 */
export function toCamelCase(s: string): string {
  const p = toPascalCase(s);
  if (!p) return "";
  const camel = p[0]!.toLowerCase() + p.slice(1);
  return /^\d/.test(camel) ? `el${p}` : camel;
}

export function methodName(kind: Kind, name: string): string {
  const base = toPascalCase(name) || "Unnamed";
  if (kind === "input") return `fill${base}`;
  if (kind === "choice") return `set${base}`;
  if (kind === "navigation") return `goTo${base}`;
  return `click${base}`;
}

/**
 * Nome del campo privato che tiene il locator.
 *
 * Il suffisso per tipo non e' decorazione: senza, un pulsante "Password" e un
 * campo "Password" sulla stessa pagina genererebbero due campi omonimi, e il
 * secondo vincerebbe in silenzio.
 */
export function fieldName(kind: Kind, name: string): string {
  const base = toCamelCase(name) || "unnamed";
  if (kind === "input") return `${base}Field`;
  if (kind === "choice") return `${base}Choice`;
  if (kind === "navigation") return `${base}Link`;
  return `${base}Button`;
}

export function escapeForLocator(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

export function toComponent(raw: RawElement, occurrences: number): Component {
  const kind = kindOf(raw.role, raw.href ?? "");
  const { stability, notes } = judge(raw.name, occurrences);

  const base = `getByRole('${raw.role}', { name: '${escapeForLocator(raw.name)}' })`;
  const locator = occurrences > 1 ? `${base}.first()` : base;

  return {
    role: raw.role,
    name: raw.name,
    kind,
    locator,
    method: methodName(kind, raw.name),
    occurrences,
    stability,
    notes,
    ...(raw.href ? { href: raw.href } : {}),
    ...(raw.disabled ? { disabled: true } : {}),
  };
}
