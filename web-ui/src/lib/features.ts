import * as fs from 'fs';
import * as path from 'path';
import type { FeatureSummary } from './types';
import { FEATURES_DIR } from './repo';

/**
 * walkFeatures: scansione ricorsiva di una directory.
 * Ritorna i path relativi a `base` (o a `dir` se base non specificato)
 * di tutti i file .feature trovati, con separatore '/' (cross-platform).
 */
export function walkFeatures(dir: string, base: string = dir): string[] {
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
      // Normalizza a slash POSIX anche su Windows
      results.push(path.relative(base, full).replace(/\\/g, '/'));
    }
  }
  return results;
}

/**
 * parseFeatureSummary: estrae i metadati da un file .feature.
 * - name: prima riga "Feature: ..." (fallback "(unnamed)")
 * - area: primo tag "@..." (fallback = prima cartella di relFile)
 * - scenarioCount: numero di righe Scenario: / Scenario Outline:
 */
export function parseFeatureSummary(content: string, relFile: string): FeatureSummary {
  // name
  const nameMatch = content.match(/^\s*Feature:\s*(.+)$/m);
  const name = nameMatch ? nameMatch[1].trim() : '(unnamed)';

  // area
  const tagMatch = content.match(/^@(\S+)/m);
  let area: string;
  if (tagMatch) {
    area = tagMatch[1];
  } else {
    const parts = relFile.split('/');
    area = parts.length > 1 ? parts[0] : 'unknown';
  }

  // scenarioCount
  const scenarioCount = (content.match(/^\s*(Scenario|Scenario Outline):/gm) ?? []).length;

  return { file: relFile, name, area, scenarioCount };
}

/**
 * listFeatures: combina walkFeatures + readFile + parseFeatureSummary
 * per l'intera directory dei .feature.
 */
export function listFeatures(featuresDir: string = FEATURES_DIR): FeatureSummary[] {
  const relPaths = walkFeatures(featuresDir);
  return relPaths.map((rel) => {
    const fullPath = path.join(featuresDir, rel);
    let content = '';
    try {
      content = fs.readFileSync(fullPath, 'utf-8');
    } catch {
      content = '';
    }
    return parseFeatureSummary(content, rel);
  });
}
