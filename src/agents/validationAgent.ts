import type { PaperMetadata, Discrepancy } from '../types';
import { normalizeAuthors } from '../utils/authors';
import { isSimilar, authorsMatch } from '../utils/fuzzyMatch';

/**
 * Compare a source's metadata against the arXiv ground truth.
 * Returns a list of Discrepancy objects for any mismatches found.
 */
export function compareMetadata(
  groundTruth: PaperMetadata,
  source: PaperMetadata,
): Discrepancy[] {
  const discrepancies: Discrepancy[] = [];

  // Title comparison (fuzzy)
  if (!isSimilar(groundTruth.title, source.title)) {
    discrepancies.push({
      field: 'title',
      source: source.source,
      groundTruth: groundTruth.title,
      found: source.title,
      message: `Title Mismatch: arXiv says "${groundTruth.title}", ${source.source} says "${source.title}"`,
    });
  }

  // Year comparison (exact)
  if (groundTruth.year && source.year && groundTruth.year !== source.year) {
    discrepancies.push({
      field: 'year',
      source: source.source,
      groundTruth: groundTruth.year,
      found: source.year,
      message: `Year Mismatch: arXiv says ${groundTruth.year}, ${source.source} says ${source.year}`,
    });
  }

  // Authors comparison (normalized, sorted)
  if (groundTruth.authors.length > 0 && source.authors.length > 0) {
    const normGT = normalizeAuthors(groundTruth.authors);
    const normSrc = normalizeAuthors(source.authors);
    if (!authorsMatch(normGT, normSrc)) {
      discrepancies.push({
        field: 'authors',
        source: source.source,
        groundTruth: normGT.join('; '),
        found: normSrc.join('; '),
        message: `Author Mismatch: arXiv lists [${normGT.join(', ')}], ${source.source} lists [${normSrc.join(', ')}]`,
      });
    }
  }

  return discrepancies;
}

/**
 * Aggregate discrepancies from multiple sources into one list.
 */
export function aggregateDiscrepancies(
  groundTruth: PaperMetadata,
  sources: PaperMetadata[],
): Discrepancy[] {
  return sources.flatMap((src) => compareMetadata(groundTruth, src));
}
