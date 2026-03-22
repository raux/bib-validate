import axios from 'axios';
import type { PaperMetadata, DblpSearchResult } from '../types';

const DBLP_API = 'https://dblp.org/search/publ/api';

/* ------------------------------------------------------------------ */
/*  Internal types for raw DBLP API responses                         */
/* ------------------------------------------------------------------ */

interface DblpHit {
  info?: {
    title?: string;
    authors?: { author: string | { text: string } | Array<string | { text: string }> };
    year?: string;
    venue?: string;
    pages?: string;
    type?: string;
    access?: string;
    key?: string;
    doi?: string;
    ee?: string;
    url?: string;
  };
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function extractAuthors(
  raw: string | { text: string } | Array<string | { text: string }>,
): string[] {
  const list = Array.isArray(raw) ? raw : [raw];
  return list.map((a) => (typeof a === 'string' ? a : a.text ?? '')).filter(Boolean);
}

/* ------------------------------------------------------------------ */
/*  searchDblp – batch search ported from raux/dblp-api               */
/* ------------------------------------------------------------------ */

/**
 * Search DBLP for one or more queries and return the full result metadata
 * for each query.  Mirrors the behaviour of the Python `dblp.search()`
 * helper from https://github.com/raux/dblp-api.
 *
 * Returns `null` in the corresponding position when a query has no match.
 */
export async function searchDblp(
  queries: string[],
): Promise<Array<DblpSearchResult | null>> {
  const results: Array<DblpSearchResult | null> = [];

  for (const query of queries) {
    const response = await axios.get(DBLP_API, {
      params: { q: query, format: 'json', h: 1 },
    });

    const hit: DblpHit | undefined = response.data?.result?.hits?.hit?.[0];

    if (!hit?.info) {
      results.push(null);
      continue;
    }

    const info = hit.info;

    const authors = info.authors?.author
      ? extractAuthors(info.authors.author)
      : [];

    results.push({
      title: (info.title ?? '').replace(/\s+/g, ' ').trim(),
      authors,
      year: String(info.year ?? ''),
      venue: info.venue ?? '',
      pages: info.pages ?? '',
      type: info.type ?? '',
      access: info.access ?? '',
      key: info.key ?? '',
      doi: info.doi ?? '',
      ee: info.ee ?? '',
      url: info.url ? `https://dblp.org/rec/${info.key ?? ''}` : '',
    });
  }

  return results;
}

/* ------------------------------------------------------------------ */
/*  fetchDblpMetadata – original single-query helper (kept for compat)*/
/* ------------------------------------------------------------------ */

/**
 * Search DBLP by title and return the top result's metadata.
 */
export async function fetchDblpMetadata(title: string): Promise<PaperMetadata> {
  const [result] = await searchDblp([title]);

  if (!result) {
    throw new Error('No results found on DBLP');
  }

  return {
    title: result.title,
    authors: result.authors,
    year: result.year,
    source: 'DBLP',
  };
}
