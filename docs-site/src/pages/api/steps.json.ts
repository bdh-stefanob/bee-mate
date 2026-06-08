import type { APIRoute } from 'astro';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

// Rendered as a static JSON file at build time.
// The React editor fetches this at runtime to load the step catalog.
export const prerender = true;

export const GET: APIRoute = () => {
  // docs-site/src/pages/api/ → 4 levels up → repo root
  const dir = fileURLToPath(new URL('.', import.meta.url));
  const catalogPath = resolve(dir, '..', '..', '..', '..', 'step-catalog.json');

  if (!existsSync(catalogPath)) {
    return new Response(
      JSON.stringify({ steps: [], totalSteps: 0, generatedAt: null }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  }

  return new Response(readFileSync(catalogPath, 'utf-8'), {
    headers: { 'Content-Type': 'application/json' },
  });
};
