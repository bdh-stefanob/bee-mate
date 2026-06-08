# Contributing — Step Authoring Standard

This is the anti-noise standard. Read it before writing any step. The goal:
**reusing an existing step must be faster than writing a new one.**

## The six habits

1. **Search before you write.** Check the step catalog (`STEP_CATALOG.md`) for a
   step that already expresses the same intent. If it exists, reuse the exact
   wording. A near-duplicate is worse than no step.
2. **Intent, not mechanics.** `When I place the order`, never
   `When I click "#checkout"`. Selectors live in Page Objects only.
3. **Parameterise instead of duplicating.** One `{string}` parameter beats five
   near-identical steps.
4. **Declarative, not step-by-step.** `Given I am logged in as a "standard" user`
   (one line, reusable), not five click steps copy-pasted everywhere.
5. **One term, one concept.** Pick one noun per entity and keep it. Don't drift
   between "user" / "client" / "account" for the same thing.
6. **Flag missing steps — don't invent phrasings.** If nothing fits, propose ONE
   canonical step to the gatekeeper instead of quietly writing your own variant.

## The four layers (each talks only to the one below)

```
features/  (.feature, Gherkin)        ← what the business does
steps/     (thin glue)                ← maps phrase → action call
actions/   (business intentions)      ← reusable, no selectors
pages/, api/ (mechanics)              ← selectors, endpoints
```

A Gherkin step maps to ONE action. If the UI changes, you fix one Page Object.

## Step documentation (Pyramid Principle)

Every step definition carries a structured comment. `@intent` is mandatory; the
rest only when they add information.

```typescript
/**
 * @intent  <One sentence. Verb first, present tense, active voice. <~15 words.>
 * @param   <name> <What it is and accepted values.>
 * @pre     <What must be true before.>
 * @post    <What is true after.>
 */
```

Writing rules: verb first, present tense, active voice, no UI mechanics, one
term per concept, state don't narrate. The catalog generator reads `@intent` and
publishes it. Steps without `@intent` appear flagged as undocumented — a warning,
not a build failure.

## The step catalog

Generated from code, never written by hand:

```bash
npm run catalog
```

This produces `STEP_CATALOG.md` (and `step-catalog.json`). It runs in CI so it
can never drift from the code. Before writing a step, search it.
