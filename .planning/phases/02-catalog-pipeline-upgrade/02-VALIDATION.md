---
phase: 2
slug: catalog-pipeline-upgrade
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-09
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | `@cucumber/cucumber` ^10.8.0 + node inline assertions |
| **Config file** | `cucumber.js` (root) |
| **Quick run command** | `npm run test:dry` |
| **Full suite command** | `npm run catalog && npm test` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test:dry`
- **After every plan wave:** Run `npm run catalog && npm run test:dry`
- **Before `/gsd-verify-work`:** Full suite must be green (`npm run catalog && npm test`)
- **Max feedback latency:** ~15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 2-01-01 | 01 | 1 | INFRA-02 | — | N/A | integration | `npm run catalog && node -e "const c=require('./step-catalog.json'); const s=c.steps.find(x=>x.sourceRef.includes('orders')); console.assert(s&&s.app==='app-a'&&s.area==='orders'&&s.domain==='app-a/orders','INFRA-02 failed')"` | ❌ W0 | ⬜ pending |
| 2-01-02 | 01 | 1 | INFRA-03 | — | N/A | integration | `npm run catalog && node -e "const c=require('./step-catalog.json'); const s=c.steps.find(x=>x.status==='wanted'); console.assert(s,'nessuno step wanted trovato')"` | ❌ W0 | ⬜ pending |
| 2-02-01 | 02 | 2 | EXT-01 | — | N/A | type check | `cd vscode-extension && npx tsc --noEmit` | ✅ | ⬜ pending |
| 2-03-01 | 03 | 3 | INFRA-02, INFRA-03 | — | N/A | integration | `npm run catalog && npm test` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Demo `@wanted` step in `src/steps/app-a/orders/orders.steps.ts` — richiesto prima di poter validare INFRA-03
- [ ] Script di verifica JSON inline per INFRA-02 e INFRA-03 (eseguibili come one-liner `node` dopo `npm run catalog`)

*(Nessun framework di test unitario da installare — le verifiche usano node inline su output JSON.)*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Badge `🔧` e `⛔` visibili in STEP_CATALOG.md | INFRA-03 (D-04, D-05, D-06) | Rendering visivo Markdown | Aprire `STEP_CATALOG.md` dopo `npm run catalog` e verificare che lo step `@wanted` demo abbia prefisso `🔧` e che l'header mostri breakdown `(N implemented, 1 wanted, 0 deprecated)` |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
