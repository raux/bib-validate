import axios from 'axios';
import type { PaperMetadata } from '../types';

const DBLP_API = 'https://dblp.org/search/publ/api';

interface DblpHit {
  info?: {
    title?: string;
    authors?: { author: string | { text: string } | Array<string | { text: string }> };
    year?: string;
  };
}

/**
 * Search DBLP by title and return the top result's metadata.
 */
export async function fetchDblpMetadata(title: string): Promise<PaperMetadata> {
  const response = await axios.get(DBLP_API, {
    params: { q: title, format: 'json', h: 1 },
  });

  const hits = response.data?.result?.hits?.hit;
  if (!hits || (Array.isArray(hits) && hits.length === 0)) {
    throw new Error('No results found on DBLP');
  }

  const hit: DblpHit = Array.isArray(hits) ? hits[0] : hits;
  const info = hit.info;
  if (!info) throw new Error('DBLP result missing info');

  const title_: string = (info.title ?? '').replace(/\s+/g, ' ').trim();
  const year: string = String(info.year ?? '');

  let authors: string[] = [];
  if (info.authors?.author) {
    const raw = info.authors.author;
    const authorList = Array.isArray(raw) ? raw : [raw];
    authors = authorList.map((a) => (typeof a === 'string' ? a : a.text ?? '')).filter(Boolean);
  }

  return { title: title_, authors, year, source: 'DBLP' };
}
