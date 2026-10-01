"use client"

import * as React from "react"
import { Tabs } from "@base-ui/react/tabs"
import { AlertTriangle } from "lucide-react"
import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * Schede: una riga di linguette e il pannello della scheda attiva.
 *
 * Avvolge `Tabs` di `@base-ui/react` (verificato in node_modules, versione
 * 1.5.0: Root, List, Tab, Panel; `Home`/`End` abilitati dalla lista): ruoli
 * `tablist`/`tab`/`tabpanel`, `aria-selected`, `aria-controls`/`aria-labelledby`,
 * frecce, `loopFocus` e una sola sosta del Tab sulla lista li da' il componente
 * sottostante. Qui si aggiungono lo stile coi token del cruscotto, il
 * contatore, lo scorrimento di lato e la scelta fra attivazione manuale e al
 * focus.
 *
 * Non importa niente da `next/navigation`: la scheda attiva e' controllata da
 * fuori (`valore`/`onCambia`), e l'indirizzo sta in `hooks/useSchedaUrl.ts`.
 * Cosi' una pagina qualunque lo usa con o senza indirizzo.
 */

export interface SchedaDef {
  /** Stabile e uguale in ogni lingua: finisce nell'indirizzo. */
  id: string
  /** Gia' tradotta. */
  etichetta: string
  /** Mai l'unico segnale. */
  icona?: LucideIcon
  /** Il numero sulla linguetta. null = si sta caricando; 0 = non si mostra. */
  conteggio?: number | null
  /** Per i lettori di schermo: "4 coppie da guardare". */
  etichettaConteggio?: string
  /** 'attenzione' = bordo ambra, punto esclamativo, e il numero: non dipende dal colore. */
  tono?: "neutro" | "attenzione"
  disabilitata?: boolean
}

export interface SchedeProps {
  /** Almeno due. */
  schede: SchedaDef[]
  /** La scheda attiva (controllato). */
  valore: string
  onCambia: (id: string) => void
  /** Il nome della lista di linguette: "Sezioni del catalogo". */
  etichettaAria: string
  /** Il contenuto: viene chiamato solo per la scheda attiva (a meno di `mantieniMontate`). */
  pannello: (id: string) => React.ReactNode
  /**
   * 'manuale' (default): le frecce spostano il focus, Invio/Spazio attivano.
   * Con 'al-focus' ogni freccia cambia scheda; se la scheda sta nell'indirizzo
   * conviene allora scrivere con `cronologia: 'sostituisci'`.
   */
  attivazione?: "manuale" | "al-focus"
  /** Default false: si monta solo la scheda attiva. */
  mantieniMontate?: boolean
  className?: string
}

function Schede({
  schede,
  valore,
  onCambia,
  etichettaAria,
  pannello,
  attivazione = "manuale",
  mantieniMontate = false,
  className,
}: SchedeProps) {
  const lista = React.useRef<HTMLDivElement>(null)

  // La linguetta attiva viene portata in vista quando la lista scorre di lato.
  React.useEffect(() => {
    const attiva = lista.current?.querySelector<HTMLElement>('[aria-selected="true"]')
    attiva?.scrollIntoView?.({ inline: "nearest", block: "nearest" })
  }, [valore])

  return (
    <Tabs.Root
      data-slot="schede"
      value={valore}
      onValueChange={(v) => {
        if (typeof v === "string" && v !== valore) onCambia(v)
      }}
      className={cn("flex flex-col", className)}
    >
      <Tabs.List
        ref={lista}
        aria-label={etichettaAria}
        activateOnFocus={attivazione === "al-focus"}
        loopFocus
        className="flex snap-x overflow-x-auto border-b"
        style={{ borderColor: "var(--bordo)" }}
      >
        {schede.map((s) => {
          const attiva = s.id === valore
          const Icona = s.icona
          const mostraConteggio = typeof s.conteggio === "number" && s.conteggio > 0
          const attenzione = s.tono === "attenzione"
          return (
            <Tabs.Tab
              key={s.id}
              value={s.id}
              disabled={s.disabilitata}
              className={cn(
                "relative flex min-h-11 flex-1 snap-start items-center justify-center gap-2 whitespace-nowrap px-2 py-2 sm:px-4 text-sm",
                "focus-visible:outline-2 focus-visible:-outline-offset-2",
                "motion-reduce:transition-none",
                attiva ? "font-semibold" : "font-medium",
                "disabled:opacity-50"
              )}
              style={{
                color: attiva ? "var(--testo)" : "var(--testo-tenue)",
                outlineColor: "var(--blu)",
              }}
            >
              {Icona && <Icona size={16} aria-hidden="true" className="hidden shrink-0 sm:block" />}
              <span>{s.etichetta}</span>
              {mostraConteggio && (
                <>
                  <span
                    aria-hidden="true"
                    className="inline-flex min-w-5 items-center justify-center gap-1 rounded-full border px-1.5 text-xs font-semibold"
                    style={{
                      borderColor: attenzione ? "var(--ambra)" : "var(--bordo)",
                      color: attenzione ? "var(--ambra)" : "var(--testo-tenue)",
                    }}
                  >
                    {attenzione && <AlertTriangle size={12} aria-hidden="true" />}
                    {s.conteggio}
                  </span>
                  {/* Per il lettore di schermo: "Da sistemare, 4 coppie da guardare", non "Da sistemare 4". */}
                  <span className="sr-only">{s.etichettaConteggio ?? String(s.conteggio)}</span>
                </>
              )}
              {/* La barra della scheda attiva: oltre al grassetto e ad aria-selected, mai solo il colore. */}
              {attiva && (
                <span
                  aria-hidden="true"
                  className="absolute inset-x-0 -bottom-px h-0.5"
                  style={{ background: "var(--blu)" }}
                />
              )}
            </Tabs.Tab>
          )
        })}
      </Tabs.List>

      {schede.map((s) => (
        <Tabs.Panel
          key={s.id}
          value={s.id}
          keepMounted={mantieniMontate}
          className="pt-4 focus-visible:outline-2 focus-visible:-outline-offset-2"
          style={{ outlineColor: "var(--blu)" }}
        >
          {mantieniMontate || s.id === valore ? pannello(s.id) : null}
        </Tabs.Panel>
      ))}
    </Tabs.Root>
  )
}

export { Schede }
