import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { DblpSearchResult } from '../types';

// Mock axios so tests don't hit the real DBLP API
vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
  },
}));

import axios from 'axios';
import { searchDblp, fetchDblpMetadata } from '../agents/dblpAgent';

const mockedGet = vi.mocked(axios.get);

/* ------------------------------------------------------------------ */
/*  Fixtures                                                          */
/* ------------------------------------------------------------------ */

/** A realistic DBLP API response for a single hit. */
function dblpResponse(info: Record<string, unknown>) {
  return {
    data: {
      result: {
        hits: {
          hit: [{ info }],
        },
      },
    },
  };
}

const SAMPLE_INFO = {
  title: 'Attention Is All You Need',
  authors: {
    author: [
      { text: 'Ashish Vaswani' },
      { text: 'Noam Shazeer' },
    ],
  },
  year: '2017',
  venue: 'NeurIPS',
  pages: '5998-6008',
  type: 'Conference and Workshop Papers',
  access: 'open',
  key: 'conf/nips/VaswaniSPUJGKP17',
  doi: '10.5555/3295222.3295349',
  ee: 'https://proceedings.neurips.cc/paper/2017/hash/3f5ee243-vaswani',
  url: 'https://dblp.org/rec/conf/nips/VaswaniSPUJGKP17',
};

/* ------------------------------------------------------------------ */
/*  Tests                                                             */
/* ------------------------------------------------------------------ */

describe('DBLP Agent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── searchDblp ────────────────────────────────────────────────────────

  describe('searchDblp', () => {
    it('returns full metadata for a single query', async () => {
      mockedGet.mockResolvedValueOnce(dblpResponse(SAMPLE_INFO));

      const results = await searchDblp(['Attention Is All You Need']);
      expect(results).toHaveLength(1);

      const r = results[0] as DblpSearchResult;
      expect(r.title).toBe('Attention Is All You Need');
      expect(r.authors).toEqual(['Ashish Vaswani', 'Noam Shazeer']);
      expect(r.year).toBe('2017');
      expect(r.venue).toBe('NeurIPS');
      expect(r.pages).toBe('5998-6008');
      expect(r.type).toBe('Conference and Workshop Papers');
      expect(r.access).toBe('open');
      expect(r.key).toBe('conf/nips/VaswaniSPUJGKP17');
      expect(r.doi).toBe('10.5555/3295222.3295349');
      expect(r.ee).toBe(
        'https://proceedings.neurips.cc/paper/2017/hash/3f5ee243-vaswani',
      );
    });

    it('returns null when no hit is found', async () => {
      mockedGet.mockResolvedValueOnce({
        data: { result: { hits: {} } },
      });

      const results = await searchDblp(['nonexistent paper title xyz']);
      expect(results).toEqual([null]);
    });

    it('handles multiple queries in batch', async () => {
      mockedGet
        .mockResolvedValueOnce(dblpResponse(SAMPLE_INFO))
        .mockResolvedValueOnce({
          data: { result: { hits: {} } },
        });

      const results = await searchDblp([
        'Attention Is All You Need',
        'nonexistent',
      ]);
      expect(results).toHaveLength(2);
      expect(results[0]).not.toBeNull();
      expect(results[1]).toBeNull();
    });

    it('handles a single-author response (not an array)', async () => {
      const info = {
        ...SAMPLE_INFO,
        authors: { author: { text: 'Solo Author' } },
      };
      mockedGet.mockResolvedValueOnce(dblpResponse(info));

      const results = await searchDblp(['some query']);
      expect((results[0] as DblpSearchResult).authors).toEqual(['Solo Author']);
    });

    it('handles author as plain string', async () => {
      const info = {
        ...SAMPLE_INFO,
        authors: { author: 'Plain String Author' },
      };
      mockedGet.mockResolvedValueOnce(dblpResponse(info));

      const results = await searchDblp(['some query']);
      expect((results[0] as DblpSearchResult).authors).toEqual([
        'Plain String Author',
      ]);
    });

    it('returns empty strings for missing optional fields', async () => {
      const info = {
        title: 'Minimal Entry',
        authors: { author: [{ text: 'Author A' }] },
        year: '2020',
        // venue, pages, type, access, key, doi, ee, url are all missing
      };
      mockedGet.mockResolvedValueOnce(dblpResponse(info));

      const results = await searchDblp(['Minimal Entry']);
      const r = results[0] as DblpSearchResult;
      expect(r.venue).toBe('');
      expect(r.pages).toBe('');
      expect(r.type).toBe('');
      expect(r.access).toBe('');
      expect(r.key).toBe('');
      expect(r.doi).toBe('');
      expect(r.ee).toBe('');
    });

    it('normalizes whitespace in title', async () => {
      const info = {
        ...SAMPLE_INFO,
        title: '  Attention   Is   All   You  Need  ',
      };
      mockedGet.mockResolvedValueOnce(dblpResponse(info));

      const results = await searchDblp(['query']);
      expect((results[0] as DblpSearchResult).title).toBe(
        'Attention Is All You Need',
      );
    });

    it('returns empty array for zero queries', async () => {
      const results = await searchDblp([]);
      expect(results).toEqual([]);
      expect(mockedGet).not.toHaveBeenCalled();
    });
  });

  // ── fetchDblpMetadata (backward compat) ───────────────────────────────

  describe('fetchDblpMetadata', () => {
    it('returns PaperMetadata with source "DBLP"', async () => {
      mockedGet.mockResolvedValueOnce(dblpResponse(SAMPLE_INFO));

      const meta = await fetchDblpMetadata('Attention Is All You Need');
      expect(meta).toEqual({
        title: 'Attention Is All You Need',
        authors: ['Ashish Vaswani', 'Noam Shazeer'],
        year: '2017',
        source: 'DBLP',
      });
    });

    it('throws when DBLP returns no results', async () => {
      mockedGet.mockResolvedValueOnce({
        data: { result: { hits: {} } },
      });

      await expect(fetchDblpMetadata('nothing')).rejects.toThrow(
        'No results found on DBLP',
      );
    });
  });
});
