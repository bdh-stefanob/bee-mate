import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { GET } from '@/app/api/catalog/route';

// ---------------------------------------------------------------------------
// Helper: build a Request with optional GitHub headers
// ---------------------------------------------------------------------------
function makeRequest(headers?: Record<string, string>) {
  return new Request('http://localhost/api/catalog', { headers });
}

// ---------------------------------------------------------------------------
// FS-only behavior (existing test, updated to pass request arg)
// ---------------------------------------------------------------------------

describe('GET /api/catalog — FS fallback (no GitHub headers)', () => {
  it('UI-01: response JSON ha steps[] come array con length > 0', async () => {
    const response = await GET(makeRequest());
    const data = await response.json();

    expect(Array.isArray(data.steps)).toBe(true);
    expect(data.steps.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// GitHub branch behavior
// ---------------------------------------------------------------------------

describe('GET /api/catalog — GitHub branch mode', () => {
  const OFFICIAL_STEP = {
    expression: 'the user logs in',
    parameters: [],
    app: 'app-a',
    area: 'auth',
    domain: 'app-a/auth',
    status: 'implemented' as const,
    sourceRef: 'steps/auth.ts:1',
    documented: true,
  };
  const PROPOSAL_STEP = {
    expression: 'the user verifies their age',
    parameters: [],
    app: 'brochure-clinic',
    area: 'registration',
    domain: '',
    status: 'proposed' as const,
    sourceRef: 'Mario Rossi',
    documented: false,
    proposedAt: '2026-06-24T10:00:00Z',
  };

  const officialContent = Buffer.from(
    JSON.stringify({ steps: [OFFICIAL_STEP] }),
    'utf-8'
  ).toString('base64');

  const proposalContent = Buffer.from(
    JSON.stringify({ steps: [PROPOSAL_STEP] }),
    'utf-8'
  ).toString('base64');

  afterEach(() => { vi.restoreAllMocks(); });

  it('merges official steps and proposals when both files exist', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true, status: 200,
        json: () => Promise.resolve({ content: officialContent, sha: 'sha1' }),
      })
      .mockResolvedValueOnce({
        ok: true, status: 200,
        json: () => Promise.resolve({ content: proposalContent, sha: 'sha2' }),
      }) as unknown as typeof fetch;

    const req = makeRequest({
      'x-github-token': 'tok',
      'x-github-owner': 'owner',
      'x-github-repo': 'repo',
      'x-catalog-branch': 'catalog',
    });
    const response = await GET(req);
    const data = await response.json();

    expect(Array.isArray(data.steps)).toBe(true);
    // Official step first
    expect(data.steps[0].expression).toBe('the user logs in');
    // Proposal step appended
    const proposed = data.steps.find((s: { status: string }) => s.status === 'proposed');
    expect(proposed).toBeDefined();
    expect(proposed.expression).toBe('the user verifies their age');
    expect(data.totalSteps).toBe(2);
  });

  it('returns only official steps when step-proposals.json is 404 (no error)', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true, status: 200,
        json: () => Promise.resolve({ content: officialContent, sha: 'sha1' }),
      })
      .mockResolvedValueOnce({
        ok: false, status: 404,
        json: () => Promise.resolve({ message: 'Not Found' }),
      }) as unknown as typeof fetch;

    const req = makeRequest({
      'x-github-token': 'tok',
      'x-github-owner': 'owner',
      'x-github-repo': 'repo',
      'x-catalog-branch': 'catalog',
    });
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(data.steps)).toBe(true);
    // No proposed steps
    const proposed = data.steps.filter((s: { status: string }) => s.status === 'proposed');
    expect(proposed.length).toBe(0);
  });

  it('falls back to FS when GitHub fetch throws', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error')) as unknown as typeof fetch;

    const req = makeRequest({
      'x-github-token': 'tok',
      'x-github-owner': 'owner',
      'x-github-repo': 'repo',
      'x-catalog-branch': 'catalog',
    });
    const response = await GET(req);
    const data = await response.json();

    // Should not throw; returns 200 with FS steps
    expect(response.status).toBe(200);
    expect(Array.isArray(data.steps)).toBe(true);
  });

  it('falls back to FS when owner/repo/branch fail GITHUB_NAME_RE validation', async () => {
    const fetchMock = vi.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    const req = makeRequest({
      'x-github-token': 'tok',
      'x-github-owner': 'invalid owner with spaces',
      'x-github-repo': 'repo',
      'x-catalog-branch': 'catalog',
    });
    const response = await GET(req);
    const data = await response.json();

    // No GitHub call made; FS fallback used
    expect(fetchMock).not.toHaveBeenCalled();
    expect(Array.isArray(data.steps)).toBe(true);
  });
});
