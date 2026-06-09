import * as vscode from "vscode";
import { CatalogLoader, CatalogStep } from "../catalog";

export class StepCatalogTreeProvider implements vscode.TreeDataProvider<TreeNode> {
  private readonly _onDidChangeTreeData = new vscode.EventEmitter<TreeNode | undefined | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private domains: Map<string, CatalogStep[]> = new Map();

  constructor(private readonly loader: CatalogLoader) {
    loader.onDidChange((catalog) => {
      this.rebuild(catalog?.steps ?? []);
      this._onDidChangeTreeData.fire();
    });
  }

  private rebuild(steps: CatalogStep[]): void {
    this.domains = new Map();
    for (const step of steps) {
      const key = step.domain;
      if (!this.domains.has(key)) this.domains.set(key, []);
      this.domains.get(key)!.push(step);
    }
  }

  async refresh(): Promise<void> {
    const catalog = await this.loader.load();
    this.rebuild(catalog?.steps ?? []);
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: TreeNode): vscode.TreeItem {
    return element.toTreeItem();
  }

  async getChildren(element?: TreeNode): Promise<TreeNode[]> {
    if (!element) {
      if (this.domains.size === 0) {
        const catalog = await this.loader.load();
        this.rebuild(catalog?.steps ?? []);
      }
      return Array.from(this.domains.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([domain, steps]) => new DomainNode(domain, steps));
    }
    if (element instanceof DomainNode) {
      return element.steps
        .sort((a, b) => a.expression.localeCompare(b.expression))
        .map((s) => new StepNode(s));
    }
    return [];
  }
}

type TreeNode = DomainNode | StepNode;

// Palette ciclica per i domain — stabile rispetto all'ordinamento alfabetico.
const DOMAIN_PALETTE = [
  "charts.blue",
  "charts.orange",
  "charts.green",
  "charts.purple",
  "charts.yellow",
  "charts.red",
];

const domainColorCache = new Map<string, string>();
let domainColorIdx = 0;

function domainColor(domain: string): vscode.ThemeColor {
  if (!domainColorCache.has(domain)) {
    domainColorCache.set(
      domain,
      DOMAIN_PALETTE[domainColorIdx++ % DOMAIN_PALETTE.length]!
    );
  }
  return new vscode.ThemeColor(domainColorCache.get(domain)!);
}

class DomainNode {
  constructor(readonly domain: string, readonly steps: CatalogStep[]) {}
  toTreeItem(): vscode.TreeItem {
    const documented = this.steps.filter((s) => s.documented).length;
    const item = new vscode.TreeItem(
      `${this.domain}`,
      vscode.TreeItemCollapsibleState.Collapsed
    );
    item.description = `${documented}/${this.steps.length} documented`;
    item.iconPath    = new vscode.ThemeIcon("symbol-namespace", domainColor(this.domain));
    item.contextValue = "domain";
    return item;
  }
}

class StepNode {
  constructor(readonly step: CatalogStep) {}
  toTreeItem(): vscode.TreeItem {
    const item = new vscode.TreeItem(
      this.step.expression,
      vscode.TreeItemCollapsibleState.None
    );
    item.description  = this.step.doc.intent ?? "(non documentato)";
    item.tooltip      = buildTooltip(this.step);
    item.iconPath     = this.step.documented
      ? new vscode.ThemeIcon("symbol-method", new vscode.ThemeColor("charts.green"))
      : new vscode.ThemeIcon("warning", new vscode.ThemeColor("charts.yellow"));
    item.contextValue = "step";
    item.command = {
      command:   "stepCatalog.insertStep",
      title:     "Inserisci step",
      arguments: [this.step],
    };
    return item;
  }
}

function buildTooltip(step: CatalogStep): vscode.MarkdownString {
  const md = new vscode.MarkdownString(undefined, true);
  if (step.doc.intent) md.appendMarkdown(`**${step.doc.intent}**\n\n`);
  if (step.page)       md.appendMarkdown(`Page Object: \`${step.page}\`\n\n`);
  md.appendMarkdown(`\`${step.sourceRef}\``);
  return md;
}
