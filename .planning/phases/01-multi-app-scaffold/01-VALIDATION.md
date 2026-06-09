---
phase: 1
slug: multi-app-scaffold
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-09
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | `@cucumber/cucumber` ^10.8.0 + `typescript` ^5.5.0 |
| **Config file** | `cucumber.js` (root) |
| **Quick run command** | `npx tsc --noEmit` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~5s (tsc) / ~60s (npm test) |

---

## Sampling Rate

- **After every task commit:** Run `npx tsc --noEmit`
- **After every plan wave:** Run `npm test` + `npm run catalog`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 1-01-01 | 01-01 | 1 | INFRA-01 | T-01-01 | N/A (file-system refactor) | compile + integration | `npx tsc --noEmit && npm test` | ✅ | ⬜ pending |
| 1-01-02 | 01-01 | 1 | INFRA-01 | T-01-01 | N/A | integration | `npm run catalog` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements.

*Nessun nuovo test file richiesto — questa phase è un refactor strutturale verificabile con gli strumenti già presenti (`tsc`, `npm test`, `npm run catalog`).*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Directory structure `src/<layer>/app-a/<area>/` presente | INFRA-01 sc1 | Verifica file system | `dir src/features/app-a`, `dir src/steps/app-a`, `dir src/actions/app-a`, `dir src/pages/app-a` |
| Nessun path legacy nel repository | INFRA-01 sc4 | Grep negativo | `grep -r "src/steps/auth" src/` deve restituire 0 risultati |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
