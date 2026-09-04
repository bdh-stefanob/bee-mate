# Scrivere scenari Gherkin

## Il procedimento, in quest'ordine

1. **Cerca prima.** Apri `step-catalog.json` e cerca uno step che esprima gia'
   l'intenzione che ti serve. Cerca per concetto, non per parole: "accedere",
   "autenticarsi", "fare login" sono lo stesso step.
2. **Riusa la formulazione esatta.** Copiala carattere per carattere, parametri
   compresi. Non "migliorarla".
3. **Se nulla corrisponde**, proponi **una sola** formulazione canonica nuova,
   taggala `@wanted`, e **fermati**: la nuova voce va approvata dal gatekeeper prima
   di essere implementata.
4. **Valida** con `npm run validate:steps` prima di considerare il lavoro finito.

## Dichiarativo, non imperativo

Uno scenario descrive **cosa vuole ottenere l'utente**, non la sequenza di click.

```gherkin
# NO — imperativo: fragile, illeggibile per il business, si rompe a ogni ritocco UI
When the user clicks on "SMS verification"
And the user clicks "Send code"
And the user enters the code received by SMS
And the user clicks the "Verify" button

# SI — dichiarativo: stabile, leggibile, documentazione viva
When the user completes SMS verification
```

Regola pratica: se tre o piu' passi consecutivi descrivono interazioni UI che stanno
sempre insieme, sono **un solo** step di intento. La meccanica scende nel layer
`actions/`, i selettori in `pages/`.

## Parametrizzare invece di duplicare

```gherkin
# NO — tre step quasi identici
Given I am logged in as a standard user
Given I am logged in as an admin user
Given I am logged in as a guest user

# SI — uno solo
Given I am logged in as a {string} user
```

Se lo stesso flusso va provato con dati diversi, usa `Scenario Outline` con `Examples`,
non copiare lo scenario.

## Un termine, un concetto

Scegli un sostantivo per ogni entita' e non cambiarlo mai. Se il catalogo dice
`customer`, non scrivere `user`, `client` o `account` per la stessa cosa. **L'entropia
nasce nei sostantivi prima che negli step.**

## Cosa non fare, mai

- **Uno step per componente UI.** Un pulsante non e' uno scenario. Se stai scrivendo
  `When the user clicks "X"` per ogni elemento di una pagina, ti sei allontanato dal
  business e stai fabbricando entropia in fretta.
- **Selettori CSS, XPath, id o URL** dentro un `.feature`.
- **Piu' varianti della stessa frase** perche' scelga l'utente.
- **Step tecnici**: "the API returns 200", "the DB row is created". Traducili in
  linguaggio di dominio, oppure sono verifiche di un altro livello.

## Struttura di uno scenario

- `Given` = premessa, stato prima. `When` = **una sola** azione. `Then` = verifica.
- Un `When` per scenario. Due `When` sono due scenari.
- Il titolo dice il risultato atteso, non i passi: *"New customer completes checkout"*,
  non *"Test 3"*.
