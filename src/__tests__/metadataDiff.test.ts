import { describe, it, expect } from 'vitest';
import { compareMetadata, aggregateDiscrepancies } from '../agents/validationAgent';
import { normalizeAuthor, normalizeAuthors } from '../utils/authors';
import { levenshteinSimilarity, isSimilar, authorsMatch } from '../utils/fuzzyMatch';
import { normalizeDoi, extractArxivId, detectInputType } from '../utils/doi';
import type { PaperMetadata } from '../types';

describe('Metadata Diff Logic', () => {
  // ─── DOI utilities ────────────────────────────────────────────────────────
  describe('normalizeDoi', () => {
    it('strips https://doi.org/ prefix', () => {
      expect(normalizeDoi('https://doi.org/10.1145/1234567.1234568')).toBe('10.1145/1234567.1234568');
    });

    it('strips http://dx.doi.org/ prefix', () => {
      expect(normalizeDoi('http://dx.doi.org/10.1109/ICCV.2019.123')).toBe('10.1109/ICCV.2019.123');
    });

    it('strips doi: prefix', () => {
      expect(normalizeDoi('doi:10.1000/xyz123')).toBe('10.1000/xyz123');
    });

    it('returns plain DOI unchanged', () => {
      expect(normalizeDoi('10.1000/xyz123')).toBe('10.1000/xyz123');
    });
  });

  describe('extractArxivId', () => {
    it('extracts ID from abs URL', () => {
      expect(extractArxivId('https://arxiv.org/abs/2301.00001')).toBe('2301.00001');
    });

    it('extracts ID from pdf URL', () => {
      expect(extractArxivId('https://arxiv.org/pdf/2301.00001v2')).toBe('2301.00001v2');
    });

    it('extracts ID with arxiv: prefix', () => {
      expect(extractArxivId('arxiv:2301.00001')).toBe('2301.00001');
    });

    it('extracts plain arXiv ID', () => {
      expect(extractArxivId('2301.00001')).toBe('2301.00001');
    });

    it('returns null for a DOI', () => {
      expect(extractArxivId('10.1000/xyz123')).toBeNull();
    });
  });

  describe('detectInputType', () => {
    it('detects arXiv URL', () => {
      expect(detectInputType('https://arxiv.org/abs/2301.00001')).toBe('arxiv');
    });

    it('detects DOI URL', () => {
      expect(detectInputType('https://doi.org/10.1145/1234567.1234568')).toBe('doi');
    });

    it('detects plain DOI', () => {
      expect(detectInputType('10.1145/1234567.1234568')).toBe('doi');
    });

    it('returns unknown for unrecognized input', () => {
      expect(detectInputType('not a doi or arxiv id')).toBe('unknown');
    });
  });

  // ─── Author normalization ─────────────────────────────────────────────────
  describe('normalizeAuthor', () => {
    it('normalizes "First Last" to "Last, F."', () => {
      expect(normalizeAuthor('John Smith')).toBe('Smith, J.');
    });

    it('normalizes "Last, First" to "Last, F."', () => {
      expect(normalizeAuthor('Smith, John')).toBe('Smith, J.');
    });

    it('normalizes "F. Last" format', () => {
      expect(normalizeAuthor('J. Smith')).toBe('Smith, J.');
    });
  });

  describe('normalizeAuthors', () => {
    it('returns sorted normalized authors', () => {
      const result = normalizeAuthors(['Charlie Brown', 'Alice Jones', 'Bob Smith']);
      expect(result).toEqual(['Brown, C.', 'Jones, A.', 'Smith, B.']);
    });
  });

  // ─── Fuzzy matching ───────────────────────────────────────────────────────
  describe('levenshteinSimilarity', () => {
    it('returns 1 for identical strings', () => {
      expect(levenshteinSimilarity('hello', 'hello')).toBe(1);
    });

    it('returns < 1 for different strings', () => {
      expect(levenshteinSimilarity('hello', 'world')).toBeLessThan(1);
    });

    it('returns 1 for two empty strings', () => {
      expect(levenshteinSimilarity('', '')).toBe(1);
    });
  });

  describe('isSimilar', () => {
    it('returns true for near-identical titles', () => {
      const t1 = 'Attention Is All You Need';
      const t2 = 'Attention is All You Need';
      expect(isSimilar(t1, t2)).toBe(true);
    });

    it('returns false for completely different titles', () => {
      expect(isSimilar('Deep Learning', 'Quantum Computing Survey')).toBe(false);
    });
  });

  describe('authorsMatch', () => {
    it('returns true when author lists are the same after normalization', () => {
      expect(authorsMatch(['Smith, J.', 'Jones, A.'], ['Smith, J.', 'Jones, A.'])).toBe(true);
    });

    it('returns false when author lists differ', () => {
      expect(authorsMatch(['Smith, J.'], ['Jones, A.'])).toBe(false);
    });

    it('returns false when author list lengths differ', () => {
      expect(authorsMatch(['Smith, J.', 'Jones, A.'], ['Smith, J.'])).toBe(false);
    });
  });

  // ─── Validation agent ─────────────────────────────────────────────────────
  describe('compareMetadata', () => {
    const groundTruth: PaperMetadata = {
      title: 'Attention Is All You Need',
      authors: ['Ashish Vaswani', 'Noam Shazeer'],
      year: '2017',
      source: 'arXiv',
    };

    it('returns no discrepancies when metadata matches', () => {
      const source: PaperMetadata = {
        title: 'Attention Is All You Need',
        authors: ['Ashish Vaswani', 'Noam Shazeer'],
        year: '2017',
        source: 'DBLP',
      };
      expect(compareMetadata(groundTruth, source)).toHaveLength(0);
    });

    it('flags year mismatch', () => {
      const source: PaperMetadata = {
        title: 'Attention Is All You Need',
        authors: ['Ashish Vaswani', 'Noam Shazeer'],
        year: '2018',
        source: 'DBLP',
      };
      const result = compareMetadata(groundTruth, source);
      expect(result).toHaveLength(1);
      expect(result[0].field).toBe('year');
      expect(result[0].message).toMatch(/Year Mismatch/);
    });

    it('flags title mismatch when titles differ substantially', () => {
      const source: PaperMetadata = {
        title: 'A Completely Different Paper Title',
        authors: ['Ashish Vaswani', 'Noam Shazeer'],
        year: '2017',
        source: 'DBLP',
      };
      const result = compareMetadata(groundTruth, source);
      const titleDiscrepancy = result.find((d) => d.field === 'title');
      expect(titleDiscrepancy).toBeDefined();
    });

    it('does not flag title mismatch for minor differences', () => {
      const source: PaperMetadata = {
        title: 'Attention is All You Need',
        authors: ['Ashish Vaswani', 'Noam Shazeer'],
        year: '2017',
        source: 'DBLP',
      };
      const result = compareMetadata(groundTruth, source);
      const titleDiscrepancy = result.find((d) => d.field === 'title');
      expect(titleDiscrepancy).toBeUndefined();
    });

    it('flags author mismatch when authors differ', () => {
      const source: PaperMetadata = {
        title: 'Attention Is All You Need',
        authors: ['John Smith', 'Jane Doe'],
        year: '2017',
        source: 'IEEE',
      };
      const result = compareMetadata(groundTruth, source);
      const authorDiscrepancy = result.find((d) => d.field === 'authors');
      expect(authorDiscrepancy).toBeDefined();
      expect(authorDiscrepancy?.message).toMatch(/Author Mismatch/);
    });

    it('returns discrepancy message for year mismatch containing source name', () => {
      const source: PaperMetadata = {
        title: 'Attention Is All You Need',
        authors: ['Ashish Vaswani', 'Noam Shazeer'],
        year: '2019',
        source: 'IEEE',
      };
      const [d] = compareMetadata(groundTruth, source);
      expect(d.message).toContain('arXiv says 2017');
      expect(d.message).toContain('IEEE says 2019');
    });
  });

  describe('aggregateDiscrepancies', () => {
    const groundTruth: PaperMetadata = {
      title: 'Attention Is All You Need',
      authors: ['Ashish Vaswani', 'Noam Shazeer'],
      year: '2017',
      source: 'arXiv',
    };

    it('aggregates discrepancies from multiple sources', () => {
      const source1: PaperMetadata = {
        title: 'Attention Is All You Need',
        authors: ['Ashish Vaswani', 'Noam Shazeer'],
        year: '2018', // year mismatch
        source: 'DBLP',
      };
      const source2: PaperMetadata = {
        title: 'Attention Is All You Need',
        authors: ['Ashish Vaswani', 'Noam Shazeer'],
        year: '2019', // year mismatch
        source: 'IEEE',
      };
      const result = aggregateDiscrepancies(groundTruth, [source1, source2]);
      expect(result).toHaveLength(2);
      expect(result[0].source).toBe('DBLP');
      expect(result[1].source).toBe('IEEE');
    });

    it('returns empty array when all sources match', () => {
      const source: PaperMetadata = {
        title: 'Attention Is All You Need',
        authors: ['Ashish Vaswani', 'Noam Shazeer'],
        year: '2017',
        source: 'DBLP',
      };
      expect(aggregateDiscrepancies(groundTruth, [source])).toHaveLength(0);
    });
  });
});
