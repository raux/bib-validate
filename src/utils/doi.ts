/**
 * Normalize a DOI to the format 10.xxxx/xxxx
 * Strips URL prefixes like https://doi.org/ or doi:
 */
export function normalizeDoi(input: string): string {
  const trimmed = input.trim();
  // Strip URL prefixes
  const withoutPrefix = trimmed
    .replace(/^https?:\/\/(dx\.)?doi\.org\//i, '')
    .replace(/^doi:/i, '');
  // Validate DOI format
  if (/^10\.\d{4,}\/\S+/.test(withoutPrefix)) {
    return withoutPrefix;
  }
  return withoutPrefix;
}

/**
 * Extract an arXiv ID from a URL or plain ID string.
 * Handles formats: https://arxiv.org/abs/2301.00001, arxiv:2301.00001, 2301.00001
 */
export function extractArxivId(input: string): string | null {
  const trimmed = input.trim();
  // Full URL: https://arxiv.org/abs/XXXX.XXXXX or /pdf/XXXX.XXXXX
  const urlMatch = trimmed.match(/arxiv\.org\/(?:abs|pdf|html)\/([0-9]{4}\.[0-9]{4,5}(?:v\d+)?)/i);
  if (urlMatch) return urlMatch[1];
  // arxiv: prefix
  const prefixMatch = trimmed.match(/^arxiv:([0-9]{4}\.[0-9]{4,5}(?:v\d+)?)/i);
  if (prefixMatch) return prefixMatch[1];
  // Plain ID
  const plainMatch = trimmed.match(/^([0-9]{4}\.[0-9]{4,5}(?:v\d+)?)$/);
  if (plainMatch) return plainMatch[1];
  return null;
}

/**
 * Detect whether the input is an arXiv URL/ID or a DOI.
 */
export function detectInputType(input: string): 'arxiv' | 'doi' | 'unknown' {
  const trimmed = input.trim();
  if (extractArxivId(trimmed) !== null) return 'arxiv';
  if (/10\.\d{4,}\/\S+/.test(trimmed) || /doi\.org/i.test(trimmed) || /^doi:/i.test(trimmed)) {
    return 'doi';
  }
  return 'unknown';
}
