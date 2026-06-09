---
status: partial
phase: 02-catalog-pipeline-upgrade
source: [02-VERIFICATION.md]
started: 2026-06-09T22:30:00Z
updated: 2026-06-09T22:30:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. npm run catalog exit 0

Dalla root del progetto eseguire `npm run catalog`.
expected: Exit 0; output mostra "Catalogo estratto: 11 step (11 documentati, 0 senza @intent)"; step-catalog.json e STEP_CATALOG.md rigenerati con contenuti attesi (11 step, badge 🔧 visibile, breakdown header)
result: [pending]

### 2. npm run test:dry e npm test exit 0

Eseguire `npm run test:dry` poi `npm test`.
expected: test:dry exit 0 (5 scenari, 18 step, 0 undefined); npm test exit 0 (lo step @wanted "I search for the product {string}" non è invocato da nessun .feature e non causa fallimenti)
result: [pending]

### 3. tsc --noEmit dell'extension exit 0

Eseguire `cd vscode-extension && npx tsc --noEmit`.
expected: Exit 0, nessun errore di tipo TypeScript; i consumer esistenti (CompletionProvider, FsLoader, DiagnosticProvider, HoverProvider, TreeProvider) compilano senza modifiche
result: [pending]

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps
