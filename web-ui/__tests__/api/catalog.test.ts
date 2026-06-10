import { describe, it, expect } from 'vitest';
import { GET } from '@/app/api/catalog/route';

describe('GET /api/catalog', () => {
  it('UI-01: response JSON ha steps[] come array con length > 0', async () => {
    const response = await GET();
    const data = await response.json();

    expect(Array.isArray(data.steps)).toBe(true);
    expect(data.steps.length).toBeGreaterThan(0);
  });
});
