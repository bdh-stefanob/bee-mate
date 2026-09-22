import { stato } from '@/lib/registro';

/**
 * Eventi dell'esecuzione, in Server-Sent Events.
 *
 * Unidirezionale e senza dipendenze nuove: il browser riconnette da solo. Si
 * mandano le righe nuove ogni 400ms, non a ogni riga: una registrazione ne
 * produce a raffica, e una finestra che ridisegna trecento volte al secondo non
 * la legge nessuno.
 *
 * PERCHE' C'E' UN `cancel`
 * Il tester che chiude la scheda a meta' di una registrazione chiude il socket,
 * non l'intervallo: quello continuerebbe a battere ogni 400ms e alla prima
 * scrittura su un flusso gia' chiuso lancerebbe — dentro il callback di un
 * timer, cioe' dove nessuno la raccoglie, e in Node un'eccezione non raccolta
 * si porta via il processo intero, la finestra di tutti e non solo la sua.
 * Quindi: `cancel` ferma il battito, e ogni invio e' comunque protetto, perche'
 * fra il controllo e la scrittura la connessione puo' chiudersi lo stesso.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let battito: ReturnType<typeof setInterval> | undefined;

  const flusso = new ReadableStream({
    start(controller) {
      let inviate = 0;
      let chiuso = false;

      const ferma = () => {
        chiuso = true;
        if (battito) clearInterval(battito);
      };

      const manda = (evento: string, dati: unknown): boolean => {
        if (chiuso) return false;
        try {
          controller.enqueue(
            new TextEncoder().encode(`event: ${evento}\ndata: ${JSON.stringify(dati)}\n\n`)
          );
          return true;
        } catch {
          // Il lettore se n'e' andato fra un battito e l'altro: non e' un
          // errore, e' la fine normale di una connessione.
          ferma();
          return false;
        }
      };

      const concludi = (evento: string, dati: unknown) => {
        const arrivato = manda(evento, dati);
        ferma();
        if (arrivato) {
          try {
            controller.close();
          } catch {
            // Gia' chiuso dall'altra parte: niente da fare.
          }
        }
      };

      battito = setInterval(() => {
        if (chiuso) return;
        const e = stato(id);
        if (!e) {
          concludi('fine', { stato: 'sconosciuta' });
          return;
        }
        const nuove = e.righe.slice(inviate);
        if (nuove.length > 0) {
          inviate = e.righe.length;
          if (!manda('riga', nuove)) return;
        }
        if (e.stato !== 'in corso') {
          concludi('fine', { stato: e.stato, codice: e.codice });
        }
      }, 400);
    },

    cancel() {
      if (battito) clearInterval(battito);
    },
  });

  return new Response(flusso, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' },
  });
}
