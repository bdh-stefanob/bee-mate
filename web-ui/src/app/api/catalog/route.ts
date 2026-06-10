import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import { REPO_ROOT } from '@/lib/repo';

export async function GET() {
  try {
    const p = path.join(REPO_ROOT, 'step-catalog.json');
    const data = JSON.parse(fs.readFileSync(p, 'utf-8'));
    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
