import { NextResponse } from 'next/server';
import { FEATURES_DIR } from '@/lib/repo';
import { listFeatures } from '@/lib/features';

/**
 * GET /api/features
 * Ritorna l'elenco FeatureSummary[] di tutti i .feature in src/features/.
 * Logica di walk e parsing delegata a lib/features.ts (pura, testabile).
 */
export async function GET() {
  try {
    const summaries = listFeatures(FEATURES_DIR);
    return NextResponse.json(summaries);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
