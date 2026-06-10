---
status: partial
phase: 03-scenario-importer
source: [03-VERIFICATION.md]
started: 2026-06-10T09:45:00Z
updated: 2026-06-10T09:45:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Demo con file .txt reale del team QA Boots
expected: Lo script accetta file .txt con formati Gherkin reali del team QA (encoding UTF-8, varianti keyword, caratteri speciali) e produce file .feature validi senza crash
result: [pending]

### 2. Re-run idempotente confermato
expected: Rieseguendo `npx ts-node scripts/import-scenarios.ts --input test-fixtures/sample-import.txt --app app-a --area checkout` su file già esistenti: warning "file .feature già esiste, skip", nessuna sovrascrittura, skeleton in append senza duplicati
result: [pending]

## Summary

total: 2
passed: 0
issues: 0
pending: 2
skipped: 0
blocked: 0

## Gaps
