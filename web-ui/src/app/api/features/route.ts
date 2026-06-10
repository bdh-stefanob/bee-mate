import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import { FEATURES_DIR } from '@/lib/repo';
import type { FeatureSummary } from '@/lib/types';

/**
 * Scansione ricorsiva di una directory: ritorna i path relativi a base
 * di tutti i file .feature trovati.
 */
function walkFeatures(dir: string, base: string): string[] {
  const results: string[] = [];
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkFeatures(full, base));
    } else if (entry.name.endsWith('.feature')) {
      results.push(path.relative(base, full).replace(/\\/g, '/'));
    }
  }
  return results;
}

/**
 * Estrae il nome della Feature dalla prima riga `Feature:` trovata.
 */
function extractFeatureName(content: string): string {
  const m = content.match(/^\s*Feature:\s*(.+)$/m);
  return m ? m[1].trim() : '(unnamed)';
}

/**
 * Estrae l'area dal primo tag @ (prima riga del file) oppure dalla
 * prima cartella nel path relativo.
 */
function extractArea(content: string, relPath: string): string {
  const tagMatch = content.match(/^@(\S+)/m);
  if (tagMatch) return tagMatch[1];
  const parts = relPath.split('/');
  return parts.length > 1 ? parts[0] : 'unknown';
}

/**
 * Conta il numero di scenari nel file.
 */
function countScenarios(content: string): number {
  return (content.match(/^\s*(Scenario|Scenario Outline):/gm) ?? []).length;
}

export async function GET() {
  try {
    const relPaths = walkFeatures(FEATURES_DIR, FEATURES_DIR);
    const summaries: FeatureSummary[] = relPaths.map((rel) => {
      const fullPath = path.join(FEATURES_DIR, rel);
      let content = '';
      try {
        content = fs.readFileSync(fullPath, 'utf-8');
      } catch {
        content = '';
      }
      return {
        file: rel,
        name: extractFeatureName(content),
        area: extractArea(content, rel),
        scenarioCount: countScenarios(content),
      };
    });
    return NextResponse.json(summaries);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
