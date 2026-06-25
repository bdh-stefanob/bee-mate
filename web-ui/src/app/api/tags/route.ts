import * as fs from 'fs';
import * as path from 'path';
import { NextResponse } from 'next/server';
import { FEATURES_DIR } from '@/lib/repo';
import { walkFeatures } from '@/lib/features';
import { extractPageMarkers } from '@/lib/page-markers';

/**
 * TagAggregate — un marker di pagina aggregato su tutti i file .feature.
 */
interface TagAggregate {
  /** Slug normalizzato (es. "login", "brochure-homepage") */
  page: string;
  /** Etichetta leggibile (es. "LOGIN", "BROCHURE HOMEPAGE") */
  display: string;
  /** Somma degli step di questa pagina su tutti i file (può essere > steps.length se uno step si ripete tra file) */
  stepCount: number;
  /** Relpath POSIX dei .feature che contengono questa pagina (dedup) */
  files: string[];
  /** Insieme unico di step (testo Gherkin) associati a questa pagina, deduplicati cross-file, ordinati */
  steps: string[];
}

/**
 * GET /api/tags
 *
 * Scansiona tutti i .feature in FEATURES_DIR, aggrega i page marker per slug
 * (somma stepCount, dedup files) e ritorna { pages: TagAggregate[] }
 * ordinato per stepCount decrescente, poi page crescente.
 *
 * Security (T-999.13-01): legge SOLO sotto FEATURES_DIR via walkFeatures;
 * nessun parametro path accettato dal client. I files nella risposta sono
 * relpath POSIX relativi a FEATURES_DIR — nessun path assoluto esposto.
 */
export async function GET() {
  try {
    const relPaths = walkFeatures(FEATURES_DIR);
    const aggregate = new Map<string, TagAggregate>();

    for (const rel of relPaths) {
      let content: string;
      try {
        content = fs.readFileSync(path.join(FEATURES_DIR, rel), 'utf-8');
      } catch {
        // Skip files non leggibili — non bloccante
        continue;
      }

      const markers = extractPageMarkers(content);
      for (const { page, display, stepCount, steps } of markers) {
        if (!aggregate.has(page)) {
          aggregate.set(page, { page, display, stepCount: 0, files: [], steps: [] });
        }
        const entry = aggregate.get(page)!;
        entry.stepCount += stepCount;
        if (!entry.files.includes(rel)) {
          entry.files.push(rel);
        }
        // Dedup cross-file: aggiungi solo step non già presenti
        for (const s of steps) {
          if (!entry.steps.includes(s)) {
            entry.steps.push(s);
          }
        }
      }
    }

    // Ordina gli step di ogni pagina alfabeticamente prima di serializzare
    for (const entry of aggregate.values()) {
      entry.steps.sort();
    }

    const pages = [...aggregate.values()].sort((a, b) => {
      if (b.stepCount !== a.stepCount) return b.stepCount - a.stepCount;
      return a.page.localeCompare(b.page);
    });

    return NextResponse.json({ pages });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
