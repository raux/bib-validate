import levenshtein from 'js-levenshtein';

/**
 * Compute normalized similarity score (0–1) using Levenshtein distance.
 * 1.0 = identical, 0.0 = completely different.
 */
export function levenshteinSimilarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  const dist = levenshtein(a.toLowerCase(), b.toLowerCase());
  return 1 - dist / maxLen;
}

/**
 * Returns true if the two strings are considered matching
 * based on a similarity threshold (default 0.85).
 */
export function isSimilar(a: string, b: string, threshold = 0.85): boolean {
  return levenshteinSimilarity(a, b) >= threshold;
}

/**
 * Compare two sorted author lists by computing average pairwise similarity.
 * Returns true if they are considered the same author set.
 */
export function authorsMatch(a: string[], b: string[], threshold = 0.85): boolean {
  if (a.length !== b.length) return false;
  if (a.length === 0) return true;
  const totalSimilarity = a.reduce((sum, author, i) => sum + levenshteinSimilarity(author, b[i]), 0);
  return totalSimilarity / a.length >= threshold;
}
