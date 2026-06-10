import { describe, it, expect } from 'vitest';
import { GET } from '@/app/api/download/route';

function makeRequest(file: string): Request {
  return new Request(`http://localhost:3000/api/download?file=${encodeURIComponent(file)}`);
}

describe('GET /api/download', () => {
  it('Test 1: file valido (.feature esistente) → 200, contiene Feature:, Content-Disposition', async () => {
    const res = await GET(makeRequest('auth/login.feature'));
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain('Feature:');
    const cd = res.headers.get('Content-Disposition') ?? '';
    expect(cd).toContain('login.feature');
  });

  it('Test 2: path traversal ../../package.json → 403', async () => {
    const res = await GET(makeRequest('../../package.json'));
    expect(res.status).toBe(403);
  });

  it('Test 3: estensione non .feature → 403', async () => {
    const res = await GET(makeRequest('auth/login.txt'));
    expect(res.status).toBe(403);
  });

  it('Test 4: file inesistente .feature → 404', async () => {
    const res = await GET(makeRequest('auth/nonexistent.feature'));
    expect(res.status).toBe(404);
  });
});
