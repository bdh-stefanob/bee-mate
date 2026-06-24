import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import { REPO_ROOT } from '@/lib/repo';
import type { CatalogStep } from '@/lib/types';
import {
  GITHUB_NAME_RE,
  branchEnsure,
  getFileContent,
  putContents,
  sanitizeError,
} from '@/lib/github-utils';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractParameters(expression: string): string[] {
  const matches = expression.match(/\{[^}]+\}/g);
  return matches ?? [];
}

interface CatalogFile {
  totalSteps: number;
  steps: CatalogStep[];
}

interface StepProposalsFile {
  steps: CatalogStep[];
}

interface RequestBody {
  steps: { expression: string; keyword?: string; page?: string }[];
  app?: string;
  area?: string;
}

// ---------------------------------------------------------------------------
// FS fallback — preserves existing behavior (status: 'wanted', sourceRef: 'feature')
// ---------------------------------------------------------------------------

async function proposeToFs(
  steps: { expression: string; keyword?: string; page?: string }[],
  app: string,
  area: string,
): Promise<{ added: number; skipped: number }> {
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
      ...(page ? { page } : {}),
      sourceRef: 'feature',
      documented: false,
    });
    existing.add(expression);
    added++;
  }

  catalog.totalSteps = catalog.steps.length;
  fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2), 'utf-8');

  return { added, skipped: steps.length - added };
}

// ---------------------------------------------------------------------------
// POST /api/catalog/propose
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  // 1. Read GitHub configuration from headers (token never in body — T-05-03-03)
  const token      = request.headers.get('x-github-token');
  const owner      = request.headers.get('x-github-owner');
  const repo       = request.headers.get('x-github-repo');
  const branch     = request.headers.get('x-catalog-branch') ?? 'catalog';
  const baseBranch = request.headers.get('x-github-branch') ?? 'main';
  const rawName    = request.headers.get('x-commit-name') ?? 'QA Contributor';
  const rawEmail   = request.headers.get('x-commit-email') ?? '';

  // 2. Sanitize commit identity (T-999.12-06: strip <> injection, cap lengths)
  const commitName  = rawName.replace(/[<>]/g, '').slice(0, 100);
  const commitEmail = rawEmail.slice(0, 200);

  // 3. Parse body
  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const { steps, app = '', area = 'to-classify' } = body;
  if (!Array.isArray(steps) || steps.length === 0) {
    return NextResponse.json({ ok: false, error: 'steps required' }, { status: 400 });
  }

  // ---------------------------------------------------------------------------
  // GitHub path
  // ---------------------------------------------------------------------------
  if (token && owner && repo) {
    // Validate owner/repo/branch names (T-999.12-05: injection guard)
    if (!GITHUB_NAME_RE.test(owner) || !GITHUB_NAME_RE.test(repo)) {
      return NextResponse.json(
        { ok: false, error: 'Invalid x-github-owner or x-github-repo' },
        { status: 400 },
      );
    }
    if (!GITHUB_NAME_RE.test(branch)) {
      return NextResponse.json(
        { ok: false, error: 'Invalid catalog branch' },
        { status: 400 },
      );
    }

    try {
      // D-02: Ensure the catalog branch exists (auto-create from main if missing)
      await branchEnsure(owner, repo, branch, baseBranch, token);

      // D-04: Fetch current step-proposals.json (404 = empty file)
      const existing = await getFileContent(owner, repo, 'step-proposals.json', branch, token);
      const file: StepProposalsFile = existing
        ? (JSON.parse(existing.content) as StepProposalsFile)
        : { steps: [] };

      // Build a set of existing expressions for duplicate detection
      const present = new Set(file.steps.map(s => s.expression));
      const duplicates: string[] = [];
      let added = 0;

      for (const { expression, keyword, page } of steps) {
        if (present.has(expression)) {
          duplicates.push(expression);
          continue;
        }
        file.steps.push({
          expression,
          parameters: extractParameters(expression),
          app,
          area,
          domain: '',
          status: 'proposed',
          ...(keyword ? { keyword: keyword as CatalogStep['keyword'] } : {}),
          ...(page ? { page } : {}),
          sourceRef: commitName,
          proposedAt: new Date().toISOString(),
          documented: false,
        } as CatalogStep);
        present.add(expression);
        added++;
      }

      // If everything was a duplicate, return 409 (no PUT)
      if (added === 0 && duplicates.length > 0) {
        return NextResponse.json(
          {
            ok: false,
            error: 'This step expression already exists in proposals. Duplicates are not allowed.',
            duplicates,
          },
          { status: 409 },
        );
      }

      // Push updated step-proposals.json to the catalog branch
      await putContents(
        owner,
        repo,
        'step-proposals.json',
        branch,
        token,
        JSON.stringify(file, null, 2),
        existing?.sha,
        `feat: propose ${added} step(s) via BDD web editor`,
        { name: commitName, email: commitEmail },
      );

      return NextResponse.json({
        ok: true,
        added,
        skipped: steps.length - added,
        duplicates,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      // T-999.12-07: strip token from error response
      const safe = sanitizeError(message, token);
      return NextResponse.json({ ok: false, error: safe }, { status: 500 });
    }
  }

  // ---------------------------------------------------------------------------
  // FS fallback (no GitHub headers) — preserves existing status:'wanted' behavior
  // ---------------------------------------------------------------------------
  try {
    const { added, skipped } = await proposeToFs(steps, app, area);
    return NextResponse.json({ ok: true, added, skipped });
  } catch (err: unknown) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
