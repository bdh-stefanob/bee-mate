import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import { REPO_ROOT } from '@/lib/repo';
import type { CatalogStep, ParamEnumDef } from '@/lib/types';
import { getFileContent, GITHUB_NAME_RE, sanitizeError } from '@/lib/github-utils';

interface StepEnumsFile {
  version: number;
  enums: { expression: string; paramEnums: ParamEnumDef[] }[];
  dependencies: { expression: string; requires: string[] }[];
}

/**
 * loadFromFs — reads step-catalog.json from the local filesystem (existing behavior).
 * Enriches steps with paramEnums and requires from step-enums.json.
 */
function loadFromFs(): { totalSteps: number; steps: CatalogStep[] } {
  const catalogPath = path.join(REPO_ROOT, 'step-catalog.json');
  const data = JSON.parse(fs.readFileSync(catalogPath, 'utf-8')) as { steps: CatalogStep[] };

  const enumsPath = path.join(REPO_ROOT, 'step-enums.json');
  if (fs.existsSync(enumsPath)) {
    const enums: StepEnumsFile = JSON.parse(fs.readFileSync(enumsPath, 'utf-8'));
    const enumMap = new Map(enums.enums.map(e => [e.expression, e.paramEnums]));
    const depsMap = new Map(enums.dependencies.map(d => [d.expression, d.requires]));

    data.steps = data.steps.map(step => ({
      ...step,
      paramEnums: enumMap.get(step.expression) ?? [],
      requires:   depsMap.get(step.expression) ?? [],
    }));
  }

  return { totalSteps: data.steps.length, steps: data.steps };
}

/**
 * GET /api/catalog
 *
 * When GitHub credentials are present as request headers, fetches step-catalog.json
 * and step-proposals.json from the catalog branch and merges them.
 * A 404 on step-proposals.json yields an empty proposals array (Pitfall 3).
 * On any GitHub error, falls back to the local FS read (D-06).
 * Token is never returned in error responses (T-05-03-02).
 *
 * Headers (all optional — missing = FS fallback):
 *   x-github-token    : GitHub Personal Access Token
 *   x-github-owner    : repo owner
 *   x-github-repo     : repo name
 *   x-catalog-branch  : proposals branch (default: 'catalog')
 */
export async function GET(request: Request) {
  try {
    // Read GitHub config from headers (token NEVER in body — T-05-03-03)
    const token  = request.headers.get('x-github-token');
    const owner  = request.headers.get('x-github-owner');
    const repo   = request.headers.get('x-github-repo');
    const branch = request.headers.get('x-catalog-branch') ?? 'catalog';

    if (token && owner && repo) {
      // Validate owner/repo/branch against whitelist (T-999.12-01 / T-05-03-04)
      if (!GITHUB_NAME_RE.test(owner) || !GITHUB_NAME_RE.test(repo) || !GITHUB_NAME_RE.test(branch)) {
        // Invalid names — fall through to FS
        return NextResponse.json(loadFromFs());
      }

      try {
        // Fetch official catalog from GitHub branch
        const officialFile = await getFileContent(owner, repo, 'step-catalog.json', branch, token);
        let officialSteps: CatalogStep[];
        if (officialFile === undefined) {
          // Catalog file not yet on this branch — fall back to FS official steps
          officialSteps = loadFromFs().steps;
        } else {
          officialSteps = (JSON.parse(officialFile.content) as { steps: CatalogStep[] }).steps;
        }

        // Fetch proposals from GitHub branch (404 = empty, not an error — Pitfall 3)
        const proposalsFile = await getFileContent(owner, repo, 'step-proposals.json', branch, token);
        const proposalSteps: CatalogStep[] = proposalsFile
          ? (JSON.parse(proposalsFile.content) as { steps: CatalogStep[] }).steps
          : [];

        const steps = [...officialSteps, ...proposalSteps];
        return NextResponse.json({ totalSteps: steps.length, steps });

      } catch (err: unknown) {
        // D-06 fallback: GitHub error → read from FS; sanitize token from log (T-05-03-02)
        const rawMessage = err instanceof Error ? err.message : 'Unknown error';
        const safeMessage = sanitizeError(rawMessage, token);
        console.error('[api/catalog] GitHub fetch failed, falling back to FS:', safeMessage);
        return NextResponse.json(loadFromFs());
      }
    }

    // No GitHub headers — use FS (existing behavior preserved)
    return NextResponse.json(loadFromFs());

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
