# Scenario fallito — the user select insomnia treatment

- **Quando**: 2026-10-27T10:28:59.205Z
- **Feature**: `src\features\clinic\insomnia\the-user-select-insomnia-treatment.feature`
- **Passo fallito**: `the user select i'am new`
- **Ambiente**: clinic
- **Pagina al momento del fallimento**: https://qa-clinic.lemonaidhealth.co.uk/services/INS — «Consultation | Boots Online Doctor»

## Errore

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('link', { name: /^[^\p{L}\p{N}]*I'm new to Boots Online Doctor for insomnia I'm here for my first visit with the medical team for insomnia treatment\.\.\.[^\p{L}\p{N}]*$/u }).or(getByText('/^[^\\p{L}\\p{N}]*I\'m new to Boots Online Doctor for insomnia I\'m here for my first visit with the medical team for insomnia treatment\\.\\.\\.[^\\p{L}\\p{N}]*$/u')).filter({ visible: true }).first()
Expected: visible
Timeout: 30000ms
Error: element(s) not found

Call log:
  - Expect "to.be.visible" with timeout 30000ms
  - waiting for getByRole('link', { name: /^[^\p{L}\p{N}]*I'm new to Boots Online Doctor for insomnia I'm here for my first visit with the medical team for insomnia treatment\.\.\.[^\p{L}\p{N}]*$/u }).or(getByText('/^[^\\p{L}\\p{N}]*I\'m new to Boots Online Doctor for insomnia I\'m here for my first visit with the medical team for insomnia treatment\\.\\.\\.[^\\p{L}\\p{N}]*$/u')).filter({ visible: true }).first()
    - found locator('.loading-dialog').first(), intercepting action to run the handler
    - locator handler has finished
    - interception handler has finished, continuing


  Pagina attesa : InsPage (/services/INS)
  Indirizzo ora : https://qa-clinic.lemonaidhealth.co.uk/services/INS
  Se l'indirizzo non e' quello atteso, il locator non c'entra: il
  percorso e' cambiato prima di arrivare qui.
    at InsPage.expectVisible (C:\Users\elber\Desktop\Boots\Project\bdd-automation-scaffold\src\support\base.page.ts:111:13)
    at async InsPage.assertLoaded (C:\Users\elber\Desktop\Boots\Project\bdd-automation-scaffold\src\pages\clinic\ins.page.ts:38:5)
    at async CustomWorld.<anonymous> (C:\Users\elber\Desktop\Boots\Project\bdd-automation-scaffold\src\steps\clinic\insomnia\the-user-select-insomnia-treatment.steps.ts:88:3)
```

## Cosa c'era sulla pagina

L'albero di accessibilita' e' in `aria.yml`: e' l'elenco di cio' che un utente (o un locator `getByRole`) vede. Se il componente che il passo cercava non c'e', cerca quello che gli somiglia: di solito e' stato rinominato.

Screenshot: `screenshot.png`

## Come procedere

1. Trova lo step nel file di step: cerca il testo del passo fallito sotto `src/steps/`.
2. Confronta il componente che cerca con l'albero di accessibilita': e' sparito, rinominato, o coperto da un avviso (un modale, un banner)?
3. Correggi **nella Page Object** (`src/pages/`) o nell'azione (`src/actions/`), mai nello step: niente selettori negli step.
4. Se la causa e' un avviso che compare solo a volte, chiudilo "se c'e'" (`dismissIfPresent` in `base.page.ts`): non deve far fallire lo scenario.
5. Rilancia solo questo scenario:

```
npm run test:bersaglio clinic -- --name "^the user select insomnia treatment$"
```

Se il dossier non basta a capire (la pagina e' troppo diversa da quella registrata), dillo invece di indovinare: serve rilanciare lo scout su quell'indirizzo.
