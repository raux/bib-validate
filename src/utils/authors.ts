/**
 * Normalize an author name to "Last, F." format.
 * Handles "First Last", "Last, First", "F. Last" variations.
 */
export function normalizeAuthor(name: string): string {
  const trimmed = name.trim().replace(/\s+/g, ' ');
  // Already in "Last, First" format
  if (trimmed.includes(',')) {
    const [last, rest] = trimmed.split(',', 2);
    const firstName = rest.trim();
    const initial = firstName.charAt(0).toUpperCase();
    return `${last.trim()}, ${initial}.`;
  }
  // "First Last" or "F. Last" format
  const parts = trimmed.split(' ');
  if (parts.length === 1) return trimmed;
  const last = parts[parts.length - 1];
  const first = parts[0];
  const initial = first.charAt(0).toUpperCase();
  return `${last}, ${initial}.`;
}

/**
 * Normalize a list of author names and return them sorted.
 */
export function normalizeAuthors(authors: string[]): string[] {
  return authors.map(normalizeAuthor).sort();
}
