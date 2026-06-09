import * as vscode from "vscode";
import { CatalogLoader, CatalogStep } from "../catalog";

const STEP_LINE_RE = /^\s*(Given|When|Then|And|But|\*)\s+(.+)$/i;

function cucumberExprToRegex(expr: string): RegExp {
  const parts = expr.split(/(\{[^}]+\})/);
  const pattern = parts.map((part) => {
    if (part.startsWith("{") && part.endsWith("}")) {
      switch (part.slice(1, -1)) {
        case "string": return '"[^"]*"|\'[^\']*\'';
        case "int":    return "-?\\d+";
        case "float":  return "-?\\d*\\.?\\d+";
        case "word":   return "\\S+";
        default:       return ".+";
      }
    }
    return part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }).join("");
  return new RegExp(`^${pattern}$`, "i");
}

export class StepHoverProvider implements vscode.HoverProvider {
  private compiled: { re: RegExp; step: CatalogStep }[] = [];

  constructor(private readonly loader: CatalogLoader) {
    loader.onDidChange((catalog) => {
      this.compiled = (catalog?.steps ?? []).map((s) => ({
        re: cucumberExprToRegex(s.expression),
        step: s,
      }));
    });
  }

  async provideHover(document: vscode.TextDocument, position: vscode.Position): Promise<vscode.Hover | undefined> {
    const line = document.lineAt(position.line).text;
    const m = STEP_LINE_RE.exec(line);
    if (!m) return undefined;
    const stepText = m[2].trim();
    if (!stepText) return undefined;

    if (this.compiled.length === 0) {
      const catalog = await this.loader.load();
      if (catalog) {
        this.compiled = catalog.steps.map((s) => ({
          re: cucumberExprToRegex(s.expression),
          step: s,
        }));
      }
    }

    const found = this.compiled.find(({ re }) => re.test(stepText));
    if (!found) return undefined;

    const { step } = found;
    const md = new vscode.MarkdownString(undefined, true);
    md.supportHtml = false;

    if (step.doc.intent) {
      md.appendMarkdown(`**${step.doc.intent}**\n\n`);
    }
    if (step.page) {
      md.appendMarkdown(`Page Object: \`${step.page}\`\n\n`);
    }
    const paramEntries = Object.entries(step.doc.params ?? {});
    if (paramEntries.length > 0) {
      md.appendMarkdown(`**Parameters:**\n`);
      for (const [name, desc] of paramEntries) {
        md.appendMarkdown(`- \`${name}\` — ${desc}\n`);
      }
      md.appendMarkdown(`\n`);
    }
    if (step.doc.pre)  md.appendMarkdown(`**Pre:** ${step.doc.pre}\n\n`);
    if (step.doc.post) md.appendMarkdown(`**Post:** ${step.doc.post}\n\n`);
    md.appendMarkdown(`---\n`);
    md.appendMarkdown(`\`${step.sourceRef}\` · domain: \`${step.domain}\``);

    const range = new vscode.Range(position.line, 0, position.line, line.length);
    return new vscode.Hover(md, range);
  }

  initializeSteps(steps: CatalogStep[]): void {
    this.compiled = steps.map((s) => ({ re: cucumberExprToRegex(s.expression), step: s }));
  }
}
