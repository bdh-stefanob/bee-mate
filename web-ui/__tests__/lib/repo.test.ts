import { describe, it, expect } from 'vitest';
import { safeFeaturePath, slugify, FEATURES_DIR } from '@/lib/repo';
import path from 'path';

describe('safeFeaturePath', () => {
  it('Test 1: valid path returns string starting with FEATURES_DIR ending in .feature', () => {
    const result = safeFeaturePath('auth/login.feature');
    expect(result).not.toBeNull();
    expect(result!.startsWith(FEATURES_DIR)).toBe(true);
    expect(result!.endsWith('.feature')).toBe(true);
  });

  it('Test 2: path traversal ../../package.json returns null or throws', () => {
    const result = safeFeaturePath('../../package.json');
    expect(result).toBeNull();
  });

  it('Test 3: non-.feature extension returns null or throws', () => {
    const result = safeFeaturePath('auth/login.txt');
    expect(result).toBeNull();
  });
});

describe('slugify', () => {
  it('Test 4: slugify("User Login Flow!") === "user-login-flow"', () => {
    expect(slugify('User Login Flow!')).toBe('user-login-flow');
  });
});
