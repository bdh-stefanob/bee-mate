import { describe, it, expect } from 'vitest';
import { matchesCatalog } from '../../src/lib/catalog-match';

describe('matchesCatalog', () => {
  it('returns true for an exact literal match', () => {
    expect(matchesCatalog('the user logs in', ['the user logs in'])).toBe(true);
  });

  it('returns true when a parameter token matches any text', () => {
    expect(
      matchesCatalog('the user enters 5 items', ['the user enters {count} items'])
    ).toBe(true);
  });

  it('returns false when no expression matches', () => {
    expect(matchesCatalog('the user logs out', ['the user logs in'])).toBe(false);
  });

  it('is case-insensitive', () => {
    expect(matchesCatalog('The User Logs In', ['the user logs in'])).toBe(true);
    expect(matchesCatalog('the user logs in', ['The User Logs In'])).toBe(true);
  });

  it('returns false for an empty expressions array', () => {
    expect(matchesCatalog('the user logs in', [])).toBe(false);
  });

  it('does not throw when a catalog expression produces an invalid regex', () => {
    expect(() =>
      matchesCatalog('the user logs in', ['the user [broken'])
    ).not.toThrow();
    expect(matchesCatalog('the user logs in', ['the user [broken'])).toBe(false);
  });

  it('matches multiple parameter tokens in a single expression', () => {
    expect(
      matchesCatalog('the user selects red from the color picker', [
        'the user selects {color} from the {component}',
      ])
    ).toBe(true);
  });

  it('does not match a partial string (anchored to full step text)', () => {
    expect(matchesCatalog('the user logs', ['the user logs in'])).toBe(false);
  });
});
