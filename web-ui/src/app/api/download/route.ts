import * as fs from 'fs';
import * as path from 'path';
import { safeFeaturePath } from '@/lib/repo';

/**
 * GET /api/download?file=<rel>
 * Serve un file .feature dal repository con Content-Disposition attachment.
 *
 * Security (T-04-10):
 * - safeFeaturePath valida path traversal (../) e estensione (.feature obbligatoria)
 * - 403 su path non valido o estensione diversa da .feature
 * - 404 se il file non esiste
 */
export async function GET(request: Request): Promise<Response> {
  const file = new URL(request.url).searchParams.get('file') ?? '';

  // Guard centralizzato: path traversal + estensione .feature (T-04-10)
  const resolved = safeFeaturePath(file);
  if (!resolved) {
    return new Response('Forbidden', { status: 403 });
  }

  // File esistente?
  if (!fs.existsSync(resolved)) {
    return new Response('Not Found', { status: 404 });
  }

  const content = fs.readFileSync(resolved, 'utf-8');
  const filename = path.basename(resolved);

  return new Response(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
