# BDD Automation — Web UI

Portale di authoring Gherkin per il team QA. Next.js 15 App Router + Shadcn/ui + Tailwind v4.

## Avvio rapido

> **IMPORTANTE:** `npm run dev` deve essere eseguito dalla directory `web-ui/`, non dalla root del repository.
> Le API route usano `process.cwd()` per risolvere i path dei file del repo.
> Se lanci da fuori `web-ui/`, `step-catalog.json` e `src/features/` non verranno trovati.

```bash
# dalla root del repo:
cd web-ui
npm run dev
```

Poi apri [http://localhost:3000](http://localhost:3000).

## Pagine

| URL | Descrizione |
|-----|-------------|
| `/` | Step Catalog — esplora e filtra gli step |
| `/editor` | Gherkin Editor — scrivi scenari con autocomplete |
| `/features` | Feature Catalog — lista dei `.feature` file nel repo |

## API Routes

| Method | Path | Descrizione |
|--------|------|-------------|
| GET | `/api/catalog` | Restituisce `step-catalog.json` dalla root del repo |
| GET | `/api/features` | Lista i `.feature` file in `src/features/` |
| POST | `/api/import` | (stub — plan 03) Esegue `import-scenarios.ts` |
| GET | `/api/download` | (stub — plan 04) Scarica un file `.feature` |

## Test

```bash
# dalla directory web-ui/
npm test
```

## Stack

- Next.js 15 App Router (TypeScript)
- Shadcn/ui + Tailwind CSS v4
- Vitest (unit test)
