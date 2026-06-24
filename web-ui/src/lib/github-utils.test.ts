import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  ghHeaders,
  getFileSHA,
  getFileContent,
  putContents,
  branchEnsure,
  sanitizeError,
  GITHUB_NAME_RE,
} from './github-utils';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockFetch(responses: { status: number; body: unknown }[]) {
  let callIndex = 0;
  return vi.fn().mockImplementation(() => {
    const resp = responses[callIndex++] ?? { status: 500, body: {} };
    return Promise.resolve({
      ok: resp.status >= 200 && resp.status < 300,
      status: resp.status,
      json: () => Promise.resolve(resp.body),
    });
  });
}

// ---------------------------------------------------------------------------
// GITHUB_NAME_RE
// ---------------------------------------------------------------------------

describe('GITHUB_NAME_RE', () => {
  it('accepts valid owner/repo/branch names', () => {
    expect(GITHUB_NAME_RE.test('my-repo')).toBe(true);
    expect(GITHUB_NAME_RE.test('My_Repo.123')).toBe(true);
    expect(GITHUB_NAME_RE.test('catalog')).toBe(true);
  });

  it('rejects names with slashes or spaces', () => {
    expect(GITHUB_NAME_RE.test('foo/bar')).toBe(false);
    expect(GITHUB_NAME_RE.test('foo bar')).toBe(false);
    expect(GITHUB_NAME_RE.test('')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// ghHeaders
// ---------------------------------------------------------------------------

describe('ghHeaders', () => {
  it('returns the correct header object', () => {
    const h = ghHeaders('tok123');
    expect(h['Authorization']).toBe('token tok123');
    expect(h['Accept']).toBe('application/vnd.github+json');
    expect(h['X-GitHub-Api-Version']).toBe('2022-11-28');
    expect(h['Content-Type']).toBe('application/json');
  });
});

// ---------------------------------------------------------------------------
// getFileSHA
// ---------------------------------------------------------------------------

describe('getFileSHA', () => {
  beforeEach(() => { vi.stubGlobal('fetch', undefined); });
  afterEach(() => { vi.restoreAllMocks(); });

  it('returns sha string on 200', async () => {
    global.fetch = mockFetch([{ status: 200, body: { sha: 'abc123' } }]);
    const result = await getFileSHA('owner', 'repo', 'file.json', 'main', 'tok');
    expect(result).toBe('abc123');
  });

  it('returns undefined on 404', async () => {
    global.fetch = mockFetch([{ status: 404, body: { message: 'Not Found' } }]);
    const result = await getFileSHA('owner', 'repo', 'file.json', 'main', 'tok');
    expect(result).toBeUndefined();
  });

  it('throws on other status codes', async () => {
    global.fetch = mockFetch([{ status: 500, body: {} }]);
    await expect(getFileSHA('owner', 'repo', 'file.json', 'main', 'tok')).rejects.toThrow('GitHub GET failed: 500');
  });
});

// ---------------------------------------------------------------------------
// getFileContent
// ---------------------------------------------------------------------------

describe('getFileContent', () => {
  afterEach(() => { vi.restoreAllMocks(); });

  it('returns decoded content and sha on 200', async () => {
    const raw = Buffer.from('{"steps":[]}', 'utf-8').toString('base64');
    global.fetch = mockFetch([{ status: 200, body: { content: raw, sha: 'sha-xyz' } }]);
    const result = await getFileContent('owner', 'repo', 'step-catalog.json', 'catalog', 'tok');
    expect(result).not.toBeUndefined();
    expect(result!.content).toBe('{"steps":[]}');
    expect(result!.sha).toBe('sha-xyz');
  });

  it('returns undefined on 404', async () => {
    global.fetch = mockFetch([{ status: 404, body: {} }]);
    const result = await getFileContent('owner', 'repo', 'missing.json', 'catalog', 'tok');
    expect(result).toBeUndefined();
  });

  it('throws on other error status', async () => {
    global.fetch = mockFetch([{ status: 403, body: {} }]);
    await expect(getFileContent('owner', 'repo', 'file.json', 'catalog', 'tok')).rejects.toThrow('GitHub GET failed: 403');
  });
});

// ---------------------------------------------------------------------------
// putContents
// ---------------------------------------------------------------------------

describe('putContents', () => {
  afterEach(() => { vi.restoreAllMocks(); });

  it('includes sha in body when sha is provided', async () => {
    const fetchMock = mockFetch([{ status: 200, body: {} }]);
    global.fetch = fetchMock;
    await putContents('owner', 'repo', 'file.json', 'main', 'tok', 'content', 'sha-abc', 'commit msg');
    const callBody = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(callBody.sha).toBe('sha-abc');
  });

  it('omits sha from body when sha is undefined', async () => {
    const fetchMock = mockFetch([{ status: 201, body: {} }]);
    global.fetch = fetchMock;
    await putContents('owner', 'repo', 'file.json', 'main', 'tok', 'content', undefined, 'commit msg');
    const callBody = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(callBody.sha).toBeUndefined();
  });

  it('includes author and committer when author arg is provided', async () => {
    const fetchMock = mockFetch([{ status: 200, body: {} }]);
    global.fetch = fetchMock;
    await putContents('owner', 'repo', 'file.json', 'main', 'tok', 'hello', 'sha1', 'msg', { name: 'Mario', email: 'mario@example.com' });
    const callBody = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(callBody.author).toEqual({ name: 'Mario', email: 'mario@example.com' });
    expect(callBody.committer).toEqual({ name: 'Mario', email: 'mario@example.com' });
  });

  it('omits author and committer when author arg is absent', async () => {
    const fetchMock = mockFetch([{ status: 200, body: {} }]);
    global.fetch = fetchMock;
    await putContents('owner', 'repo', 'file.json', 'main', 'tok', 'hello', undefined, 'msg');
    const callBody = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(callBody.author).toBeUndefined();
    expect(callBody.committer).toBeUndefined();
  });

  it('throws with GitHub error message on non-ok response', async () => {
    global.fetch = mockFetch([{ status: 422, body: { message: 'Validation Failed' } }]);
    await expect(putContents('owner', 'repo', 'f.json', 'main', 'tok', 'c', undefined, 'm')).rejects.toThrow('Validation Failed');
  });
});

// ---------------------------------------------------------------------------
// branchEnsure
// ---------------------------------------------------------------------------

describe('branchEnsure', () => {
  afterEach(() => { vi.restoreAllMocks(); });

  it('does NOT call POST when branch already exists (200)', async () => {
    const fetchMock = mockFetch([{ status: 200, body: { ref: 'refs/heads/catalog', object: { sha: 'aaa' } } }]);
    global.fetch = fetchMock;
    await branchEnsure('owner', 'repo', 'catalog', 'main', 'tok');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    // Verify it was a GET (no body in the call)
    expect((fetchMock.mock.calls[0][1] as RequestInit | undefined)?.method).toBeUndefined();
  });

  it('calls POST refs with correct ref and sha when branch is missing (404)', async () => {
    const fetchMock = vi.fn()
      .mockImplementationOnce(() => Promise.resolve({
        ok: false, status: 404,
        json: () => Promise.resolve({ message: 'Not Found' }),
      }))
      .mockImplementationOnce(() => Promise.resolve({
        ok: true, status: 200,
        json: () => Promise.resolve({ object: { sha: 'base-sha-123' } }),
      }))
      .mockImplementationOnce(() => Promise.resolve({
        ok: true, status: 201,
        json: () => Promise.resolve({}),
      }));
    global.fetch = fetchMock;

    await branchEnsure('owner', 'repo', 'catalog', 'main', 'tok');

    // Third call is the POST
    expect(fetchMock).toHaveBeenCalledTimes(3);
    const postCall = fetchMock.mock.calls[2];
    expect((postCall[1] as RequestInit).method).toBe('POST');
    const postBody = JSON.parse((postCall[1] as RequestInit).body as string);
    expect(postBody.ref).toBe('refs/heads/catalog');
    expect(postBody.sha).toBe('base-sha-123');
  });

  it('throws when branch GET returns unexpected status', async () => {
    global.fetch = mockFetch([{ status: 403, body: { message: 'Forbidden' } }]);
    await expect(branchEnsure('owner', 'repo', 'catalog', 'main', 'tok')).rejects.toThrow('GitHub GET failed: 403');
  });
});

// ---------------------------------------------------------------------------
// sanitizeError
// ---------------------------------------------------------------------------

describe('sanitizeError', () => {
  it('replaces all occurrences of token with [TOKEN]', () => {
    const result = sanitizeError('Error: token abc123 is invalid, abc123 rejected', 'abc123');
    expect(result).toBe('Error: token [TOKEN] is invalid, [TOKEN] rejected');
  });

  it('handles tokens with regex special characters', () => {
    const token = 'ghp_abc.+*?[def]';
    const result = sanitizeError(`Failed with ${token}`, token);
    expect(result).toBe('Failed with [TOKEN]');
  });
});
