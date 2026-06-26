/**
 * feature-tags.ts — Helper per leggere e scrivere i tag @app @flow nel contenuto .feature.
 *
 * I tag @app @flow sono la fonte di verità per il placement dei file feature.
 * La riga tag è la prima riga non vuota che inizia con @.
 */

/**
 * Legge i tag @app e @flow dalla prima riga tag nel contenuto.
 * Restituisce null se il tag non è presente.
 */
export function getFeatureTags(content: string): { app: string | null; flow: string | null } {
  const tagLine = content.match(/^(@\S+(?:\s+@\S+)*)/m);
  const tags = tagLine?.[1].match(/@(\S+)/g)?.map(t => t.slice(1)) ?? [];
  return { app: tags[0] ?? null, flow: tags[1] ?? null };
}

/**
 * Inserisce o sostituisce la riga tag @app @flow nel contenuto .feature.
 *
 * - Se esiste già una riga tag (prima riga non vuota che inizia con @),
 *   la sostituisce preservando il resto del contenuto verbatim.
 * - Se non esiste, la inserisce prima di "Feature:" (se presente) o in cima.
 *
 * I valori app/flow passati dovrebbero essere già slugificati dal chiamante.
 * Non altera i commenti # #PAGINA né il titolo Feature:.
 */
export function setFeatureTags(content: string, app: string, flow: string): string {
  const tagLine = `@${app} @${flow}`;
  const lines = content.split('\n');

  // Trova la prima riga non vuota
  const firstIdx = lines.findIndex(l => l.trim() !== '');
  if (firstIdx >= 0 && /^\s*@/.test(lines[firstIdx])) {
    // Sostituisci la tag line esistente
    lines[firstIdx] = tagLine;
    return lines.join('\n');
  }

  // Nessuna tag line: inserisci prima di Feature: se c'è, altrimenti in cima
  const featureIdx = lines.findIndex(l => /^\s*Feature:/i.test(l));
  const insertAt = featureIdx >= 0 ? featureIdx : 0;
  lines.splice(insertAt, 0, tagLine, '');
  return lines.join('\n');
}
