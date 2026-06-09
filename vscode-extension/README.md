# BDD Step Catalog — VS Code extension

Autocomplete deterministico e validazione live degli step Gherkin, alimentati
da `step-catalog.json` (la single source of truth generata da `npm run catalog`
nel repo padre).

> **Niente AI generativa in questa extension.** Le suggerimenti sono lookup
> deterministici sul catalog: se uno step esiste lo proponi, altrimenti no.
> La garanzia anti-rumore vive qui, non nell'LLM.

## Cosa fa (MVP)

- **Completion in `.feature`**: quando scrivi `Given/When/Then/And/But`,
  l'extension propone gli step esistenti dal catalog. I parametri `{string}`,
  `{int}`, ecc. diventano placeholder tabbabili.
- **Comando `Step Catalog: Reload`**: rilegge `step-catalog.json` dopo che
  `npm run catalog` lo ha rigenerato.
- **Comando `Step Catalog: Find step…`**: quickpick globale per cercare e
  inserire uno step.

In arrivo: validazione live (diagnostics), tree view nella sidebar, hover con
`@intent` + file:line, PR opener.

## Sviluppo locale

```powershell
# dalla root del repo
cd vscode-extension
npm install
```

Poi apri la cartella `vscode-extension/` come workspace VS Code separato e
premi **F5**: si apre un "Extension Development Host" con l'estensione
caricata e il repo padre aperto come workspace di test. Apri un `.feature`
e prova l'autocomplete.

## Build del pacchetto installabile

```powershell
npm install -g @vscode/vsce
npm run package
```

Produce `bdd-step-catalog-0.1.0.vsix`. I QA lo installano da VS Code via
**Extensions → … → Install from VSIX…**

## Architettura

```
vscode-extension/
├─ src/
│  ├─ extension.ts                  # activate() / deactivate()
│  ├─ catalog/
│  │  ├─ types.ts                   # CatalogStep, CatalogLoader interface
│  │  ├─ fsLoader.ts                # legge step-catalog.json dal workspace
│  │  └─ index.ts                   # export del loader attivo
│  └─ providers/
│     └─ completionProvider.ts       # CompletionItemProvider
└─ out/                                 # build TS (gitignored)
```

Il `CatalogLoader` e' un'interfaccia: oggi solo `FsLoader` (legge dal
workspace). In azienda si aggiunge `RemoteLoader` (npm package privato, file
share, endpoint HTTP) senza toccare il resto.

## Distribuzione

- **Sviluppo:** F5 (vedi sopra).
- **Locale via VSIX:** `npm run package` → condividi il `.vsix`.
- **Marketplace aziendale:** quando avrai il registry interno, `vsce publish`
  punta li'.
