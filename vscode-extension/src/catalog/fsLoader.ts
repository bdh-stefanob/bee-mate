import * as vscode from "vscode";
import * as path from "path";
import { Catalog, CatalogLoader } from "./types";

/**
 * Legge step-catalog.json dal workspace root.
 * Watcha il file: ad ogni write (es. dopo `npm run catalog`) emette onDidChange.
 */
export class FsLoader implements CatalogLoader {
  private cached: Catalog | null = null;
  private readonly emitter = new vscode.EventEmitter<Catalog | null>();
  private watcher?: vscode.FileSystemWatcher;

  constructor(private readonly catalogRelPath: string) {}

  async load(): Promise<Catalog | null> {
    if (this.cached) return this.cached;
    return this.reload();
  }

  async reload(): Promise<Catalog | null> {
    const uri = this.resolveCatalogUri();
    if (!uri) {
      this.cached = null;
      this.emitter.fire(null);
      return null;
    }

    // Distinguiamo i tre casi: file assente (primo avvio / progetto nuovo),
    // file corrotto (errore vero), catalog valido ma vuoto (zero step).
    let bytes: Uint8Array;
    try {
      bytes = await vscode.workspace.fs.readFile(uri);
    } catch {
      // Silenzioso: e' normale che il catalog non esista finche' qualcuno
      // non scrive il primo step e lancia `npm run catalog`. Non spammiamo.
      this.cached = this.emptyCatalog();
      this.emitter.fire(this.cached);
      return this.cached;
    }

    try {
      const text = Buffer.from(bytes).toString("utf-8");
      const parsed = JSON.parse(text) as Catalog;
      // Difensivo: se manca .steps, lo trattiamo come catalog vuoto, non errore.
      if (!Array.isArray(parsed.steps)) {
        this.cached = this.emptyCatalog();
        this.emitter.fire(this.cached);
        return this.cached;
      }
      this.cached = parsed;
      this.emitter.fire(parsed);
      return parsed;
    } catch (err) {
      // Questo si', e' un errore vero (JSON corrotto). Notifichiamo.
      vscode.window.showWarningMessage(
        `Step Catalog: ${this.catalogRelPath} corrotto (${
          (err as Error).message
        }). Rigenera con 'npm run catalog'.`
      );
      this.cached = this.emptyCatalog();
      this.emitter.fire(this.cached);
      return this.cached;
    }
  }

  /**
   * Catalog "vuoto ma valido": semantica chiara per i consumer (CompletionProvider,
   * commands) che possono trattarlo come "nessuno step disponibile" senza
   * dover gestire anche il caso null.
   */
  private emptyCatalog(): Catalog {
    return {
      generatedAt: new Date().toISOString(),
      totalSteps: 0,
      documentedSteps: 0,
      undocumentedSteps: 0,
      steps: [],
    };
  }

  /**
   * Risolve l'URI del catalog cercandolo nel primo workspace folder.
   * Per progetti multi-root prende il primo (caso comune); estensione futura.
   */
  private resolveCatalogUri(): vscode.Uri | undefined {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders || folders.length === 0) return undefined;
    return vscode.Uri.file(
      path.join(folders[0].uri.fsPath, this.catalogRelPath)
    );
  }

  /**
   * Inizializza il watcher. Da chiamare dopo la registrazione delle
   * subscription dell'extension.
   */
  startWatching(context: vscode.ExtensionContext): void {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders || folders.length === 0) return;

    const pattern = new vscode.RelativePattern(folders[0], this.catalogRelPath);
    this.watcher = vscode.workspace.createFileSystemWatcher(pattern);
    const refresh = () => this.reload();
    this.watcher.onDidChange(refresh);
    this.watcher.onDidCreate(refresh);
    this.watcher.onDidDelete(() => {
      this.cached = null;
      this.emitter.fire(null);
    });
    context.subscriptions.push(this.watcher);
  }

  onDidChange(listener: (catalog: Catalog | null) => void): vscode.Disposable {
    return this.emitter.event(listener);
  }

  dispose(): void {
    this.emitter.dispose();
    this.watcher?.dispose();
  }
}
