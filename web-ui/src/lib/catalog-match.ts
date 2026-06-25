/**
 * Shared step-catalog matching utility.
 *
 * Matches a step text (e.g. "the user enters 5 items") against a list of
 * Cucumber-style expressions (e.g. "the user enters {count} items").
 * Parameter tokens ({token}) are treated as wildcards (.+).
 * Matching is case-insensitive.
 * Invalid regex expressions return false rather than throwing.
 */
export function matchesCatalog(stepText: string, expressions: string[]): boolean {
  return expressions.some(expr => {
    const segments = expr.split(/\{[^}]+\}/);
    const pattern = segments.map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.+');
    try { return new RegExp(`^${pattern}$`, 'i').test(stepText); }
    catch { return false; }
  });
}
