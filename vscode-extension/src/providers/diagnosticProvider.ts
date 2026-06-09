import * as vscode from "vscode";
import { CatalogLoader } from "../catalog";

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

export class StepDiagnosticProvider {
  private readonly collection: vscode.DiagnosticCollection;
  private compiledSteps: RegExp[] = [];

  constructor(private readonly loader: CatalogLoader) {
    this.collection = vscode.languages.createDiagnosticCollection("bdd-step-catalog");
    loader.onDidChange((catalog) => {
      this.compiledSteps = (catalog?.steps ?? []).map((s) => cucumberExprToRegex(s.expression));
      for (const doc of vscode.workspace.textDocuments) {
        if (doc.languageId === "gherkin") this.validate(doc);
      }
    });
  }

  register(context: vscode.ExtensionContext): void {
    context.subscriptions.push(this.collection);
    context.subscriptions.push(
      vscode.workspace.onDidOpenTextDocument((doc) => {
        if (doc.languageId === "gherkin") this.validate(doc);
      }),
      vscode.workspace.onDidChangeTextDocument((e) => {
        if (e.document.languageId === "gherkin") this.validate(e.document);
      }),
      vscode.workspace.onDidCloseTextDocument((doc) => {
        this.collection.delete(doc.uri);
      })
    );
    for (const doc of vscode.workspace.textDocuments) {
      if (doc.languageId === "gherkin") this.validate(doc);
    }
  }

  private validate(document: vscode.TextDocument): void {
    if (this.compiledSteps.length === 0) {
      this.collection.delete(document.uri);
      return;
    }
    const diagnostics: vscode.Diagnostic[] = [];
    for (let i = 0; i < document.lineCount; i++) {
      const line = document.lineAt(i).text;
      const m = STEP_LINE_RE.exec(line);
      if (!m) continue;
      const stepText = m[2].trim();
      if (!stepText) continue;
      const matched = this.compiledSteps.some((r) => r.test(stepText));
      if (!matched) {
        const range = new vscode.Range(i, 0, i, line.length);
        const diag = new vscode.Diagnostic(
          range,
          `Step non nel catalog: "${stepText}". Controlla STEP_CATALOG.md o chiedi a Steve.`,
          vscode.DiagnosticSeverity.Warning
        );
        diag.source = "bdd-step-catalog";
        diagnostics.push(diag);
      }
    }
    this.collection.set(document.uri, diagnostics);
  }

  initializeSteps(steps: { expression: string }[]): void {
    this.compiledSteps = steps.map((s) => cucumberExprToRegex(s.expression));
  }
}
