import { stato } from '@/lib/registro';

/**
 * Eventi dell'esecuzione, in Server-Sent Events.
 *
 * Unidirezionale e senza dipendenze nuove: il browser riconnette da solo. Si
 * mandano le righe nuove ogni 400ms, non a ogni riga: una registrazione ne
 * produce a raffica, e una finestra che ridisegna trecento volte al secondo non
 * la legge nessuno.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const flusso = new ReadableStream({
    start(controller) {
      let inviate = 0;
      const manda = (evento: string, dati: unknown) => {
        controller.enqueue(new TextEncoder().encode(`event: ${evento}\ndata: ${JSON.stringify(dati)}\n\n`));
      };
      const battito = setInterval(() => {
        const e = stato(id);
        if (!e) { manda('fine', { stato: 'sconosciuta' }); clearInterval(battito); controller.close(); return; }
        const nuove = e.righe.slice(inviate);
        if (nuove.length > 0) { inviate = e.righe.length; manda('riga', nuove); }
        if (e.stato !== 'in corso') {
          manda('fine', { stato: e.stato, codice: e.codice });
          clearInterval(battito);
          controller.close();
        }
      }, 400);
    },
  });

  return new Response(flusso, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' },
  });
}
