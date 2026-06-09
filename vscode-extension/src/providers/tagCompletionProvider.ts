import * as vscode from "vscode";

const TAG_OPTIONS = [
  { value: "@ticket:",    detail: "Es. @ticket:BOOT-123 — collega lo scenario alla user story" },
  { value: "@regression", detail: "Include nella suite di regressione"                         },
  { value: "@smoke",      detail: "Smoke test — eseguito ad ogni build"                        },
  { value: "@sanity",     detail: "Sanity post-deploy"                                         },
  { value: "@wip",        detail: "Work in progress — escluso dal CI"                          },
];

export class TagCompletionProvider implements vscode.CompletionItemProvider {
  provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.CompletionItem[] | undefined {
    const lineText = document.lineAt(position.line).text;
    const trimmed  = lineText.trimStart();
    if (!trimmed.startsWith("@")) return undefined;

    const indent = lineText.length - trimmed.length;
    const tagSoFar = trimmed;
    const replaceRange = new vscode.Range(
      position.line, indent,
      position.line, position.character
    );

    return TAG_OPTIONS
      .filter((t) => t.value.startsWith(tagSoFar.split(" ")[0]))
      .map((t) => {
        const item = new vscode.CompletionItem(t.value, vscode.CompletionItemKind.Keyword);
        item.detail      = t.detail;
        item.insertText  = t.value;
        item.range       = replaceRange;
        item.sortText    = `0_${t.value}`;
        return item;
      });
  }
}
