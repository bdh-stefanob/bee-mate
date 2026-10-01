/**
 * feature-tags.ts — Helper per leggere e scrivere i tag @app @flow nel contenuto .feature.
 *
 * I tag @app @flow sono la fonte di verità per il placement dei file feature.
 *
 * La riga dei tag e' quella che sta subito sopra `Feature:` (come la scrive il
 * salvataggio dal cruscotto: dopo il commento del marcatore e una riga vuota).
 * Se il file non ha `Feature:`, e' la prima riga non vuota che inizia con @.
 * Su quella riga i tag di posizionamento sono i primi due che non siano
 * "riservati"; tutti gli altri (compresi i riservati) sono di altri e si
 * conservano, nell'ordine in cui sono.
 */

/**
 * Tag con un significato proprio, che non sono ne' app ne' flusso:
 * `@generato` (con cui la schermata Esecuzione trova gli scenari registrati),
 * `@da-rivedere`, `@non-automatizzato` (scenario-documento: non si esegue),
 * `@wanted` e i riferimenti ai ticket.
 */
function riservato(tag: string): boolean {
  return /^(generato|da-rivedere|non-automatizzato|wanted|ticket(:.*)?)$/.test(tag);
}

/** Indice della riga dei tag, o -1. */
function indiceRigaTag(lines: string[]): number {
  const iFeature = lines.findIndex(l => /^\s*Feature:/i.test(l));
  if (iFeature >= 0) {
    // Risale da Feature: saltando righe vuote e commenti (i marcatori di
    // pagina `# #PAGINA` possono stare fra i tag e Feature:); si ferma al
    // primo altro rigo.
    for (let i = iFeature - 1; i >= 0; i--) {
      if (lines[i].trim() === '' || /^\s*#/.test(lines[i])) continue;
      return /^\s*@/.test(lines[i]) ? i : -1;
    }
    return -1;
  }
  const first = lines.findIndex(l => l.trim() !== '');
  return first >= 0 && /^\s*@/.test(lines[first]) ? first : -1;
}

/** I tag di una riga, senza la chiocciola, e la posizione dei due di posizionamento. */
function leggiRiga(line: string): { tags: string[]; posizionamento: number[] } {
  const tags = (line.match(/@\S+/g) ?? []).map(t => t.slice(1));
  const posizionamento: number[] = [];
  tags.forEach((t, i) => {
    if (posizionamento.length < 2 && !riservato(t)) posizionamento.push(i);
  });
  return { tags, posizionamento };
}

/**
 * Legge i tag @app e @flow dalla riga dei tag nel contenuto.
 * Restituisce null se il tag non è presente.
 */
export function getFeatureTags(content: string): { app: string | null; flow: string | null } {
  const lines = content.split('\n');
  const i = indiceRigaTag(lines);
  if (i < 0) return { app: null, flow: null };
  const { tags, posizionamento } = leggiRiga(lines[i]);
  return { app: tags[posizionamento[0]] ?? null, flow: tags[posizionamento[1]] ?? null };
}

/**
 * Inserisce o sostituisce app e flow nella riga dei tag del contenuto .feature.
 *
 * - Se esiste già una riga dei tag, sostituisce solo i due tag di
 *   posizionamento (davanti): ogni altro tag (@generato, @non-automatizzato,
 *   @ticket:..., ecc.) resta, e non nasce una seconda riga.
 * - Se non esiste, la inserisce prima di "Feature:" (se presente) o in cima.
 *
 * I valori app/flow passati dovrebbero essere già slugificati dal chiamante.
 * Non altera i commenti né il titolo Feature:.
 */
export function setFeatureTags(content: string, app: string, flow: string): string {
  const lines = content.split('\n');
  const i = indiceRigaTag(lines);

  if (i >= 0) {
    const { tags, posizionamento } = leggiRiga(lines[i]);
    const altri = tags.filter((_, k) => !posizionamento.includes(k));
    const fineRiga = lines[i].endsWith('\r') ? '\r' : '';
    lines[i] = [app, flow, ...altri].map(t => `@${t}`).join(' ') + fineRiga;
    return lines.join('\n');
  }

  // Nessuna riga di tag: inserisci prima di Feature: se c'è, altrimenti in cima
  const featureIdx = lines.findIndex(l => /^\s*Feature:/i.test(l));
  const insertAt = featureIdx >= 0 ? featureIdx : 0;
  lines.splice(insertAt, 0, `@${app} @${flow}`, '');
  return lines.join('\n');
}
