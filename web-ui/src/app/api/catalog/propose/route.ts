import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import { REPO_ROOT } from '@/lib/repo';
import type { CatalogStep } from '@/lib/types';

interface CatalogFile {
  totalSteps: number;
  steps: CatalogStep[];
}

function extractParameters(expression: string): string[] {
  const matches = expression.match(/\{[^}]+\}/g);
  return matches ?? [];
}

export async function POST(req: Request) {
  try {
    const body = await req.json() as {
      steps: { expression: string; keyword?: string; page?: string }[];
      app?: string;
      area?: string;
    };

    const { steps, app = '', area = 'to-classify' } = body;
    if (!Array.isArray(steps) || steps.length === 0) {
      return NextResponse.json({ ok: false, error: 'steps required' }, { status: 400 });
    }

    const catalogPath = path.join(REPO_ROOT, 'step-catalog.json');
    const catalog: CatalogFile = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'));

    const existing = new Set(catalog.steps.map(s => s.expression));
    let added = 0;

    for (const { expression, keyword, page } of steps) {
      if (existing.has(expression)) continue;
      catalog.steps.push({
        expression,
        parameters: extractParameters(expression),
        app,
        area,
        domain: '',
        status: 'wanted',
        ...(keyword ? { keyword: keyword as CatalogStep['keyword'] } : {}),
        ...(page   ? { page } : {}),
        sourceRef: 'feature',
        documented: false,
      });
      existing.add(expression);
      added++;
    }

    catalog.totalSteps = catalog.steps.length;
    fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2), 'utf-8');

    return NextResponse.json({ ok: true, added, skipped: steps.length - added });
  } catch (err: unknown) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
