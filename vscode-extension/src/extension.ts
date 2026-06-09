import * as vscode from "vscode";
import { FsLoader } from "./catalog";
import { StepCompletionProvider, buildSnippet } from "./providers/completionProvider";
import { StepDiagnosticProvider }  from "./providers/diagnosticProvider";
import { StepHoverProvider }       from "./providers/hoverProvider";
import { StepCatalogTreeProvider } from "./providers/treeProvider";
import { TagCompletionProvider }   from "./providers/tagCompletionProvider";
import type { CatalogStep } from "./catalog";

let loader: FsLoader | undefined;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const config = vscode.workspace.getConfiguration("stepCatalog");
  const catalogRelPath = config.get<string>("catalogPath", "step-catalog.json");

  loader = new FsLoader(catalogRelPath);
  loader.startWatching(context);

  // ── Providers ──────────────────────────────────────────────────────────
  const completionProvider  = new StepCompletionProvider(loader);
  const diagnosticProvider  = new StepDiagnosticProvider(loader);
  const hoverProvider       = new StepHoverProvider(loader);
  const treeProvider        = new StepCatalogTreeProvider(loader);
  const tagProvider         = new TagCompletionProvider();

  // ── Registrazioni ──────────────────────────────────────────────────────
  context.subscriptions.push(
    vscode.languages.registerCompletionItemProvider(
      { language: "gherkin", scheme: "file" },
      completionProvider,
      " "
    ),
    vscode.languages.registerCompletionItemProvider(
      { language: "gherkin", scheme: "file" },
      tagProvider,
      "@"
    ),
    vscode.languages.registerHoverProvider(
      { language: "gherkin", scheme: "file" },
      hoverProvider
    )
  );

  diagnosticProvider.register(context);

  // Sidebar Tree View
  const treeView = vscode.window.createTreeView("stepCatalogTree", {
    treeDataProvider: treeProvider,
    showCollapseAll: true,
  });
  context.subscriptions.push(treeView);

  // ── Comandi ────────────────────────────────────────────────────────────
  context.subscriptions.push(
    vscode.commands.registerCommand("stepCatalog.reload", async () => {
      const c = await loader!.reload();
      if (c) {
        vscode.window.showInformationMessage(
          `Step Catalog ricaricato: ${c.totalSteps} step (${c.documentedSteps} documentati).`
        );
        treeProvider.refresh();
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("stepCatalog.find", async () => {
      const catalog = await loader!.load();
      if (!catalog || catalog.steps.length === 0) {
        const choice = await vscode.window.showInformationMessage(
          "Step Catalog vuoto. Come vuoi popolarlo?",
          "Genera dal codice (npm run catalog)",
          "Importa da .feature esistenti (in arrivo)",
          "Annulla"
        );
        if (choice === "Genera dal codice (npm run catalog)") {
          const terminal = vscode.window.createTerminal("step-catalog");
          terminal.show();
          terminal.sendText("npm run catalog");
        } else if (choice?.startsWith("Importa")) {
          vscode.window.showInformationMessage(
            "Harvest da .feature esistenti: feature pianificata (ROADMAP 5.7)."
          );
        }
        return;
      }
      const items = catalog.steps.map((s) => ({
        label: s.expression,
        description: s.domain,
        detail: s.doc.intent ?? s.sourceRef,
        step: s,
      }));
      const picked = await vscode.window.showQuickPick(items, {
        matchOnDescription: true,
        matchOnDetail: true,
        placeHolder: "Cerca uno step nel catalog…",
      });
      if (!picked) return;
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showInformationMessage("Apri un file .feature per inserire lo step.");
        return;
      }
      await editor.insertSnippet(new vscode.SnippetString(buildSnippet(picked.step)));
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("stepCatalog.insertStep", async (step: CatalogStep) => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showInformationMessage("Apri un file .feature per inserire lo step.");
        return;
      }
      await editor.insertSnippet(new vscode.SnippetString(buildSnippet(step)));
    })
  );

  context.subscriptions.push(
    loader.onDidChange((catalog) => {
      if (catalog) {
        console.log(`[bdd-step-catalog] catalog aggiornato: ${catalog.totalSteps} step`);
      }
    })
  );

  // Inizializza con il catalog corrente
  void loader.reload();
}

export function deactivate(): void {
  loader?.dispose();
}
