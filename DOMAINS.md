# Domains — mappa applicativi, aree, pagine

> Mappa del territorio. Definisce **cosa testiamo** (quali applicativi),
> **come e' organizzato** ciascuno (aree e pagine), **come si chiamano le
> cose** nel codice (naming convention).

---

## 1. Modello concettuale

```
Application ──► Area ──► Page
   (app)      (sezione)   (URL/schermata UI)
     │           │            │
     └─► Features (.feature)  │
           └─► usano Step ────┘
                  └─► chiamano Action
                        └─► usa Page Object (selettori)
```

- **Application**: un applicativo web distinto (URL base diverso, codebase
  diversa lato prodotto).
- **Area**: una macro-sezione funzionale di un'app (es. autenticazione, gestione
  utenti, cassa). Tipicamente corrisponde a un menu principale o a un gruppo
  di pagine correlate.
- **Page**: una singola schermata/URL con il proprio Page Object.

Uno **step** vive in un dominio identificato come `<app>/<area>` (es. `app-a/auth`).
Step trasversali a piu' app vivono in `common/`.

---

## 2. Naming convention

| Item | Convenzione | Esempio |
|---|---|---|
| Application | `kebab-case`, placeholder finche' non rinominato dal team | `app-a`, `app-b` |
| Area | `kebab-case`, singolare o concetto | `auth`, `booking`, `dashboard` |
| Page | `kebab-case` + suffisso `.page.ts` | `login.page.ts`, `product-detail.page.ts` |
| Page class | `PascalCase` + suffisso `Page` | `LoginPage`, `ProductDetailPage` |
| Action file | `<area>.actions.ts` | `auth.actions.ts` |
| Step file | `<area>.steps.ts` | `auth.steps.ts` |
| Feature file | `<flow>.feature` (kebab-case) | `login.feature`, `place-order.feature` |
| Domain nel catalog | `<app>/<area>` o `<app>` o `common` | `app-a/auth`, `common` |

**Regola d'oro**: nessun nome di sistema reale dell'azienda. Usa i placeholder
`app-a`, `app-b` finche' il team non rinomina (vedi sezione 6).

---

## 3. Struttura filesystem multi-app

```
src/
├─ features/
│  ├─ common/                     # scenari cross-app (rari, di solito non esistono)
│  ├─ app-a/
│  │  ├─ auth/
│  │  │  └─ login.feature
│  │  └─ orders/
│  │     └─ place-order.feature
│  └─ app-b/
│     └─ <area>/
│        └─ <flow>.feature
│
├─ steps/
│  ├─ common/                     # step cross-app (es. "I accept cookies")
│  │  └─ common.steps.ts
│  ├─ app-a/
│  │  ├─ auth/
│  │  │  └─ auth.steps.ts
│  │  └─ orders/
│  │     └─ orders.steps.ts
│  └─ app-b/
│     └─ <area>/
│        └─ <area>.steps.ts
│
├─ actions/
│  ├─ common/
│  │  └─ common.actions.ts
│  ├─ app-a/
│  │  ├─ auth.actions.ts
│  │  └─ orders.actions.ts
│  └─ app-b/
│     └─ <area>.actions.ts
│
├─ pages/
│  ├─ app-a/
│  │  ├─ login.page.ts
│  │  └─ cart.page.ts
│  └─ app-b/
│     └─ <page>.page.ts
│
├─ api/                           # client REST (opzionale, per setup test-data)
│  ├─ app-a/
│  └─ app-b/
│
├─ fixtures/                      # test-data builders, cross-app
└─ support/                       # World + hooks, cross-app
```

Note:
- `pages/` ha **solo** la suddivisione per app (non per area): tipicamente una
  pagina e' specifica di un'app, ma puo' essere riusata da piu' aree della
  stessa app.
- `actions/` segue le aree per leggibilita', ma e' una decisione di repo: se
  un'azione e' davvero cross-area dentro la stessa app, puo' restare in
  `actions/<app>/<app>.actions.ts`.
- `common/` esiste solo dove ha senso (steps, actions). Se vuoto, non c'e'
  la cartella.

---

## 4. Stato attuale (transizione in corso)

Allo stato attuale (giugno 2026) il repo ha ancora la **struttura mono-app
demo**:

```
src/
├─ features/{auth,orders}/...feature
├─ steps/{auth,common,orders}/...steps.ts
├─ actions/...actions.ts          # non ancora per-app
└─ pages/...page.ts                # non ancora per-app
```

La transizione a multi-app verra' fatta come **refactor pianificato** (vedi
ROADMAP §X.X — nuovo task da aggiungere). Step di transizione:

1. Spostare i contenuti attuali sotto `app-a/`:
   - `features/auth/` → `features/app-a/auth/`
   - `features/orders/` → `features/app-a/orders/`
   - `steps/auth/` → `steps/app-a/auth/`
   - `steps/orders/` → `steps/app-a/orders/`
   - `pages/*.page.ts` → `pages/app-a/`
   - `actions/*.actions.ts` → `actions/app-a/`
2. Aggiornare i `paths` in `tsconfig.json` se servono alias
3. Aggiornare `extract-steps.ts` per riconoscere il pattern `steps/<app>/<area>/`
4. Aggiungere campo `app: string` e `area?: string` nel catalog
5. Verificare: `npm test`, `npm run catalog`, l'extension legge il nuovo schema

---

## 5. Tabella applicativi (TODO team)

| Placeholder | Nome reale (TODO team) | Descrizione tecnica generica |
|---|---|---|
| `app-a` | _da rinominare al kickoff team_ | Web app principale n.1 |
| `app-b` | _da rinominare al kickoff team_ | Web app principale n.2 |
| `app-c` | _eventuale, da aggiungere se nasce_ | Web app aggiuntiva |

> **Quando rinominare**: solo dopo aver migrato il framework in un repo Git
> aziendale (vedi `PROJECT_BRIEF.md` §3 vincolo 5). Sul repo personale i
> placeholder restano.

---

## 6. Tabella aree per app (template)

Replica questa tabella per ogni app quando il team la mappera':

### app-a (esempio)

| Area | Cosa contiene | Pages associate |
|---|---|---|
| `auth` | Login, logout, registrazione, recupero password | `login.page.ts`, `signup.page.ts` |
| `orders` | Carrello, checkout, ordini, storico | `cart.page.ts`, `checkout.page.ts` |
| `<area>` | _da mappare al kickoff_ | _da mappare_ |

### app-b

| Area | Cosa contiene | Pages associate |
|---|---|---|
| `<area>` | _da mappare al kickoff_ | _da mappare_ |

---

## 7. Step cross-app (`common/`)

Hanno senso solo se davvero universali. Esempi:

- `I accept the cookies banner` (lo stesso banner GDPR ovunque)
- `I dismiss the system maintenance notice` (notifica globale)
- `I am on the {string} environment` (parametro ambiente)

**Anti-pattern**: mettere in `common/` step che sono "logicamente simili tra
le app ma con selettori diversi". Quelli vivono in `steps/<app>/`, non in
`common/`, perche' la loro implementazione e' app-specific. La sola somiglianza
testuale non e' un buon motivo per condividere il codice.

---

## 8. Esempi end-to-end

### `app-a/auth/login.feature`

```gherkin
Feature: User login on app-a
  Scenario: Standard user logs in
    Given I am a registered user
    When I log in with valid credentials
    Then I land on my dashboard
```

I tre step usati sono:
- `I am a registered user` → catalog: domain=`app-a/auth`, page=N/A
- `I log in with valid credentials` → catalog: domain=`app-a/auth`, page=`LoginPage`
- `I land on my dashboard` → catalog: domain=`app-a/auth`, page=`DashboardPage`

### Action chiamata da uno step di `app-a`

`src/actions/app-a/auth.actions.ts`:

```ts
import { LoginPage } from '../../pages/app-a/login.page';

export async function ensureRegisteredUser(world: World, role = 'standard') {
  // chiama l'API di seed di app-a (via src/api/app-a/), nessun selettore qui
}
```

---

## 9. Quando creare un'app nuova

Aggiungere `app-c/` (o equivalente) ha senso solo se:
- E' un applicativo distinto: URL base diverso, repo prodotto diverso, team
  prodotto diverso
- I selettori sono fondamentalmente non riusabili tra app esistenti
- Almeno 1-2 aree (altrimenti vive come `area` di un'app esistente)

Una nuova **area** dentro un'app esistente e' molto piu' frequente di una
nuova app. In dubbio: parti con area, promuovi ad app solo se la duplicazione
di pages/actions diventa evidente.
