import * as fs from 'fs';
import * as path from 'path';

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
