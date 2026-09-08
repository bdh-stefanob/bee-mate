# I modelli della generazione

Qui vive la **forma** del codice generato: uno scheletro per ogni artefatto, con
dei segnaposto `{{COSI}}` al posto delle parti che cambiano.

## Perche' sono file, e non stringhe dentro al generatore

Perche' chi non e' d'accordo su come si scrive una Page Object deve poter
cambiare il modello, non il generatore. Una convenzione sepolta nel codice non
viene discussa: viene subita, e poi aggirata.

E perche' la forma del codice e' una decisione di squadra. Questi file sono il
posto dove quella decisione e' scritta una volta sola.

## Cosa sta qui e cosa no

| File | Cosa produce | Chi lo riempie |
|---|---|---|
| `page-object.ts.tmpl` | una Page Object per pagina visitata | **deterministico** — dal dizionario |
| `steps.ts.tmpl` | il glue delle step definition | **deterministico** — e' codice a forma fissa |
| `feature.feature.tmpl` | lo scenario Gherkin | intestazione deterministica, **frasi dall'assistente** |

Le uniche parti che richiedono un modello sono la frase Gherkin e la scelta di
quali metodi chiamare per realizzare un intento. Tutto il resto e' sostituzione
di stringhe: va fatto senza AI, perche' deterministico batte
corretto-quasi-sempre.

## La regola dei segnaposto

Un segnaposto non sostituito e' un **errore**, non un buco da lasciare: il
renderer si ferma. Un file generato a meta' che sembra completo e' il modo
peggiore di sbagliare.

Se un segnaposto sta da solo su una riga, il valore viene rientrato quanto lui.
Cosi' chi scrive il modello controlla l'indentazione dal modello, e chi scrive
il generatore non deve pensarci.

## Il marcatore

Ogni file generato porta in testa:

```
// generato-da: bdd-generate · rigenerabile
```

Il generatore **riscrive solo i file che portano questo marcatore**. Toglierlo
significa "questo file adesso e' mio": da quel momento la generazione lo salta
invece di cancellare il lavoro di qualcuno. E' la stessa regola del publisher
Confluence, per lo stesso motivo.
