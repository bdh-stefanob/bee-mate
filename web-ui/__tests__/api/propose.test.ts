/**
 * __tests__/api/propose.test.ts
 *
 * Unit tests for POST /api/catalog/propose
 *
 * Strategy: mock global.fetch to simulate GitHub API responses.
 * The route reads headers from the Request object and decides between
 * GitHub path (token+owner+repo present) and FS fallback (no headers).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// FS mock must be hoisted before the route import so the module sees the mock.
vi.mock('fs', () => ({
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
}));
vi.mock('path', () => ({ join: (...parts: string[]) => parts.join('/') }));
vi.mock('@/lib/repo', () => ({ REPO_ROOT: '/fake-root' }));

// Import the route AFTER mocks are set up.
import { POST } from '@/app/api/catalog/propose/route';
import * as fs from 'fs';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type FetchResponse = { status: number; body: unknown };

function mockFetchSequence(responses: FetchResponse[]) {
  let i = 0;
  return vi.fn().mockImplementation(() => {
    const resp = responses[i++] ?? { status: 500, body: { message: 'unexpected fetch' } };
    return Promise.resolve({
      ok: resp.status >= 200 && resp.status < 300,
      status: resp.status,
      json: () => Promise.resolve(resp.body),
    });
  });
}

function makeRequest(
  body: unknown,
  headers: Record<string, string> = {},
): Request {
  return new Request('http://localhost/api/catalog/propose', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

const GITHUB_HEADERS = {
  'x-github-token': 'ghp_test_token',
  'x-github-owner': 'myorg',
  'x-github-repo':  'bdd-catalog',
  'x-catalog-branch': 'catalog',
  'x-github-branch': 'main',
  'x-commit-name': 'Mario Rossi',
  'x-commit-email': 'mario@example.com',
};

// ---------------------------------------------------------------------------
// Test 1: GitHub configured, new expression → putContents called, added === 1
// ---------------------------------------------------------------------------

describe('POST /api/catalog/propose — GitHub path (new expression)', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Sequence:
    // 1. branchEnsure: GET /git/ref/heads/catalog → 200 (branch exists)
    // 2. getFileContent: GET /contents/step-proposals.json → 404 (file missing → empty)
    // 3. putContents: PUT /contents/step-proposals.json → 201
    fetchMock = mockFetchSequence([
      { status: 200, body: { ref: 'refs/heads/catalog', object: { sha: 'abc123' } } },
      { status: 404, body: { message: 'Not Found' } },
      { status: 201, body: { content: { sha: 'new_sha' } } },
    ]);
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns { ok: true, added: 1 } and calls putContents', async () => {
    const req = makeRequest(
      { steps: [{ expression: 'the user verifies their age', keyword: 'When' }] },
      GITHUB_HEADERS,
    );
    const res = await POST(req);
    const data = await res.json() as { ok: boolean; added: number; duplicates: string[] };

    expect(data.ok).toBe(true);
    expect(data.added).toBe(1);
    expect(data.duplicates).toEqual([]);

    // PUT should have been called with step-proposals.json content
    const putCall = fetchMock.mock.calls.find((c: unknown[]) =>
      typeof c[0] === 'string' && c[0].includes('step-proposals.json') && (c[1] as RequestInit)?.method === 'PUT',
    );
    expect(putCall).toBeDefined();

    // Verify pushed entry shape
    const putBody = JSON.parse((putCall![1] as RequestInit).body as string) as {
      content: string;
      author: { name: string; email: string };
    };
    const decoded = Buffer.from(putBody.content, 'base64').toString('utf-8');
    const file = JSON.parse(decoded) as { steps: { expression: string; status: string; sourceRef: string }[] };
    expect(file.steps).toHaveLength(1);
    expect(file.steps[0].status).toBe('proposed');
    expect(file.steps[0].sourceRef).toBe('Mario Rossi');
    expect(putBody.author).toEqual({ name: 'Mario Rossi', email: 'mario@example.com' });
  });
});

// ---------------------------------------------------------------------------
// Test 2: GitHub configured, expression already in step-proposals.json → 409
// ---------------------------------------------------------------------------

describe('POST /api/catalog/propose — GitHub path, duplicate expression', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  const EXISTING_EXPRESSION = 'the user verifies their age';

  beforeEach(() => {
    const existingFile = {
      steps: [{
        expression: EXISTING_EXPRESSION,
        keyword: 'When',
        status: 'proposed',
        sourceRef: 'Someone Else',
        proposedAt: '2026-06-24T10:00:00Z',
        app: '',
        area: 'to-classify',
        domain: '',
        parameters: [],
        documented: false,
      }],
    };
    const base64Content = Buffer.from(JSON.stringify(existingFile), 'utf-8').toString('base64');

    // Sequence:
    // 1. branchEnsure: GET /git/ref/heads/catalog → 200
    // 2. getFileContent: GET /contents/step-proposals.json → 200 with existing content
    // (PUT should NOT be called)
    fetchMock = mockFetchSequence([
      { status: 200, body: { ref: 'refs/heads/catalog', object: { sha: 'abc123' } } },
      { status: 200, body: { content: base64Content, sha: 'existing_sha' } },
    ]);
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 409 with the duplicate error copy and no PUT call', async () => {
    const req = makeRequest(
      { steps: [{ expression: EXISTING_EXPRESSION }] },
      GITHUB_HEADERS,
    );
    const res = await POST(req);
    const data = await res.json() as { ok: boolean; error: string; duplicates: string[] };

    expect(res.status).toBe(409);
    expect(data.ok).toBe(false);
    expect(data.error).toBe('This step expression already exists in proposals. Duplicates are not allowed.');
    expect(data.duplicates).toContain(EXISTING_EXPRESSION);

    // Confirm no PUT was made
    const putCall = fetchMock.mock.calls.find((c: unknown[]) =>
      (c[1] as RequestInit)?.method === 'PUT',
    );
    expect(putCall).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Test 3: GitHub configured, branch 404 on branchEnsure → auto-create branch
// ---------------------------------------------------------------------------

describe('POST /api/catalog/propose — GitHub path, branch auto-create', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Sequence:
    // 1. branchEnsure GET /git/ref/heads/catalog → 404 (branch does not exist)
    // 2. branchEnsure GET /git/ref/heads/main → 200 (base branch HEAD)
    // 3. branchEnsure POST /git/refs → 201 (branch created)
    // 4. getFileContent GET /contents/step-proposals.json → 404 (empty)
    // 5. putContents PUT /contents/step-proposals.json → 201
    fetchMock = mockFetchSequence([
      { status: 404, body: { message: 'Not Found' } },
      { status: 200, body: { object: { sha: 'main_head_sha' } } },
      { status: 201, body: { ref: 'refs/heads/catalog' } },
      { status: 404, body: { message: 'Not Found' } },
      { status: 201, body: { content: { sha: 'new_sha' } } },
    ]);
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('invokes branchEnsure POST /git/refs when branch is missing', async () => {
    const req = makeRequest(
      { steps: [{ expression: 'a new step expression' }] },
      GITHUB_HEADERS,
    );
    const res = await POST(req);
    const data = await res.json() as { ok: boolean; added: number };

    expect(data.ok).toBe(true);
    expect(data.added).toBe(1);

    // Confirm git/refs POST was called (auto-create)
    const createCall = fetchMock.mock.calls.find((c: unknown[]) =>
      typeof c[0] === 'string' &&
      c[0].includes('git/refs') &&
      !c[0].includes('git/ref/') &&
      (c[1] as RequestInit)?.method === 'POST',
    );
    expect(createCall).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Test 4: No GitHub headers → FS fallback path used
// ---------------------------------------------------------------------------

describe('POST /api/catalog/propose — FS fallback (no GitHub headers)', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    const existingCatalog = {
      totalSteps: 0,
      steps: [],
    };
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(existingCatalog));
    vi.mocked(fs.writeFileSync).mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('writes to local step-catalog.json with status:wanted and does NOT call GitHub fetch', async () => {
    const req = makeRequest({
      steps: [{ expression: 'the user logs in locally', keyword: 'When' }],
      app: 'brochure',
      area: 'auth',
    });
    const res = await POST(req);
    const data = await res.json() as { ok: boolean; added: number };

    expect(data.ok).toBe(true);
    expect(data.added).toBe(1);

    // No GitHub fetch should have been called
    expect(fetchMock).not.toHaveBeenCalled();

    // fs.writeFileSync should have been called with step-catalog.json
    expect(fs.writeFileSync).toHaveBeenCalled();
    const writeCall = vi.mocked(fs.writeFileSync).mock.calls[0];
    const written = JSON.parse(writeCall[1] as string) as { steps: { status: string; sourceRef: string }[] };
    expect(written.steps[0].status).toBe('wanted');
    expect(written.steps[0].sourceRef).toBe('feature');
  });
});
