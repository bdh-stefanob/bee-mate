import * as vscode from "vscode";
import { Catalog, CatalogLoader, CatalogStep } from "../catalog";

/**
 * CompletionItemProvider per file .feature (linguaggio gherkin).
 *
 * Logica:
 *  - Si attiva solo se la riga corrente inizia con una keyword Gherkin
 *    (Given/When/Then/And/But/*).
 *  - Suggerimenti deterministici dal catalog: niente generazione AI,
 *    niente fuzzy matching invasivo. Lookup + filtro VS Code nativo.
 *  - Inserisce uno SnippetString che converte i placeholder
 *    {string}/{int}/{float} in tabstop tabbabili.
 */
export class StepCompletionProvider implements vscode.CompletionItemProvider {
  // Regex permissiva sulla keyword: permette indentazione, tab/space variabili.
  private static readonly STEP_LINE_RE =
    /^\s*(Given|When|Then|And|But|\*)\s+(.*)$/;

  constructor(private readonly loader: CatalogLoader) {}

  async provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position
  ): Promise<vscode.CompletionItem[] | undefined> {
    const linePrefix = document
      .lineAt(position.line)
      .text.substring(0, position.character);

    const match = StepCompletionProvider.STEP_LINE_RE.exec(linePrefix);
    if (!match) return undefined;

    const catalog = await this.loader.load();
    if (!catalog || catalog.steps.length === 0) return undefined;

    return catalog.steps.map((step) => this.toCompletionItem(step));
  }

  private toCompletionItem(step: CatalogStep): vscode.CompletionItem {
    // CompletionItemLabel: label = testo principale, description = badge grigio
    // a destra che distingue i nostri step da quelli di altre estensioni.
    const label: vscode.CompletionItemLabel = {
      label:       step.expression,
      description: `BDD Catalog · ${step.domain}`,
    };

    const item = new vscode.CompletionItem(label, vscode.CompletionItemKind.Snippet);

    item.insertText    = new vscode.SnippetString(buildSnippet(step));
    item.detail        = step.doc.intent ?? step.sourceRef;
    item.documentation = buildDocumentation(step);

    // Sort: documentati prima con "0", non-documentati con "1"; poi alfabetico.
    item.sortText  = `${step.documented ? "0" : "1"}_${step.expression}`;
    item.filterText = step.expression;

    return item;
  }
}

/**
 * Converte 'I am logged in as a {string} user' in
 * 'I am logged in as a "${1:role}" user' usando i nomi @param se presenti.
 */
export function buildSnippet(step: CatalogStep): string {
  const paramNames = Object.keys(step.doc.params ?? {});
  let idx = 0;
  return step.expression.replace(/\{([^}]+)\}/g, (_match, type: string) => {
    idx++;
    const placeholderName = paramNames[idx - 1] ?? `value${idx}`;
    const cleanType = type.trim().toLowerCase();

    if (cleanType === "string") {
      return `"\${${idx}:${placeholderName}}"`;
    }
    if (cleanType === "int" || cleanType === "biginteger") {
      return `\${${idx}:0}`;
    }
    if (cleanType === "float" || cleanType === "double") {
      return `\${${idx}:0.0}`;
    }
    // Tipo custom o sconosciuto: placeholder nominato neutrale.
    return `\${${idx}:${placeholderName}}`;
  });
}

function buildDocumentation(step: CatalogStep): vscode.MarkdownString {
  const md = new vscode.MarkdownString(undefined, true);
  md.supportHtml = false;

  if (step.doc.intent) {
    md.appendMarkdown(`${step.doc.intent}\n\n`);
  } else {
    md.appendMarkdown(`_Step non documentato (@intent mancante)._\n\n`);
  }

  const paramEntries = Object.entries(step.doc.params ?? {});
  if (paramEntries.length > 0) {
    md.appendMarkdown(`**Parameters:**\n\n`);
    for (const [name, desc] of paramEntries) {
      md.appendMarkdown(`- \`${name}\` — ${desc}\n`);
    }
    md.appendMarkdown(`\n`);
  }

  if (step.doc.pre) md.appendMarkdown(`**Pre:** ${step.doc.pre}\n\n`);
  if (step.doc.post) md.appendMarkdown(`**Post:** ${step.doc.post}\n\n`);

  md.appendMarkdown(`---\n`);
  md.appendMarkdown(`Domain: \`${step.domain}\` · Source: \`${step.sourceRef}\``);

  return md;
}
