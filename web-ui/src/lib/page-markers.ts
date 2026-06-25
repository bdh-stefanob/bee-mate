/**
 * page-markers.ts — Lib condivisa per l'estrazione dei page marker da file .feature.
 *
 * Replica ESATTAMENTE la logica di PAGE_MARKER_RE usata in editor/_content.tsx (unknownSteps useMemo).
 * Il marker è TRANSITIVO: resta attivo per tutti gli step successivi finché non compare il
 * marker seguente. Le ripetizioni dello stesso marker (pattern comune nei file reali) vengono
 * aggregate sommando i count.
 */

// All-caps comment = page marker: "# #LOGIN", "#WEIGHT LOSS", "# MEDICINE PREFER"
const PAGE_MARKER_RE = /^\s*#\s*#?([A-Z][A-Z0-9 _-]{1,})\s*$/;
const STEP_LINE_RE   = /^\s+(given|when|then|and|but)\s+(.+)/i;

export interface PageMarkerCount {
  /** Slug normalizzato: toLowerCase().replace(/\s+/g, '-')  (es. "login", "brochure-homepage") */
  page: string;
  /** Etichetta leggibile dal marker originale trimmato (es. "LOGIN", "BROCHURE HOMEPAGE") */
  display: string;
  /** Numero di step (righe Given/When/Then/And/But) sotto questa pagina */
  stepCount: number;
}

/**
 * Estrae i marker pagina da UN contenuto .feature.
 *
 * Il marker è transitivo: conta tutti gli step successivi finché non cambia marker.
 * Aggrega le ripetizioni dello stesso marker (i file reali ripetono #LOGIN prima di ogni step).
 */
export function extractPageMarkers(content: string): PageMarkerCount[] {
  const counts = new Map<string, { display: string; stepCount: number }>();
  let currentPage = '';
  let currentDisplay = '';

  for (const line of content.split('\n')) {
    const pm = line.match(PAGE_MARKER_RE);
    if (pm) {
      currentDisplay = pm[1].trim();
      currentPage = currentDisplay.toLowerCase().replace(/\s+/g, '-');
      if (!counts.has(currentPage)) {
        counts.set(currentPage, { display: currentDisplay, stepCount: 0 });
      }
      continue;
    }
    const sm = line.match(STEP_LINE_RE);
    if (sm && currentPage) {
      const entry = counts.get(currentPage)!;
      entry.stepCount += 1;
    }
  }

  return [...counts.entries()].map(([page, v]) => ({
    page,
    display: v.display,
    stepCount: v.stepCount,
  }));
}
